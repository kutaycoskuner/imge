// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-15
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.spec.ts -- checks the node/link operations, the id scheme (n1, l1, i1, o1) and the
// link rules in store.ts.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	addLink,
	addNode,
	emptyGraph,
	findLink,
	linksInto,
	moveNodes,
	nextLinkId,
	nextNodeId,
	quickLink,
	removeLink,
	removeNodes,
	renameNode,
	selectNode,
	cycleLinkShape,
	setAllLinkShapes,
	setLinkBend,
	linkShapeOverride,
	graph,
	cycleLinkArrow,
	setAllLinkArrows,
	toggleLinkRoute,
	renameLink,
	findBackLinks,
	setDirection
} from './store';
import { get } from 'svelte/store';
import type { Graph } from './types';

// three nodes n1 n2 n3, left to right, each with input i1 and output o1; no links
function threeNodes(): Graph {
	let g = emptyGraph();
	for (const x of [0, 300, 600]) g = addNode(g, { x, y: 0 }).graph;
	return g;
}

const ends = (from: string, to: string) => ({
	source: { node: from, port: 'o1' },
	target: { node: to, port: 'i1' }
});

const link = (g: Graph, from: string, to: string) => addLink(g, ends(from, to)).graph;

describe('nodes', () => {
	it('adds nodes n1, n2 ... with a name, input i1 and output o1', () => {
		const g = threeNodes();
		expect(g.data.nodes.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);
		expect(g.data.nodes[0].name).toBe('Node');
		expect(g.data.nodes[0].inputs.map((p) => p.id)).toEqual(['i1']);
		expect(g.data.nodes[0].outputs.map((p) => p.id)).toEqual(['o1']);
		expect(nextNodeId(g)).toBe('n4');
	});

	it('never reuses the highest id after a delete in the middle', () => {
		expect(nextNodeId(removeNodes(threeNodes(), ['n2']))).toBe('n4');
	});

	it('ignores ids in another form when picking the next one', () => {
		const g = threeNodes();
		g.data.nodes[2].id = 'custom';
		expect(nextNodeId(g)).toBe('n3');
	});

	it('renames, and keeps the old name for a blank one', () => {
		let g = renameNode(threeNodes(), 'n2', '  Mixer  ');
		expect(g.data.nodes[1].name).toBe('Mixer');
		g = renameNode(g, 'n2', '   ');
		expect(g.data.nodes[1].name).toBe('Mixer');
	});

	it('moves only the given nodes', () => {
		const before = threeNodes();
		const g = moveNodes(before, ['n1', 'n3'], 10, -5);
		expect(g.data.nodes[0].position.x).toBe(before.data.nodes[0].position.x + 10);
		expect(g.data.nodes[0].position.y).toBe(before.data.nodes[0].position.y - 5);
		expect(g.data.nodes[1].position).toEqual(before.data.nodes[1].position);
	});

	it('removes nodes together with their links', () => {
		let g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3');
		g = removeNodes(g, ['n2']);
		expect(g.data.nodes.map((n) => n.id)).toEqual(['n1', 'n3']);
		expect(g.data.links).toEqual([]);
	});

	it('does not change the graph it was given', () => {
		const g = threeNodes();
		const copy = structuredClone(g);
		renameNode(g, 'n1', 'x');
		moveNodes(g, ['n1'], 1, 1);
		removeNodes(g, ['n1']);
		addLink(g, ends('n1', 'n2'));
		expect(g).toEqual(copy);
	});
});

