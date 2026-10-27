// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-23
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// groups.spec.ts -- checks groups as parents: frames that wrap their children with the margin
// (also nested), the smallest size, resizing, joining / leaving, and what delete, copy and
// paste do with members.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { addNode, emptyGraph, setNodeType, setNodePosition, setNodeContent, removeNodes, copyNodes, pasteNodes, groupNodes, ungroupNodes, createNodeAt, graph } from './store';
import { get } from 'svelte/store';
import {
	groupFrames,
	groupChildren,
	parentOf,
	withDescendants,
	minGroupSize,
	resizeGroup,
	CIRCLE_MARGIN,
	setGroupMembership,
	groupAt,
	GROUP_MARGIN
} from './groups';
import type { Graph } from './types';

// n1: a group at (0, 0), 320 x 192 by default; n2, n3: nodes (100 x 50 when measured)
const sizes = { n2: { w: 100, h: 50 }, n3: { w: 100, h: 50 } };
function setup(): Graph {
	let g = emptyGraph();
	for (let i = 0; i < 3; i++) g = addNode(g, { x: 0, y: 0 }).graph;
	g = setNodeType(g, 'n1', 'group');
	g = setNodePosition(g, 'n1', { x: 0, y: 0 });
	g = setNodePosition(g, 'n2', { x: 100, y: -100 });
	return setNodePosition(g, 'n3', { x: 600, y: -100 });
}

describe('frames', () => {
	it('a group without children keeps its stored rect', () => {
		expect(groupFrames(setup(), sizes).n1).toEqual({ x: 0, y: 0, w: 320, h: 192 });
	});

	it('grows to wrap its children with the margin, never shrinks below its stored rect', () => {
		const g = setGroupMembership(setup(), ['n2', 'n3'], 'n1');
		expect(groupChildren(g, g.data.nodes[0])).toEqual(['n2', 'n3']);
		// n3 reaches to x 700 and y -150: the frame goes to 700 + margin and -150 - margin
		expect(groupFrames(g, sizes).n1).toEqual({ x: 0, y: 0, w: 700 + GROUP_MARGIN, h: 150 + GROUP_MARGIN });
	});

	it('wraps a nested group as one child, inner first', () => {
		let g = addNode(setup(), { x: 0, y: 0 }).graph; // n4: an outer group
		g = setNodeType(g, 'n4', 'group');
		g = setNodePosition(g, 'n4', { x: -200, y: 200 });
		g = setGroupMembership(g, ['n2'], 'n1');
		g = setGroupMembership(g, ['n1'], 'n4');
		const f = groupFrames(g, sizes);
		expect(f.n4.x).toBe(-200);
		expect(f.n4.x + f.n4.w).toBe(f.n1.x + f.n1.w + GROUP_MARGIN);
		expect(withDescendants(g, ['n4']).sort()).toEqual(['n1', 'n2', 'n4']);
	});
});

describe('size', () => {
	it('can not get smaller than its children plus the margin', () => {
		const g = setGroupMembership(setup(), ['n2'], 'n1');
		expect(minGroupSize(g, 'n1', sizes)).toEqual({ w: 200 + GROUP_MARGIN, h: 150 + GROUP_MARGIN });
		const shrunk = resizeGroup(g, 'n1', { w: 120, h: 120 }, sizes);
		expect(shrunk.data.nodes[0].content).toMatchObject({ width: 200 + GROUP_MARGIN, height: 150 + GROUP_MARGIN });
		const grown = resizeGroup(g, 'n1', { w: 800, h: 500 }, sizes);
		expect(groupFrames(grown, sizes).n1).toEqual({ x: 0, y: 0, w: 800, h: 500 });
	});

	it('an empty group stays at least 100 x 100', () => {
		expect(resizeGroup(setup(), 'n1', { w: 10, h: 10 }, sizes).data.nodes[0].content).toMatchObject({ width: 100, height: 100 });
	});
});

describe('membership', () => {
	it('a node is in one group at a time and can leave', () => {
		let g = addNode(setup(), { x: 0, y: 0 }).graph;
		g = setNodeType(g, 'n4', 'group');
		g = setGroupMembership(g, ['n2'], 'n1');
		g = setGroupMembership(g, ['n2'], 'n4');
		expect(parentOf(g, 'n2')?.id).toBe('n4');
		expect(groupChildren(g, g.data.nodes[0])).toEqual([]);
		g = setGroupMembership(g, ['n2'], null);
		expect(parentOf(g, 'n2')).toBeUndefined();
	});

	it('a group never goes into itself or into a group it holds', () => {
		let g = addNode(setup(), { x: 0, y: 0 }).graph;
		g = setNodeType(g, 'n4', 'group');
		g = setGroupMembership(g, ['n4'], 'n1');
		expect(setGroupMembership(g, ['n1'], 'n1')).toBe(g);
		expect(setGroupMembership(g, ['n1'], 'n4')).toBe(g);
	});

	it('finds the innermost group under a point, skipping the given ids', () => {
		let g = addNode(setup(), { x: 0, y: 0 }).graph;
		g = setNodeType(g, 'n4', 'group');
		g = setNodePosition(g, 'n4', { x: 20, y: -20 }); // inside n1's frame
		g = resizeGroup(g, 'n4', { w: 150, h: 100 }, sizes); // and smaller, so it is the inner one
		const f = groupFrames(g, sizes);
		expect(groupAt(g, f, { x: 50, y: -50 }, [])?.id).toBe('n4');
		expect(groupAt(g, f, { x: 50, y: -50 }, ['n4'])?.id).toBe('n1');
		expect(groupAt(g, f, { x: 2000, y: 0 }, [])).toBeUndefined();
	});
});

