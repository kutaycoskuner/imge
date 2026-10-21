// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// migrations.spec.ts -- checks that graph files of every older version upgrade correctly.
// Fixtures are the version samples in static/data/samples/ (the same tiny graph saved in
// each format version): every older sample must upgrade to exactly the newest one. A new
// format version adds its sample there and a line to SAMPLES below.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	CURRENT_GRAPH_VERSION,
	GraphFormatError,
	migrateGraph,
	readGraphVersion,
	stampCurrentVersion
} from './migrations';
import { GRAPH_FORMAT } from './types';
import sampleV0 from '../../../static/data/samples/graph-v0.json';
import sampleV1 from '../../../static/data/samples/graph-v1.json';
import sampleV2 from '../../../static/data/samples/graph-v2.json';
import sampleV3 from '../../../static/data/samples/graph-v3.json';
import sampleV4 from '../../../static/data/samples/graph-v4.json';
import sampleV5 from '../../../static/data/samples/graph-v5.json';
import sampleV6 from '../../../static/data/samples/graph-v6.json';

// one sample per format version, oldest first; copies so no test can change another's input
const SAMPLES: Record<number, () => any> = {
	0: () => structuredClone(sampleV0),
	1: () => structuredClone(sampleV1),
	2: () => structuredClone(sampleV2),
	3: () => structuredClone(sampleV3),
	4: () => structuredClone(sampleV4),
	5: () => structuredClone(sampleV5),
	6: () => structuredClone(sampleV6)
};
const current = SAMPLES[CURRENT_GRAPH_VERSION];

describe('version samples', () => {
	it('there is a sample for every version up to the current one', () => {
		for (let v = 0; v <= CURRENT_GRAPH_VERSION; v++) expect(SAMPLES[v]).toBeDefined();
	});

	for (const [version, sample] of Object.entries(SAMPLES)) {
		it(`sample v${version} is read as version ${version}`, () => {
			expect(readGraphVersion(sample())).toBe(Number(version));
		});

		it(`sample v${version} upgrades to exactly the current sample`, () => {
			const { graph, fromVersion, applied } = migrateGraph(sample());
			expect(fromVersion).toBe(Number(version));
			expect(applied).toHaveLength(CURRENT_GRAPH_VERSION - Number(version));
			expect(graph).toEqual(current());
		});
	}
});

describe('adapter details', () => {
	it('0 -> 1 flips y without producing -0', () => {
		const v0 = SAMPLES[0]();
		v0.data.nodes[1].position.y = 0;
		const { graph } = migrateGraph(v0);
		expect(Object.is(graph.data.nodes[1].position.y, -0)).toBe(false);
	});

	it('1 -> 2 keeps extra node keys and numbers links l1, l2 ... in order', () => {
		const v1 = SAMPLES[1]();
		v1.data.nodes[0].color = 'red';
		v1.data.links.push({ ...v1.data.links[0] });
		const { graph } = migrateGraph(v1);
		// a color kept as an extra key since v1 ends up in content (5 -> 6)
		expect(graph.data.nodes[0].content.color).toBe('red');
		expect(graph.data.links.map((l) => l.id)).toEqual(['l1', 'l2']);
	});

	it('1 -> 2 renumbers nodes and ports by position and the link ends follow', () => {
		const port = (id: string) => ({ id, type: 'basic', label: id });
		const node = (_id: number, inputs: string[], outputs: string[]) => ({
			_id,
			type: 'basic',
			position: { x: 0, y: 0 },
			data: { title: `node ${_id}`, inputs: inputs.map(port), outputs: outputs.map(port) }
		});
		const v1 = {
			metadata: { format: GRAPH_FORMAT, version: 1 },
			data: {
				// old ids in an unusual order and port ids that don't follow any pattern
				nodes: [node(7, ['a', 'b'], ['x']), node(3, ['in'], ['out1', 'out2'])],
				links: [
					{ sourceNodeId: 3, sourceOutputId: 'out2', targetNodeId: 7, targetInputId: 'b' },
					{ sourceNodeId: 7, sourceOutputId: 'x', targetNodeId: 3, targetInputId: 'in' }
				]
			}
		};
		const { graph } = migrateGraph(v1);
		// read in the current shape: ports by kind (5 -> 6 keeps the ids)
		const ids = (n: (typeof graph.data.nodes)[number], kind: string) => n.ports.filter((p) => p.kind === kind).map((p) => p.id);
		expect(graph.data.nodes.map((n) => [n.id, ids(n, 'in'), ids(n, 'out')])).toEqual([
			['n1', ['i1', 'i2'], ['o1']],
			['n2', ['i1'], ['o1', 'o2']]
		]);
		expect(graph.data.links.map((l) => [l.source, l.target])).toEqual([
			[{ node: 'n2', port: 'o2' }, { node: 'n1', port: 'i2' }],
			[{ node: 'n1', port: 'o1' }, { node: 'n2', port: 'i1' }]
		]);
	});
});

