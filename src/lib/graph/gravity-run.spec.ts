// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// gravity-run.spec.ts -- checks that gravity isn't destructive: the positions snapshot and
// writing it back (gravity.ts positionsOf / withPositions), and stopping a run (gravity-run.ts)
// with Revert (every node back, the very graph from before: no undo step) or Keep (the new
// layout, one undo step). Animation frames are stubbed: the test moves the nodes itself, as
// gravity (or a drag) would.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { graph, moveNodes } from './store';
import { trackHistory, clearHistory, historySize, undo } from './history';
import { positionsOf, withPositions } from './gravity';
import { startGravity, stopGravity, gravityOn } from './gravity-run';
import type { Graph, GraphNode, Link } from './types';

const node = (id: string, x: number, y: number): GraphNode => ({ id, type: 'basic', typeVersion: 2, position: { x, y }, ports: [], content: { name: id } });
const link = (id: string, a: string, b: string): Link =>
	({ id, type: 'basic', shape: 'line', arrow: 'none', line: 'solid', mark: 'arrow', route: 'above', source: { node: a, port: 'o1' }, target: { node: b, port: 'i1' } }) as Link;
const G = (nodes: GraphNode[], links: Link[]): Graph => ({ metadata: { format: 'imge-graph', version: 7, direction: 'left-to-right' }, data: { nodes, links } });
const start = () => G([node('a', 0, 0), node('b', 300, 0), node('c', 600, 0)], [link('l1', 'a', 'b'), link('l2', 'b', 'c')]);
// what gravity does to the nodes while it runs
const shake = () => graph.update((g) => moveNodes(g, ['a', 'c'], 40, -25));

describe('positions snapshot', () => {
	it('puts moved nodes back, leaves added ones, and is the same graph when nothing moved', () => {
		const g = start();
		const snap = positionsOf(g);
		expect(withPositions(g, snap)).toBe(g);
		const moved = { ...g, data: { ...g.data, nodes: [...g.data.nodes.map((n) => ({ ...n, position: { x: n.position.x + 9, y: 1 } })), node('new', 5, 5)] } };
		const back = withPositions(moved, snap);
		expect(back.data.nodes.map((n) => [n.id, n.position.x, n.position.y])).toEqual([
			['a', 0, 0],
			['b', 300, 0],
			['c', 600, 0],
			['new', 5, 5]
		]);
		snap.a.x = 999; // a copy: changing the snapshot later changes nothing
		expect(back.data.nodes[0].position.x).toBe(0);
	});
});

describe('stopping gravity', () => {
	let untrack: () => void;
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', () => 1);
		vi.stubGlobal('cancelAnimationFrame', () => undefined);
		graph.set(start());
		clearHistory();
		untrack = trackHistory();
	});
	afterEach(() => {
		stopGravity();
		untrack();
		vi.unstubAllGlobals();
	});

	it('Revert hands back the very graph from before: no undo step', () => {
		const before = get(graph);
		startGravity();
		expect(get(gravityOn)).toBe(true);
		shake();
		expect(get(graph)).not.toBe(before);
		stopGravity('revert');
		expect(get(gravityOn)).toBe(false);
		expect(get(graph)).toBe(before);
		expect(historySize().undo).toBe(0);
	});

	it('Keep leaves the new layout as one undo step, which Ctrl+Z takes back', () => {
		const before = get(graph);
		startGravity();
		shake();
		shake();
		stopGravity('keep');
		expect(get(graph).data.nodes[0].position).toEqual({ x: 80, y: -50 });
		expect(historySize().undo).toBe(1);
		expect(undo()).toBe(true);
		expect(get(graph)).toBe(before);
	});

	it('Revert after other changes puts the positions back but keeps those changes (one step)', () => {
		startGravity();
		shake();
		graph.update((g) => ({ ...g, data: { ...g.data, links: g.data.links.slice(0, 1) } })); // a link removed meanwhile
		stopGravity('revert');
		expect(positionsOf(get(graph))).toEqual(positionsOf(start()));
		expect(get(graph).data.links.map((l) => l.id)).toEqual(['l1']);
		expect(historySize().undo).toBe(1);
	});
});
