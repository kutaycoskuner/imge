// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// node-types.spec.ts -- checks the node types against their version samples in
// static/data/node-types/<type>/<type>-v<n>.json (like the graph format samples): every
// ready type has a sample for each of its versions, the newest one (upgraded to the current
// graph format) matches the type's template, new nodes and type changes produce exactly that
// shape, every sample is a valid node of a graph file, and generic UI gets readable labels.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { NODE_TYPES, nodeType, nodeLabel, groupSize, GROUP_SIZE } from './node-types';
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

// a sample's node in the current graph format (samples may be written in an older one)
const current = (s: (typeof samples)[number]): GraphNode =>
	migrateGraph({
		metadata: { format: GRAPH_FORMAT, version: s.metadata.graphFormat, direction: 'left-to-right' },
		data: { nodes: [structuredClone(s.node)], links: [] }
	}).graph.data.nodes[0];

// what a type decides about a node: type, template version, ports, content (not id or position)
const shape = (n: GraphNode) => ({ type: n.type, typeVersion: n.typeVersion, ports: n.ports, content: n.content });

describe('node type samples', () => {
	it('every ready type has a version, a template and a sample for each version', () => {
		for (const t of READY) {
			expect(t.version, t.id).toBeGreaterThanOrEqual(1);
			expect(t.ports, t.id).toBeDefined();
			expect(t.content, t.id).toBeDefined();
			expect(t.label, t.id).toBeDefined();
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

	it('the newest sample of each type, upgraded to the current format, matches its template', () => {
		for (const t of READY) {
			const newest = current(sampleOf(t.id, t.version!)!);
			expect(shape(newest), t.id).toEqual({ type: t.id, typeVersion: t.version, ports: t.ports, content: t.content });
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
		expect(shape(node)).toEqual(shape(current(sampleOf('basic', nodeType('basic')!.version!)!)));
	});

	it('changing the type gives the newest sample of each ready type, there and back', () => {
		const start = addNode(emptyGraph(), { x: 0, y: 0 }).graph;
		for (const t of READY) {
			// the new node's content (name "Node") is kept, so compare everything but content
			const { content: _c, ...changed } = shape(setNodeType(start, 'n1', t.id).data.nodes[0]);
			const { content: _s, ...sample } = shape(current(sampleOf(t.id, t.version!)!));
			expect(changed, t.id).toEqual(sample);
			// back to basic: the basic shape again; content keeps what the other type added
			// (e.g. a UML class's members), so switching back to it brings them back
			const back = shape(setNodeType(setNodeType(start, 'n1', t.id), 'n1', 'basic').data.nodes[0]);
			const basic = shape(current(sampleOf('basic', nodeType('basic')!.version!)!));
			expect({ ...back, content: undefined }).toEqual({ ...basic, content: undefined });
			expect(back.content).toMatchObject({ name: 'Node', color: null });
		}
	});
});

describe('labels for generic UI', () => {
	it('basic and group show their name, or the type when the name is empty', () => {
		const { node } = addNode(emptyGraph(), { x: 0, y: 0 }, 'Mixer');
		expect(nodeLabel(node)).toBe('Mixer');
		expect(nodeLabel({ ...node, content: { ...node.content, name: '  ' } })).toBe('Basic');
		expect(nodeLabel({ ...node, type: 'group', content: { name: '' } })).toBe('Group');
	});

	it('a type without a label (unknown) falls back to "<type> (<id>)"', () => {
		const { node } = addNode(emptyGraph(), { x: 0, y: 0 });
		expect(nodeLabel({ ...node, type: 'and-gate', content: {} })).toBe('and-gate (n1)');
	});
});

describe('group size', () => {
	it('comes from the content, or the default; too small or not a number falls back', () => {
		const { node } = addNode(emptyGraph(), { x: 0, y: 0 });
		const group = setNodeType(addNode(emptyGraph(), { x: 0, y: 0 }).graph, 'n1', 'group').data.nodes[0];
		expect(groupSize(group)).toEqual(GROUP_SIZE);
		expect(groupSize({ ...group, content: { ...group.content, width: 440, height: 400 } })).toEqual({ w: 440, h: 400 });
		expect(groupSize({ ...group, content: { ...group.content, width: 20, height: 'x' } })).toEqual(GROUP_SIZE);
		expect(node.type).toBe('basic');
	});
});

// the editor's own graphs: the start graph and every example
const GRAPHS = import.meta.glob('../../../static/data/{test-node-graph,examples/*}.json', { eager: true, import: 'default' }) as Record<string, any>;

describe("the editor's own graphs follow the newest type templates", () => {
	it("every node has its type's newest version and every key of its template content", () => {
		for (const [path, doc] of Object.entries(GRAPHS)) {
			if (!doc.data) continue; // index.json
			for (const node of doc.data.nodes as GraphNode[]) {
				const t = nodeType(node.type);
				expect(t?.ready, `${path} ${node.id}: type ${node.type}`).toBe(true);
				expect(node.typeVersion, `${path} ${node.id} (${node.type})`).toBe(t!.version);
				for (const key of Object.keys(t!.content!)) expect(node.content, `${path} ${node.id}`).toHaveProperty(key);
			}
		}
	});
});