describe('link rules', () => {
	it('adds a link l1 with type, shape spline and both ends', () => {
		const { graph, outcome, link: created } = addLink(threeNodes(), ends('n1', 'n2'));
		expect(outcome).toBe('added');
		expect(created).toEqual({
			id: 'l1',
			type: 'basic',
			shape: 'spline',
			arrow: 'forward',
			route: 'above',
			...ends('n1', 'n2')
		});
		expect(graph.data.links).toEqual([created]);
	});

	it('keeps a given shape and bend (re-routing)', () => {
		const { link: created } = addLink(threeNodes(), { ...ends('n1', 'n2'), shape: 'manhattan', bend: 0.3 });
		expect(created?.shape).toBe('manhattan');
		expect(created?.bend).toBe(0.3);
	});

	it('keeps a given id when re-routing, unless another link already uses it', () => {
		let g = link(threeNodes(), 'n1', 'n2'); // l1
		g = removeLink(g, 'l1');
		const rerouted = addLink(g, { ...ends('n1', 'n3'), id: 'l1' });
		expect(rerouted.link?.id).toBe('l1');
		const clash = addLink(rerouted.graph, { ...ends('n2', 'n3'), id: 'l1' });
		expect(clash.link?.id).toBe('l2');
	});

	it('keeps an optional name', () => {
		const { link: created } = addLink(threeNodes(), { ...ends('n1', 'n2'), name: 'signal' });
		expect(created?.name).toBe('signal');
	});

	it('lets an input take many links (many-to-many)', () => {
		const g = link(link(threeNodes(), 'n1', 'n3'), 'n2', 'n3');
		expect(linksInto(g, { node: 'n3', port: 'i1' }).map((l) => l.source.node)).toEqual(['n1', 'n2']);
	});

	it('lets an output feed many inputs', () => {
		const g = link(link(threeNodes(), 'n1', 'n2'), 'n1', 'n3');
		expect(g.data.links).toHaveLength(2);
	});

	it('refuses an exact duplicate', () => {
		const g = link(threeNodes(), 'n1', 'n2');
		const { graph, outcome } = addLink(g, ends('n1', 'n2'));
		expect(outcome).toBe('exists');
		expect(graph.data.links).toHaveLength(1);
	});

	it('allows a link from a node to itself (self-loop)', () => {
		const { graph, outcome } = addLink(threeNodes(), ends('n2', 'n2'));
		expect(outcome).toBe('added');
		expect(graph.data.links).toHaveLength(1);
	});

	it('allows cycles: 1 -> 2 -> 1', () => {
		const g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n1');
		expect(g.data.links).toHaveLength(2);
	});

	it('refuses unknown nodes or ports (e.g. input used as source)', () => {
		expect(addLink(threeNodes(), ends('n1', 'n9')).outcome).toBe('unknown-port');
		const wrongWay = { ...ends('n1', 'n2'), source: { node: 'n1', port: 'i1' } };
		expect(addLink(threeNodes(), wrongWay).outcome).toBe('unknown-port');
	});

	it('removes a link by its id, leaving the others', () => {
		let g = link(link(threeNodes(), 'n1', 'n3'), 'n2', 'n3');
		g = removeLink(g, 'l1');
		expect(g.data.links.map((l) => l.id)).toEqual(['l2']);
		expect(findLink(g, ends('n1', 'n3').source, ends('n1', 'n3').target)).toBeUndefined();
	});

	it('never reuses a link id after a delete', () => {
		let g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3');
		g = removeLink(g, 'l1');
		expect(nextLinkId(g)).toBe('l3');
	});
});

