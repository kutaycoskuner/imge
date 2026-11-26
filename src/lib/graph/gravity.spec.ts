// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// gravity.spec.ts -- checks the gravity augmentation: link counts and dot sizes, the forces
// (links pull, nodes push apart, pinned nodes stay), that the layout settles and puts the
// best-linked node in the middle, writing positions back, and the checks a graph must pass
// before gravity can run (augmentations.ts), including the gravity test example.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { degrees, dotRadius, bodiesOf, step, cool, settle, withBodies, linkPairs, collide, DOT, GRAVITY, type Body } from './gravity';
import { augmentation, runChecks, allPass, GRAVITY_MAX_NODES } from './augmentations';
import { migrateGraph } from './migrations';
import type { Graph, GraphNode, Link } from './types';
import gravityExample from '../../../static/data/examples/gravity-test.json';

const node = (id: string, x: number, y: number, type = 'basic'): GraphNode => ({ id, type, typeVersion: 2, position: { x, y }, ports: [], content: { name: id } });
const link = (id: string, a: string, b: string): Link =>
	({ id, type: 'basic', shape: 'line', arrow: 'none', line: 'solid', mark: 'arrow', route: 'above', source: { node: a, port: 'o1' }, target: { node: b, port: 'i1' } }) as Link;
const G = (nodes: GraphNode[], links: Link[]): Graph => ({ metadata: { format: 'imge-graph', version: 7, direction: 'left-to-right' }, data: { nodes, links } });
const dist = (a: Body, b: Body) => Math.hypot(a.x - b.x, a.y - b.y);
/** The closest two dots come: the gap between their edges (negative = overlapping). */
const closestGap = (bodies: Body[]) => {
	let least = Infinity;
	for (let i = 0; i < bodies.length; i++)
		for (let j = i + 1; j < bodies.length; j++) least = Math.min(least, dist(bodies[i], bodies[j]) - bodies[i].r - bodies[j].r);
	return least;
};

// a star: hub h linked to five leaves, all started in a row far apart
const star = G(
	[node('h', 0, 0), ...['a', 'b', 'c', 'd', 'e'].map((id, i) => node(id, 400 + i * 400, 0))],
	['a', 'b', 'c', 'd', 'e'].map((id, i) => link(`l${i}`, 'h', id))
);

describe('size by links', () => {
	it('counts link ends per node', () => {
		expect(degrees(star)).toEqual({ h: 5, a: 1, b: 1, c: 1, d: 1, e: 1 });
	});
	it('makes a dot bigger with every link, within its limits', () => {
		expect(dotRadius(0)).toBe(DOT.min);
		expect(dotRadius(2) - dotRadius(1)).toBe(DOT.perLink);
		expect(dotRadius(10)).toBeGreaterThan(2 * dotRadius(1)); // a hub stands out
		expect(dotRadius(10000)).toBe(DOT.max);
	});
	it('leaves groups and text nodes out', () => {
		const g = G([node('a', 0, 0), node('g', 0, 0, 'group'), node('t', 0, 0, 'text')], []);
		expect(bodiesOf(g).map((b) => b.id)).toEqual(['a']);
	});
});

describe('forces', () => {
	it('a link pulls two far nodes together', () => {
		const g = G([node('a', 0, 0), node('b', 3000, 0)], [link('l', 'a', 'b')]);
		const before = bodiesOf(g);
		const after = step(before, linkPairs(g), 1).bodies;
		expect(dist(after[0], after[1])).toBeLessThan(dist(before[0], before[1]));
	});
	it('two unlinked nodes on top of each other push apart', () => {
		const g = G([node('a', 0, 0), node('b', 1, 1)], []);
		const before = bodiesOf(g);
		const after = step(before, [], 1).bodies;
		expect(dist(after[0], after[1])).toBeGreaterThan(dist(before[0], before[1]));
	});
	it('collision pushes overlapping dots apart to at least the gap; a pinned one stays', () => {
		const bodies: Body[] = [
			{ id: 'a', x: 0, y: 0, vx: 0, vy: 0, r: 20 },
			{ id: 'b', x: 5, y: 0, vx: 0, vy: 0, r: 20 },
			{ id: 'c', x: 0, y: 0, vx: 0, vy: 0, r: 10 } // exactly on top of a
		];
		expect(closestGap(collide(bodies, new Set(), 20))).toBeGreaterThanOrEqual(GRAVITY.gap - 0.01);
		const pinnedA = collide(bodies, new Set(['a']), 20);
		expect([pinnedA[0].x, pinnedA[0].y]).toEqual([0, 0]);
	});
	it('a pinned node stays put', () => {
		const g = G([node('a', 0, 0), node('b', 3000, 0)], [link('l', 'a', 'b')]);
		const before = bodiesOf(g);
		const after = step(before, linkPairs(g), 1, new Set(['a'])).bodies;
		expect([after[0].x, after[0].y]).toEqual([before[0].x, before[0].y]);
	});
	it('cools down to rest', () => {
		let alpha = 1;
		let n = 0;
		while (alpha > 0 && n < 10000) {
			alpha = cool(alpha);
			n++;
		}
		expect(alpha).toBe(0);
		expect(n).toBeLessThan(1000);
	});
});

