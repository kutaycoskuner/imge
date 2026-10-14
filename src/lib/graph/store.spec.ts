// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.spec.ts -- checks the node/link operations and the link rules in store.ts.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	addLink,
	addNode,
	emptyGraph,
	findLinkInto,
	moveNodes,
	nextNodeId,
	quickLink,
	removeLink,
	removeNodes,
	renameNode,
	selectNode
} from './store';
import type { Graph } from './types';

// three nodes A(0) B(1) C(2), left to right, each with input_0 and output_0; no links
function threeNodes(): Graph {
	let g = emptyGraph();
	for (const x of [0, 300, 600]) g = addNode(g, { x, y: 0 }).graph;
	return g;
}

const link = (from: number, to: number) => ({
	sourceNodeId: from,
	sourceOutputId: 'output_0',
	targetNodeId: to,
	targetInputId: 'input_0'
});

describe('nodes', () => {
	it('adds nodes with increasing ids, one input and one output', () => {
		const g = threeNodes();
		expect(g.data.nodes.map((n) => n._id)).toEqual([0, 1, 2]);
		expect(g.data.nodes[0].data.inputs).toHaveLength(1);
		expect(g.data.nodes[0].data.outputs).toHaveLength(1);
		expect(nextNodeId(g)).toBe(3);
	});

	it('never reuses the highest id after a delete in the middle', () => {
		const g = removeNodes(threeNodes(), [1]);
		expect(nextNodeId(g)).toBe(3);
	});

	it('renames, and keeps the old title for a blank one', () => {
		let g = renameNode(threeNodes(), 1, '  Mixer  ');
		expect(g.data.nodes[1].data.title).toBe('Mixer');
		g = renameNode(g, 1, '   ');
		expect(g.data.nodes[1].data.title).toBe('Mixer');
	});

	it('moves only the given nodes', () => {
		const before = threeNodes();
		const g = moveNodes(before, [0, 2], 10, -5);
		expect(g.data.nodes[0].position.x).toBe(before.data.nodes[0].position.x + 10);
		expect(g.data.nodes[0].position.y).toBe(before.data.nodes[0].position.y - 5);
		expect(g.data.nodes[1].position).toEqual(before.data.nodes[1].position);
	});

	it('removes nodes together with their links', () => {
		let g = threeNodes();
		g = addLink(g, link(0, 1)).graph;
		g = addLink(g, link(1, 2)).graph;
		g = removeNodes(g, [1]);
		expect(g.data.nodes.map((n) => n._id)).toEqual([0, 2]);
		expect(g.data.links).toEqual([]);
	});

	it('does not change the graph it was given', () => {
		const g = threeNodes();
		const copy = structuredClone(g);
		renameNode(g, 0, 'x');
		moveNodes(g, [0], 1, 1);
		removeNodes(g, [0]);
		addLink(g, link(0, 1));
		expect(g).toEqual(copy);
	});
});

describe('link rules', () => {
	it('adds a link from an output to an input', () => {
		const { graph, outcome } = addLink(threeNodes(), link(0, 1));
		expect(outcome).toBe('added');
		expect(graph.data.links).toEqual([link(0, 1)]);
	});

	it('refuses a link from a node to itself', () => {
		const { graph, outcome } = addLink(threeNodes(), link(1, 1));
		expect(outcome).toBe('self-link');
		expect(graph.data.links).toEqual([]);
	});

	it('refuses unknown nodes or ports (e.g. input used as output)', () => {
		expect(addLink(threeNodes(), link(0, 9)).outcome).toBe('unknown-port');
		const wrongWay = { ...link(0, 1), sourceOutputId: 'input_0' };
		expect(addLink(threeNodes(), wrongWay).outcome).toBe('unknown-port');
	});

	it('replaces the link going into an input that is already connected', () => {
		let g = addLink(threeNodes(), link(0, 2)).graph;
		const { graph, outcome } = addLink(g, link(1, 2));
		expect(outcome).toBe('replaced');
		expect(graph.data.links).toEqual([link(1, 2)]);
	});

	it('reports an identical link as existing', () => {
		const g = addLink(threeNodes(), link(0, 1)).graph;
		expect(addLink(g, link(0, 1)).outcome).toBe('exists');
	});

	it('lets one output feed many inputs', () => {
		let g = addLink(threeNodes(), link(0, 1)).graph;
		g = addLink(g, link(0, 2)).graph;
		expect(g.data.links).toHaveLength(2);
	});

	it('removes a link by its target node and input', () => {
		let g = addLink(threeNodes(), link(0, 1)).graph;
		g = removeLink(g, { targetNodeId: 1, targetInputId: 'input_0' });
		expect(g.data.links).toEqual([]);
		expect(findLinkInto(g, { targetNodeId: 1, targetInputId: 'input_0' })).toBeUndefined();
	});
});

describe('quickLink (F key)', () => {
	it('links the left node into the right one, whatever the selection order', () => {
		expect(quickLink(threeNodes(), 2, 1)).toEqual(link(1, 2));
	});

	it('links right to left when the right node has no free input', () => {
		const g = addLink(threeNodes(), link(0, 2)).graph;
		expect(quickLink(g, 1, 2)).toEqual(link(2, 1));
	});

	it('returns null when neither direction has a free input', () => {
		let g = addLink(threeNodes(), link(0, 2)).graph;
		g = addLink(g, link(0, 1)).graph;
		expect(quickLink(g, 1, 2)).toBeNull();
	});

	it('returns null for the same or a missing node', () => {
		expect(quickLink(threeNodes(), 1, 1)).toBeNull();
		expect(quickLink(threeNodes(), 1, 9)).toBeNull();
	});
});

describe('selectNode', () => {
	const empty = { nodes: [], link: null };

	it('selects one node, replacing the selection', () => {
		expect(selectNode({ nodes: [0], link: null }, 1, false).nodes).toEqual([1]);
	});

	it('keeps a multi-selection when clicking a node in it (for group drag)', () => {
		expect(selectNode({ nodes: [0, 1], link: null }, 1, false).nodes).toEqual([0, 1]);
	});

	it('toggles with Shift and clears a selected link', () => {
		let sel = selectNode(empty, 0, true);
		sel = selectNode(sel, 1, true);
		expect(sel.nodes).toEqual([0, 1]);
		sel = selectNode(sel, 0, true);
		expect(sel.nodes).toEqual([1]);
		const withLink = { nodes: [], link: { targetNodeId: 1, targetInputId: 'input_0' } };
		expect(selectNode(withLink, 0, false).link).toBeNull();
	});
});