describe('adapter 2 -> 3', () => {
	it('adds color null and shape spline, keeping a color a node already had', () => {
		const v2 = SAMPLES[2]();
		v2.data.nodes[1].color = '#ff0000';
		const { graph } = migrateGraph(v2);
		expect(graph.data.nodes.map((n) => n.content.color)).toEqual([null, '#ff0000']); // in content since v6
		expect(graph.data.links.map((l) => l.shape)).toEqual(['spline']);
	});
});

describe('adapter 3 -> 4', () => {
	it('adds arrow none and route above, keeping values a link already had', () => {
		const v3 = SAMPLES[3]();
		v3.data.links.push({ ...v3.data.links[0], id: 'l2', arrow: 'both', route: 'below' });
		const { graph } = migrateGraph(v3);
		expect(graph.data.links.map((l) => [l.arrow, l.route])).toEqual([
			['none', 'above'],
			['both', 'below']
		]);
	});

});

describe('adapter 4 -> 5', () => {
	it('sets direction left-to-right, keeping one a file already had', () => {
		expect(migrateGraph(SAMPLES[4]()).graph.metadata.direction).toBe('left-to-right');
		const v4 = SAMPLES[4]();
		v4.metadata.direction = 'top-to-bottom';
		expect(migrateGraph(v4).graph.metadata.direction).toBe('top-to-bottom');
	});
});

describe('adapter 5 -> 6', () => {
	it('moves name and color into content and merges inputs and outputs into ports with kind', () => {
		const v5 = SAMPLES[5]();
		v5.data.nodes[0].color = '#2a9fd6';
		v5.data.nodes[0].inputs = [{ id: 'i1', type: 'basic', label: 'In' }];
		const node = migrateGraph(v5).graph.data.nodes[0];
		expect(node.content).toEqual({ name: 'First Node', color: '#2a9fd6' });
		expect(node.ports).toEqual([
			{ id: 'i1', type: 'basic', label: 'In', kind: 'in' },
			{ id: 'o1', type: 'basic', label: 'Output A', kind: 'out' }
		]);
		expect(node.typeVersion).toBe(1);
		for (const gone of ['name', 'color', 'inputs', 'outputs']) expect(node).not.toHaveProperty(gone);
	});

	it('keeps port ids, so every link still points at its ports', () => {
		const { graph } = migrateGraph(SAMPLES[5]());
		expect(graph.data.links).toEqual(SAMPLES[5]().data.links);
	});

	it('turns a group (no ports) into a node with an empty ports list', () => {
		const v5 = SAMPLES[5]();
		v5.data.nodes[0] = { ...v5.data.nodes[0], type: 'group', name: 'Frame', inputs: [], outputs: [] };
		v5.data.links = [];
		const node = migrateGraph(v5).graph.data.nodes[0];
		expect(node).toMatchObject({ type: 'group', ports: [], content: { name: 'Frame', color: null } });
	});

	it('keeps extra node keys, and a typeVersion or content a file already carried', () => {
		const v5 = SAMPLES[5]();
		Object.assign(v5.data.nodes[0], { note: 'kept', typeVersion: 2, content: { extra: 1 } });
		const node: any = migrateGraph(v5).graph.data.nodes[0];
		expect(node.note).toBe('kept');
		expect(node.typeVersion).toBe(2);
		expect(node.content).toEqual({ extra: 1, name: 'First Node', color: null });
	});
});

