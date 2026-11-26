// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// graph-node-actions.spec.ts -- checks the graph node's actions in file-access.ts: opening an
// embedded graph and going back writes the changes into the node; opening a linked graph
// (saved in this browser) and going back restores the outer graph with its unsaved changes,
// asking first when the linked one has unsaved changes; a missing target says so; embedding
// a copy and saving the embedded graph separately switch the mode and carry the graph over.
// The browser's storage and dialogs are stand-ins (vi.stubGlobal).
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { graph, emptyGraph, setNodeContent } from './store';
import {
	workspace,
	browserGraphs,
	initWorkspace,
	trackChanges,
	loadGraph,
	saveToBrowser,
	graphTrail,
	enterGraphNode,
	backFromGraph,
	linkGraphNode,
	embedGraphCopy,
	saveEmbeddedGraphSeparately
} from './file-access';
import { embeddedGraph, graphMode, graphRef } from './graph-node';
import type { Graph, GraphNode } from './types';

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, String(v)),
		removeItem: (k: string) => void data.delete(k)
	};
}

const graphNode = (content: Record<string, unknown> = {}): GraphNode => ({
	id: 'n1',
	type: 'graph',
	typeVersion: 1,
	position: { x: 0, y: 0 },
	ports: [],
	content: { name: 'Inner', color: null, scale: 1, mode: 'internal', graph: null, ref: null, ...content }
});
const basic = (id: string): GraphNode => ({ id, type: 'basic', typeVersion: 2, position: { x: 0, y: 0 }, ports: [], content: { name: id, color: null, shape: 'square' } });
const withNodes = (nodes: GraphNode[]): Graph => ({ ...emptyGraph(), data: { nodes, links: [] } });
const addNodeToOpen = (id: string) => graph.update((g) => ({ ...g, data: { ...g.data, nodes: [...g.data.nodes, basic(id)] } }));
const outerNode = () => get(graph).data.nodes.find((n) => n.id === 'n1')!;

let confirmSpy: ReturnType<typeof vi.fn>;
let stop: () => void;

beforeEach(async () => {
	confirmSpy = vi.fn(() => true);
	vi.stubGlobal('localStorage', memoryStorage());
	vi.stubGlobal('confirm', confirmSpy);
	vi.stubGlobal('window', {});
	browserGraphs.set([]);
	await initWorkspace();
	stop = trackChanges();
});

afterEach(() => {
	stop();
	vi.unstubAllGlobals();
});

describe('embedded (internal)', () => {
	it('opens the embedded graph and Back writes the changes into the node', async () => {
		loadGraph(withNodes([graphNode()]), null);
		expect(await enterGraphNode('n1')).toBe(true);
		expect(get(graphTrail)).toHaveLength(1);
		expect(get(graph).data.nodes).toEqual([]); // empty until drawn
		addNodeToOpen('a');
		expect(backFromGraph()).toBe(true);
		expect(get(graphTrail)).toHaveLength(0);
		expect(embeddedGraph(outerNode().content)?.data.nodes.map((n) => n.id)).toEqual(['a']);
		expect(get(workspace).dirty).toBe(true); // the outer graph changed, not saved yet
	});

	it('Back without changes leaves the outer graph as it was', async () => {
		loadGraph(withNodes([graphNode()]), null);
		const before = get(graph);
		await enterGraphNode('n1');
		backFromGraph();
		expect(get(graph)).toBe(before);
		expect(get(workspace).dirty).toBe(false);
	});

	it('saving it separately in the browser links the node to it', async () => {
		loadGraph(withNodes([graphNode({ graph: withNodes([basic('x')]) })]), null);
		expect(await saveEmbeddedGraphSeparately('n1', 'browser', 'Billing')).toBe(true);
		const content = outerNode().content;
		expect(graphMode(content)).toBe('external');
		expect(content.graph).toBeNull();
		const ref = graphRef(content)!;
		expect(ref).toMatchObject({ source: 'browser', name: 'Billing' });
		expect(get(browserGraphs).find((s) => s.id === (ref as { id: string }).id)?.graph.data.nodes.map((n) => n.id)).toEqual(['x']);
	});
});

describe('linked (external)', () => {
	async function linkedSetup(): Promise<string> {
		loadGraph(withNodes([basic('t1')]), null);
		saveToBrowser('Target');
		const id = get(workspace).browserId!;
		loadGraph(withNodes([graphNode()]), null);
		linkGraphNode('n1', { source: 'browser', id, name: 'Target' });
		return id;
	}

	it('opens the linked graph as itself and Back restores the outer graph with its unsaved changes', async () => {
		const id = await linkedSetup();
		const outer = get(graph);
		expect(get(workspace).dirty).toBe(true); // linking is a change
		expect(await enterGraphNode('n1')).toBe(true);
		expect(get(workspace).browserId).toBe(id); // Save would write the target in the browser
		expect(get(graph).data.nodes.map((n) => n.id)).toEqual(['t1']);
		expect(backFromGraph()).toBe(true);
		expect(get(graph)).toBe(outer);
		expect(get(workspace)).toMatchObject({ browserId: null, dirty: true });
	});

	it('asks before leaving unsaved changes in the linked graph', async () => {
		await linkedSetup();
		await enterGraphNode('n1');
		addNodeToOpen('new');
		confirmSpy.mockReturnValue(false);
		expect(backFromGraph()).toBe(false);
		expect(get(graphTrail)).toHaveLength(1);
		confirmSpy.mockReturnValue(true);
		expect(backFromGraph()).toBe(true);
	});

	it('says when the target is gone', async () => {
		loadGraph(withNodes([graphNode({ mode: 'external', ref: { source: 'browser', id: 'gone', name: 'Old' } })]), null);
		expect(await enterGraphNode('n1')).toBe(false);
		expect(get(workspace).status).toContain('"Old" wasn\'t found in this browser');
	});

	it('embedding a copy carries the graph into the node', async () => {
		await linkedSetup();
		expect(await embedGraphCopy('n1')).toBe(true);
		const content = outerNode().content;
		expect(graphMode(content)).toBe('internal');
		expect(content.ref).toBeNull();
		expect(embeddedGraph(content)?.data.nodes.map((n) => n.id)).toEqual(['t1']);
	});
});

describe('the trail', () => {
	it('is left when another graph opens', async () => {
		loadGraph(withNodes([graphNode()]), null);
		await enterGraphNode('n1');
		loadGraph(emptyGraph(), null);
		expect(get(graphTrail)).toHaveLength(0);
	});

	it('nests: an embedded graph inside an embedded graph comes back through both', async () => {
		const inner = withNodes([graphNode({ name: 'Deep' })]);
		loadGraph(withNodes([graphNode({ graph: inner })]), null);
		await enterGraphNode('n1');
		await enterGraphNode('n1'); // the inner graph's own graph node
		addNodeToOpen('z');
		backFromGraph();
		backFromGraph();
		const level1 = embeddedGraph(outerNode().content)!;
		const level2 = embeddedGraph(level1.data.nodes[0].content)!;
		expect(level2.data.nodes.map((n) => n.id)).toEqual(['z']);
	});
});