describe('delete, copy, paste', () => {
	it('deleting a child leaves the group; deleting a group keeps its children', () => {
		const g = setGroupMembership(setup(), ['n2', 'n3'], 'n1');
		expect(groupChildren(removeNodes(g, ['n2']), g.data.nodes[0])).not.toContain('n2');
		expect(removeNodes(g, ['n2']).data.nodes[0].content.children).toEqual(['n3']);
		expect(removeNodes(g, ['n1']).data.nodes.map((n) => n.id)).toEqual(['n2', 'n3']);
	});

	it('copying a group takes its children; the pasted group holds the pasted copies', () => {
		const g = setGroupMembership(setup(), ['n2'], 'n1');
		const clip = copyNodes(g, ['n1']);
		expect(clip.nodes.map((n) => n.id)).toEqual(['n1', 'n2']);
		const { graph: pasted, nodeIds } = pasteNodes(g, clip, { x: 1000, y: 0 });
		expect(nodeIds).toEqual(['n4', 'n5']);
		expect(pasted.data.nodes.find((n) => n.id === 'n4')!.content.children).toEqual(['n5']);
	});
});

describe('group / ungroup keys', () => {
	it('Ctrl+G puts nodes in a new group that wraps them, inside the group they shared', () => {
		const g = setGroupMembership(setup(), ['n2', 'n3'], 'n1');
		const { graph, groupId } = groupNodes(g, ['n2', 'n3']);
		expect(groupId).toBe('n4');
		expect(parentOf(graph, 'n2')?.id).toBe('n4');
		expect(parentOf(graph, 'n4')?.id).toBe('n1');
		const f = groupFrames(graph, sizes);
		expect(f.n4).toEqual({ x: 100 - GROUP_MARGIN, y: -100 + GROUP_MARGIN, w: 600 + GROUP_MARGIN * 2, h: 50 + GROUP_MARGIN * 2 });
		expect(groupNodes(g, []).groupId).toBeNull();
	});

	it('Ctrl+Shift+G dissolves a group into its parent, or takes nodes out', () => {
		const grouped = groupNodes(setGroupMembership(setup(), ['n2', 'n3'], 'n1'), ['n2', 'n3']).graph;
		const dissolved = ungroupNodes(grouped, ['n4']);
		expect(dissolved.graph.data.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
		expect(dissolved.freed).toEqual(['n2', 'n3']);
		expect(parentOf(dissolved.graph, 'n2')?.id).toBe('n1');
		const out = ungroupNodes(dissolved.graph, ['n2']);
		expect(parentOf(out.graph, 'n2')).toBeUndefined();
		expect(ungroupNodes(out.graph, ['n2']).freed).toEqual([]);
	});
});

describe('adding to an existing group', () => {
	it('Ctrl+G with one group selected adds the other selected nodes to it', () => {
		const { graph: g, groupId, added } = groupNodes(setup(), ['n1', 'n2', 'n3']);
		expect(added).toBe(true);
		expect(groupId).toBe('n1');
		expect(g.data.nodes).toHaveLength(3); // no new group
		expect(groupChildren(g, g.data.nodes[0])).toEqual(['n2', 'n3']);
	});

	it('with two groups selected it makes a new group around all of them', () => {
		let g = addNode(setup(), { x: 0, y: 0 }).graph;
		g = setNodeType(g, 'n4', 'group');
		const result = groupNodes(g, ['n1', 'n4', 'n2']);
		expect(result.added).toBe(false);
		expect(groupChildren(result.graph, result.graph.data.nodes.find((n) => n.id === result.groupId)!)).toEqual(['n1', 'n2', 'n4']);
	});

	it("a node made inside a group's frame (Shift+A, toolbar) joins that group", () => {
		graph.set(setup()); // n1: group at (0, 0), 320 x 192
		const inside = createNodeAt({ x: 150, y: -90 });
		const outside = createNodeAt({ x: 2000, y: 0 });
		expect(parentOf(get(graph), inside.id)?.id).toBe('n1');
		expect(parentOf(get(graph), outside.id)).toBeUndefined();
	});
});

describe('circle groups', () => {
	it('a circle group wraps its children: the circle through their box corners plus its margin', () => {
		const g = setNodeContent(setGroupMembership(setup(), ['n2', 'n3'], 'n1'), 'n1', { shape: 'circle' });
		// children box: x 100 .. 700, y -100 .. -150
		const d = Math.hypot(600, 50) + 2 * CIRCLE_MARGIN;
		const f = groupFrames(g, sizes).n1;
		expect(f.w).toBeCloseTo(d);
		expect(f.h).toBeCloseTo(d);
		expect(f.x + f.w / 2).toBeCloseTo(400); // centred on the children
		expect(minGroupSize(g, 'n1', sizes).w).toBeCloseTo(d);
	});

	it('an empty circle group is a circle of its stored size; resizing keeps one diameter', () => {
		const g = setNodeContent(setup(), 'n1', { shape: 'circle' });
		expect(groupFrames(g, sizes).n1).toEqual({ x: 0, y: 0, w: 320, h: 320 });
		const resized = resizeGroup(g, 'n1', { w: 400, h: 250 }, sizes);
		expect(groupFrames(resized, sizes).n1).toMatchObject({ w: 400, h: 400 });
	});
});
