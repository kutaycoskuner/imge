// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
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

// one sample per format version, oldest first; copies so no test can change another's input
const SAMPLES: Record<number, () => any> = {
	0: () => structuredClone(sampleV0),
	1: () => structuredClone(sampleV1),
	2: () => structuredClone(sampleV2)
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
		expect((graph.data.nodes[0] as any).color).toBe('red');
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
		expect(graph.data.nodes.map((n) => [n.id, n.inputs.map((p) => p.id), n.outputs.map((p) => p.id)])).toEqual([
			['n1', ['i1', 'i2'], ['o1']],
			['n2', ['i1'], ['o1', 'o2']]
		]);
		expect(graph.data.links.map((l) => [l.source, l.target])).toEqual([
			[{ node: 'n2', port: 'o2' }, { node: 'n1', port: 'i2' }],
			[{ node: 'n1', port: 'o1' }, { node: 'n2', port: 'i1' }]
		]);
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
			author: 'x'
		});
	});
});