describe('the layout', () => {
	it('settles with the best-linked node in the middle and the leaves around it', () => {
		const { bodies, steps } = settle(star);
		expect(steps).toBeLessThan(2000);
		const hub = bodies.find((b) => b.id === 'h')!;
		const leaves = bodies.filter((b) => b.id !== 'h');
		const cx = leaves.reduce((s, b) => s + b.x, 0) / leaves.length;
		const cy = leaves.reduce((s, b) => s + b.y, 0) / leaves.length;
		expect(Math.hypot(hub.x - cx, hub.y - cy)).toBeLessThan(GRAVITY.linkLength); // hub near the leaves' centre
		// pulled in from up to 2000 away to close to the hub: about a link's length between edges
		for (const leaf of leaves) expect(dist(leaf, hub) - leaf.r - hub.r).toBeLessThan(GRAVITY.linkLength * 2);
		expect(closestGap(bodies)).toBeGreaterThanOrEqual(GRAVITY.gap - 0.5); // and none overlap
	});
	it('writes the positions back as top-left corners, the same graph when nothing moved', () => {
		const bodies = bodiesOf(star);
		expect(withBodies(star, bodies)).toBe(star);
		const moved = withBodies(star, bodies.map((b) => (b.id === 'a' ? { ...b, x: b.x + 100 } : b)));
		expect(moved.data.nodes.find((n) => n.id === 'a')!.position.x).toBe(500);
	});
});

describe('checks before gravity runs', () => {
	const gravity = augmentation('gravity')!;
	it('passes a linked graph', () => {
		expect(allPass(runChecks(gravity, star))).toBe(true);
	});
	it('refuses a graph with groups, naming them', () => {
		const grouped = G([node('a', 0, 0), node('b', 0, 0), { ...node('g', 0, 0, 'group'), content: { name: 'Types v1' } }], [link('l', 'a', 'b')]);
		const r = runChecks(gravity, grouped);
		expect(r.find((c) => c.id === 'groups')).toMatchObject({ ok: false });
		expect(r.find((c) => c.id === 'groups')!.detail).toContain('Types v1');
		expect(allPass(r)).toBe(false);
	});
	it('refuses with reasons: no links, too few nodes, broken links, too many nodes', () => {
		const lonely = runChecks(gravity, G([node('a', 0, 0), node('b', 0, 0)], []));
		expect(lonely.find((r) => r.id === 'links')).toMatchObject({ ok: false, detail: 'no links: nothing would pull' });
		expect(runChecks(gravity, G([node('a', 0, 0)], [])).find((r) => r.id === 'nodes')?.ok).toBe(false);
		const broken = runChecks(gravity, G([node('a', 0, 0), node('b', 0, 0)], [link('l1', 'a', 'b'), link('l2', 'a', 'gone')]));
		expect(broken.find((r) => r.id === 'whole')).toMatchObject({ ok: false, detail: '1 broken: l2' });
		const many = G(Array.from({ length: GRAVITY_MAX_NODES + 1 }, (_, i) => node(`n${i}`, i, 0)), [link('l', 'n0', 'n1')]);
		expect(runChecks(gravity, many).find((r) => r.id === 'size')?.ok).toBe(false);
	});
	it('passes the gravity test example, which settles with no dots overlapping', () => {
		const g = migrateGraph(gravityExample).graph;
		expect(allPass(runChecks(gravity, g))).toBe(true);
		const { bodies, steps } = settle(g);
		expect(steps).toBeLessThan(2000);
		expect(closestGap(bodies)).toBeGreaterThanOrEqual(GRAVITY.gap - 0.5);
	});
});
