// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// node-types.spec.ts -- checks the node types against their version samples in
// static/data/node-types/<type>/<type>-v<n>.json (like the graph format samples): every
// ready type has a sample for each of its versions, the newest one matches the type's
// template, new nodes and type changes produce exactly that shape, and every sample is a
// valid node of a graph file.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { NODE_TYPES, nodeType } from './node-types';
import { addNode, emptyGraph, setNodeType } from './store';
import { migrateGraph, CURRENT_GRAPH_VERSION } from './migrations';
import { GRAPH_FORMAT, type GraphNode } from './types';

// every sample file, by its path below static/data/node-types/
const FILES = import.meta.glob('../../../static/data/node-types/*/*.json', { eager: true, import: 'default' }) as Record<
	string,
	{ metadata: { format: string; type: string; version: number; graphFormat: number }; node: GraphNode }
>;
const samples = Object.entries(FILES).map(([path, sample]) => ({ file: path.split('/node-types/')[1], ...sample }));
const sampleOf = (type: string, version: number) => samples.find((s) => s.metadata.type === type && s.metadata.version === version);
const READY = NODE_TYPES.filter((t) => t.ready);

// a node's shape: what a type decides (type and ports), without id, name, position, colour
const shape = (n: GraphNode) => ({ type: n.type, inputs: n.inputs, outputs: n.outputs });

describe('node type samples', () => {
	it('every ready type has a version, a template and a sample for each version', () => {
		for (const t of READY) {
			expect(t.version, t.id).toBeGreaterThanOrEqual(1);
			expect(t.ports, t.id).toBeDefined();
			expect(t.defaultName, t.id).toBeTruthy();
			for (let v = 1; v <= t.version!; v++) expect(sampleOf(t.id, v), `${t.id}-v${v}`).toBeDefined();
		}
	});

	it('every sample is named and labelled after its type and version', () => {
		for (const s of samples) {
			expect(s.file).toBe(`${s.metadata.type}/${s.metadata.type}-v${s.metadata.version}.json`);
			expect(s.metadata.format).toBe('imge-node-type');
			expect(s.node.type).toBe(s.metadata.type);
			expect(nodeType(s.metadata.type)?.ready, s.file).toBe(true);
		}
	});

	it('the newest sample of each type matches its template', () => {
		for (const t of READY) {
			const newest = sampleOf(t.id, t.version!)!;
			expect(shape(newest.node)).toEqual({ type: t.id, ...t.ports });
			expect(newest.node.name).toBe(t.defaultName);
		}
	});

	it('every sample is a valid node of a graph file (upgraded to the current format)', () => {
		for (const s of samples) {
			const file = {
				metadata: { format: GRAPH_FORMAT, version: s.metadata.graphFormat, direction: 'left-to-right' },
				data: { nodes: [structuredClone(s.node)], links: [] }
			};
			const { graph } = migrateGraph(file);
			expect(graph.metadata.version).toBe(CURRENT_GRAPH_VERSION);
			expect(graph.data.nodes).toHaveLength(1);
		}
	});
});

describe('nodes take the shape of their type', () => {
	it('a new node is the newest basic sample', () => {
		const { node } = addNode(emptyGraph(), { x: 0, y: 0 });
		const basic = sampleOf('basic', nodeType('basic')!.version!)!;
		expect(shape(node)).toEqual(shape(basic.node));
		expect(node.name).toBe(basic.node.name);
	});

	it('changing the type gives the newest sample of each ready type, there and back', () => {
		const start = addNode(emptyGraph(), { x: 0, y: 0 }).graph;
		for (const t of READY) {
			const changed = setNodeType(start, 'n1', t.id).data.nodes[0];
			expect(shape(changed)).toEqual(shape(sampleOf(t.id, t.version!)!.node));
			const back = setNodeType(setNodeType(start, 'n1', t.id), 'n1', 'basic').data.nodes[0];
			expect(shape(back)).toEqual(shape(sampleOf('basic', nodeType('basic')!.version!)!.node));
		}
	});
});