describe('link shapes', () => {
	it('cycles one link spline -> line -> manhattan -> spline, leaving the others', () => {
		let g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3');
		const shapes: string[] = [];
		for (let i = 0; i < 3; i++) {
			g = cycleLinkShape(g, 'l1');
			shapes.push(g.data.links[0].shape);
		}
		expect(shapes).toEqual(['line', 'manhattan', 'spline']);
		expect(g.data.links[1].shape).toBe('spline');
	});

	it('applies one shape to all links, keeping their bends', () => {
		let g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3');
		g = setLinkBend(g, 'l1', 0.2);
		g = setAllLinkShapes(g, 'manhattan');
		expect(g.data.links.map((l) => l.shape)).toEqual(['manhattan', 'manhattan']);
		expect(g.data.links[0].bend).toBe(0.2);
	});

	it('clamps the bend to 0..1', () => {
		let g = link(threeNodes(), 'n1', 'n2');
		expect(setLinkBend(g, 'l1', 1.7).data.links[0].bend).toBe(1);
		expect(setLinkBend(g, 'l1', -0.2).data.links[0].bend).toBe(0);
	});

	it('the display override never touches the graph data', () => {
		const g = link(threeNodes(), 'n1', 'n2');
		const before = structuredClone(g);
		linkShapeOverride.set('line');
		graph.set(g);
		expect(get(graph)).toEqual(before);
		linkShapeOverride.set(null);
	});

	it('new nodes have no color', () => {
		expect(threeNodes().data.nodes.every((n) => n.color === null)).toBe(true);
	});
});

describe('arrows, route and link names', () => {
	it('cycles one arrow forward -> both -> backward -> none -> forward', () => {
		let g = link(threeNodes(), 'n1', 'n2');
		const arrows: string[] = [];
		for (let i = 0; i < 4; i++) {
			g = cycleLinkArrow(g, 'l1');
			arrows.push(g.data.links[0].arrow);
		}
		expect(arrows).toEqual(['both', 'backward', 'none', 'forward']);
	});

	it('applies one arrow to all links', () => {
		let g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3');
		g = setAllLinkArrows(g, 'none');
		expect(g.data.links.map((l) => l.arrow)).toEqual(['none', 'none']);
	});

	it('flips the route above <-> below', () => {
		let g = link(threeNodes(), 'n1', 'n2');
		g = toggleLinkRoute(g, 'l1');
		expect(g.data.links[0].route).toBe('below');
		expect(toggleLinkRoute(g, 'l1').data.links[0].route).toBe('above');
	});

	it('names a link and removes the name when it is cleared', () => {
		let g = renameLink(link(threeNodes(), 'n1', 'n2'), 'l1', '  feeds  ');
		expect(g.data.links[0].name).toBe('feeds');
		g = renameLink(g, 'l1', '  ');
		expect('name' in g.data.links[0]).toBe(false);
	});
});

describe('findBackLinks (cycles)', () => {
	it('finds no back links without cycles', () => {
		const g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3');
		expect([...findBackLinks(g)]).toEqual([]);
	});

	it('1 -> 2 -> 1: the link pointing back left closes the cycle', () => {
		const g = link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n1'); // l1, l2
		expect([...findBackLinks(g)]).toEqual(['l2']);
	});

	it('the same cycle created in the other order still marks the right-to-left link', () => {
		const g = link(link(threeNodes(), 'n2', 'n1'), 'n1', 'n2'); // l1 = n2 -> n1
		expect([...findBackLinks(g)]).toEqual(['l1']);
	});

	it('a three-node cycle 1 -> 2 -> 3 -> 1 has one back link', () => {
		const g = link(link(link(threeNodes(), 'n1', 'n2'), 'n2', 'n3'), 'n3', 'n1');
		expect([...findBackLinks(g)]).toEqual(['l3']);
	});

	it('two separate cycles give two back links', () => {
		let g = threeNodes();
		g = addNode(g, { x: 900, y: 0 }).graph; // n4
		g = link(link(g, 'n1', 'n2'), 'n2', 'n1'); // l1, l2
		g = link(link(g, 'n3', 'n4'), 'n4', 'n3'); // l3, l4
		expect([...findBackLinks(g)].sort()).toEqual(['l2', 'l4']);
	});

	it('self-loops are not back links (they are drawn as loops)', () => {
		const g = link(threeNodes(), 'n1', 'n1');
		expect([...findBackLinks(g)]).toEqual([]);
	});
});