// example graphs offered in the editor's menu, and the start graph, keyed by their path under data/
const DATA = import.meta.glob('../../../static/data/{test-node-graph,examples/*}.json', {
	eager: true,
	import: 'default'
}) as Record<string, any>;
const dataFile = (file: string) => DATA[`../../../static/data/${file}`];

describe('example graphs', () => {
	const index = dataFile('examples/index.json');

	it('the example list is there and every listed file exists', () => {
		expect(index.examples.length).toBeGreaterThan(0);
		for (const example of index.examples) expect(dataFile(example.file), example.file).toBeDefined();
	});

	it('every example is stored as the current format version, so it never needs an upgrade', () => {
		for (const example of index.examples) {
			expect(readGraphVersion(dataFile(example.file)), example.file).toBe(CURRENT_GRAPH_VERSION);
		}
	});

	it('every example has unique ids and its links point at existing nodes and ports', () => {
		for (const example of index.examples) {
			const { nodes, links } = dataFile(example.file).data;
			const nodeIds = nodes.map((n: any) => n.id);
			expect(new Set(nodeIds).size, example.file).toBe(nodeIds.length);
			expect(new Set(links.map((l: any) => l.id)).size, example.file).toBe(links.length);
			// a link starts at a port that gives (out / any) and ends at one that takes (in / any)
			const has = (end: any, kinds: string[]) =>
				nodes.some((n: any) => n.id === end.node && n.ports.some((p: any) => p.id === end.port && kinds.includes(p.kind)));
			for (const l of links) {
				expect(has(l.source, ['out', 'any']) && has(l.target, ['in', 'any']), `${example.file} ${l.id}`).toBe(true);
			}
		}
	});
});

describe('readGraphVersion', () => {
	it('refuses files that are not graphs', () => {
		expect(() => readGraphVersion({ foo: 1 })).toThrow(GraphFormatError);
		expect(() => readGraphVersion(null)).toThrow(GraphFormatError);
	});

	it('refuses another format name', () => {
		const doc = { ...current(), metadata: { format: 'other', version: 1 } };
		expect(() => readGraphVersion(doc)).toThrow(/unknown format/);
	});

	it('refuses an invalid version value', () => {
		const doc = { ...current(), metadata: { format: GRAPH_FORMAT, version: '1' } };
		expect(() => readGraphVersion(doc)).toThrow(/invalid format version/);
	});
});

describe('migrateGraph', () => {
	it('does not change its input', () => {
		const input = SAMPLES[0]();
		migrateGraph(input);
		expect(input).toEqual(SAMPLES[0]());
	});

	it('passes a current-version file through unchanged', () => {
		const again = migrateGraph(current());
		expect(again.fromVersion).toBe(CURRENT_GRAPH_VERSION);
		expect(again.applied).toEqual([]);
		expect(again.graph).toEqual(current());
	});

	it('refuses files from a newer app version', () => {
		const doc = { ...current(), metadata: { format: GRAPH_FORMAT, version: CURRENT_GRAPH_VERSION + 1 } };
		expect(() => migrateGraph(doc)).toThrow(/newer than this app/);
	});
});

describe('stampCurrentVersion', () => {
	it('sets format and current version, keeping other metadata', () => {
		const graph = migrateGraph(current()).graph;
		const stamped = stampCurrentVersion({ ...graph, metadata: { ...graph.metadata, author: 'x' } });
		expect(stamped.metadata).toEqual({
			format: GRAPH_FORMAT,
			version: CURRENT_GRAPH_VERSION,
			direction: 'left-to-right',
			author: 'x'
		});
	});
});