describe('direction', () => {
	const sizes = { n1: { w: 192, h: 60 }, n2: { w: 192, h: 60 }, n3: { w: 192, h: 60 } };
	const uneven = { n1: { w: 192, h: 60 }, n2: { w: 150, h: 95 }, n3: { w: 210, h: 60 } };

	it('new graphs are left-to-right', () => {
		expect(emptyGraph().metadata.direction).toBe('left-to-right');
	});

	it('turns a left-to-right row into a top-to-bottom column, in the same order', () => {
		const g = setDirection(threeNodes(), 'top-to-bottom', sizes);
		expect(g.metadata.direction).toBe('top-to-bottom');
		const centres = g.data.nodes.map((n) => ({ x: n.position.x + sizes[n.id as 'n1'].w / 2, y: n.position.y - sizes[n.id as 'n1'].h / 2 }));
		// same column (the row's y was the same), first node on top
		expect(new Set(centres.map((c) => Math.round(c.x))).size).toBe(1);
		expect(centres[0].y).toBeGreaterThan(centres[1].y);
		expect(centres[1].y).toBeGreaterThan(centres[2].y);
	});

	it('switching back gives the original positions, also with nodes of different sizes', () => {
		const g = threeNodes();
		const back = setDirection(setDirection(g, 'top-to-bottom', uneven), 'left-to-right', uneven);
		back.data.nodes.forEach((n, i) => {
			expect(n.position.x).toBeCloseTo(g.data.nodes[i].position.x, 9);
			expect(n.position.y).toBeCloseTo(g.data.nodes[i].position.y, 9);
		});
	});

	it('setting the same direction changes nothing', () => {
		const g = threeNodes();
		expect(setDirection(g, 'left-to-right', sizes)).toBe(g);
	});

	it('top-to-bottom: the link pointing back up closes the cycle, F links top into bottom', () => {
		let g = setDirection(threeNodes(), 'top-to-bottom', sizes); // n1 top, n3 bottom
		expect(quickLink(g, 'n3', 'n1')).toEqual(ends('n1', 'n3'));
		g = link(link(g, 'n1', 'n2'), 'n2', 'n1'); // l1 down, l2 back up
		expect([...findBackLinks(g)]).toEqual(['l2']);
	});
});

describe('quickLink (F key)', () => {
	it('links the left node into the right one, whatever the selection order', () => {
		expect(quickLink(threeNodes(), 'n3', 'n2')).toEqual(ends('n2', 'n3'));
	});

	it('links right to left when the left-to-right link already exists', () => {
		const g = link(threeNodes(), 'n2', 'n3');
		expect(quickLink(g, 'n2', 'n3')).toEqual(ends('n3', 'n2'));
	});

	it('returns null when both directions already exist', () => {
		const g = link(link(threeNodes(), 'n2', 'n3'), 'n3', 'n2');
		expect(quickLink(g, 'n2', 'n3')).toBeNull();
	});

	it('returns null for the same or a missing node', () => {
		expect(quickLink(threeNodes(), 'n2', 'n2')).toBeNull();
		expect(quickLink(threeNodes(), 'n2', 'n9')).toBeNull();
	});
});

describe('selectNode', () => {
	const empty = { nodes: [], link: null };

	it('selects one node, replacing the selection', () => {
		expect(selectNode({ nodes: ['n1'], link: null }, 'n2', false).nodes).toEqual(['n2']);
	});

	it('keeps a multi-selection when clicking a node in it (for group drag)', () => {
		expect(selectNode({ nodes: ['n1', 'n2'], link: null }, 'n2', false).nodes).toEqual(['n1', 'n2']);
	});

	it('toggles with Shift and clears a selected link', () => {
		let sel = selectNode(empty, 'n1', true);
		sel = selectNode(sel, 'n2', true);
		expect(sel.nodes).toEqual(['n1', 'n2']);
		sel = selectNode(sel, 'n1', true);
		expect(sel.nodes).toEqual(['n2']);
		expect(selectNode({ nodes: [], link: 'l1' }, 'n1', false).link).toBeNull();
	});
});
