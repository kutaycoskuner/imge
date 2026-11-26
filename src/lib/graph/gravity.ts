// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// gravity.ts -- the gravity augmentation's physics (augmentations.ts), pure: a force layout
// in the spirit of d3-force. Every node that takes part (not groups and text nodes) is a
// body at its centre, a round dot whose size grows with its number of links (degree).
// Each step:
//   - links pull their two ends close (linkLength between the dots' edges), like springs
//   - every two bodies push each other apart, stronger when close and when big (charge)
//   - a weak pull towards the centre of all bodies keeps the whole together, so
//     well-linked nodes end up in the middle and loose ones drift to the edge
//   - then a collision pass: no two dots overlap (at least `gap` between their edges)
// The movement is multiplied by `alpha`, which cools down each step, so the layout settles;
// a node the user is dragging is pinned (it doesn't move, others react to it).
// Node positions are their top-left corners with y up (graph format); bodies are centres.
// The page runs it (gravity-run.ts); everything here is testable without a browser.
// Details: docs/graph-augmentations.md
// -----------------------------------------------------------------------------------------

import type { Graph, GraphNode } from './types';
import type { Point } from '$lib/camera';

/** The forces' strengths (world units, per step). */
export const GRAVITY = {
	linkLength: 50, // a link's resting length between the two dots' edges: linked dots sit close
	linkStrength: 0.1, // how hard a link pulls / pushes towards its length
	charge: 1500, // how hard two bodies push apart (times their size)
	centre: 0.015, // pull towards the centre of all bodies
	gap: 8, // the least space between two dots' edges (collision): they never overlap
	damping: 0.6, // velocity kept from one step to the next
	alphaDecay: 0.025, // how fast the motion cools down (per step)
	alphaMin: 0.003, // below this the layout counts as settled
	maxStep: 60 // no body moves further than this in one step
};

/** Dot sizes: radius from the number of links, growing with every link (a hub stands out). */
export const DOT = { min: 8, perLink: 4, max: 72 };

/** Whether a node takes part in gravity: everything but groups (frames around others) and text nodes. */
export const takesPart = (node: GraphNode): boolean => node.type !== 'group' && node.type !== 'text';

/** Number of link ends at each node (a self-loop counts twice), for every node of the graph. */
export function degrees(g: Graph): Record<string, number> {
	const d: Record<string, number> = Object.fromEntries(g.data.nodes.map((n) => [n.id, 0]));
	for (const l of g.data.links) {
		if (l.source.node in d) d[l.source.node]++;
		if (l.target.node in d) d[l.target.node]++;
	}
	return d;
}

/** A dot's radius for a number of links: DOT.perLink more for every link, within DOT.min .. DOT.max. */
export const dotRadius = (degree: number): number => Math.min(DOT.max, DOT.min + DOT.perLink * Math.max(0, degree));

/**
 * Pushes apart every two dots closer than their radii plus GRAVITY.gap, so no two overlap
 * (a pinned dot stays, the other moves the whole way). A few passes, since separating one
 * pair can push into another.
 */
export function collide(bodies: Body[], pinned: Set<string> = new Set(), passes = 4): Body[] {
	const out = bodies.map((b) => ({ ...b }));
	for (let pass = 0; pass < passes; pass++) {
		let moved = false;
		for (let i = 0; i < out.length; i++) {
			for (let j = i + 1; j < out.length; j++) {
				const a = out[i];
				const b = out[j];
				let dx = b.x - a.x;
				let dy = b.y - a.y;
				let d = Math.sqrt(dx * dx + dy * dy);
				const need = a.r + b.r + GRAVITY.gap;
				if (d >= need) continue;
				if (d < 1e-6) {
					// on the same spot: apart along a fixed direction per pair
					dx = Math.cos(i + j);
					dy = Math.sin(i + j);
					d = 1;
				}
				const overlap = need - d;
				const aFixed = pinned.has(a.id);
				const bFixed = pinned.has(b.id);
				if (aFixed && bFixed) continue;
				const shareA = aFixed ? 0 : bFixed ? 1 : 0.5;
				const shareB = 1 - shareA;
				a.x -= (dx / d) * overlap * shareA;
				a.y -= (dy / d) * overlap * shareA;
				b.x += (dx / d) * overlap * shareB;
				b.y += (dy / d) * overlap * shareB;
				moved = true;
			}
		}
		if (!moved) break;
	}
	return out;
}

/** One moving body: its centre, velocity and radius. */
export interface Body {
	id: string;
	x: number;
	y: number;
	vx: number;
	vy: number;
	r: number;
}

/** The bodies for a graph: the taking-part nodes at their centres, at rest. */
export function bodiesOf(g: Graph): Body[] {
	const d = degrees(g);
	return g.data.nodes.filter(takesPart).map((n) => {
		const r = dotRadius(d[n.id]);
		return { id: n.id, x: n.position.x + r, y: n.position.y - r, vx: 0, vy: 0, r };
	});
}

/** A body's node position: the top-left corner of its dot (y up). */
export const cornerOf = (b: Body): Point => ({ x: Math.round(b.x - b.r), y: Math.round(b.y + b.r) });

/**
 * One step of the layout: moves the bodies (a new list; pinned ones stay where they are).
 *
 * Returns:
 *     The moved bodies and how much they moved in all (the "energy"; near 0 = settled).
 */
export function step(bodies: Body[], links: [string, string][], alpha: number, pinned: Set<string> = new Set()): { bodies: Body[]; energy: number } {
	const n = bodies.length;
	const fx = new Float64Array(n);
	const fy = new Float64Array(n);
	const index = new Map(bodies.map((b, i) => [b.id, i]));

	// every two bodies push each other apart (big ones harder); a tiny offset keeps two
	// bodies on the same spot from staying there
	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			let dx = bodies[j].x - bodies[i].x;
			let dy = bodies[j].y - bodies[i].y;
			if (dx === 0 && dy === 0) {
				dx = 0.5 + (i % 3);
				dy = 0.5 + (j % 3);
			}
			const dist2 = Math.max(dx * dx + dy * dy, 25);
			const dist = Math.sqrt(dist2);
			const push = (GRAVITY.charge * (bodies[i].r + bodies[j].r)) / 20 / dist2;
			fx[i] -= (dx / dist) * push;
			fy[i] -= (dy / dist) * push;
			fx[j] += (dx / dist) * push;
			fy[j] += (dy / dist) * push;
		}
	}
	// links pull (or push) their ends towards their resting length, between the dots' edges
	for (const [a, b] of links) {
		const i = index.get(a);
		const j = index.get(b);
		if (i === undefined || j === undefined || i === j) continue;
		const dx = bodies[j].x - bodies[i].x;
		const dy = bodies[j].y - bodies[i].y;
		const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
		const rest = GRAVITY.linkLength + bodies[i].r + bodies[j].r;
		const pull = (dist - rest) * GRAVITY.linkStrength;
		fx[i] += (dx / dist) * pull;
		fy[i] += (dy / dist) * pull;
		fx[j] -= (dx / dist) * pull;
		fy[j] -= (dy / dist) * pull;
	}
	// a weak pull towards the centre of all bodies
	const cx = bodies.reduce((s, b) => s + b.x, 0) / Math.max(1, n);
	const cy = bodies.reduce((s, b) => s + b.y, 0) / Math.max(1, n);

	let energy = 0;
	const moved = bodies.map((b, i) => {
		if (pinned.has(b.id)) return { ...b, vx: 0, vy: 0 };
		const ax = fx[i] + (cx - b.x) * GRAVITY.centre;
		const ay = fy[i] + (cy - b.y) * GRAVITY.centre;
		let vx = (b.vx + ax * alpha) * GRAVITY.damping;
		let vy = (b.vy + ay * alpha) * GRAVITY.damping;
		const speed = Math.sqrt(vx * vx + vy * vy);
		if (speed > GRAVITY.maxStep) {
			vx = (vx / speed) * GRAVITY.maxStep;
			vy = (vy / speed) * GRAVITY.maxStep;
		}
		energy += Math.abs(vx) + Math.abs(vy);
		return { ...b, x: b.x + vx, y: b.y + vy, vx, vy };
	});
	return { bodies: collide(moved, pinned), energy };
}

/** The next alpha: cools down each step; 0 once settled. */
export const cool = (alpha: number): number => (alpha * (1 - GRAVITY.alphaDecay) < GRAVITY.alphaMin ? 0 : alpha * (1 - GRAVITY.alphaDecay));

/** The links between taking-part nodes, as pairs of node ids. */
export function linkPairs(g: Graph): [string, string][] {
	const part = new Set(g.data.nodes.filter(takesPart).map((n) => n.id));
	return g.data.links.filter((l) => part.has(l.source.node) && part.has(l.target.node)).map((l) => [l.source.node, l.target.node]);
}

/**
 * The graph with the bodies' positions written into their nodes (top-left corners). The
 * same graph when nothing moved by a whole unit (so no needless redraws).
 */
export function withBodies(g: Graph, bodies: Body[]): Graph {
	const at = new Map(bodies.map((b) => [b.id, cornerOf(b)]));
	let changed = false;
	const nodes = g.data.nodes.map((n) => {
		const p = at.get(n.id);
		if (!p || (p.x === n.position.x && p.y === n.position.y)) return n;
		changed = true;
		return { ...n, position: p };
	});
	return changed ? { ...g, data: { ...g.data, nodes } } : g;
}

/** Runs the layout to rest without drawing (tests, and a check that it settles): the settled bodies and the steps it took. */
export function settle(g: Graph, maxSteps = 2000): { bodies: Body[]; steps: number } {
	let bodies = bodiesOf(g);
	const links = linkPairs(g);
	let alpha = 1;
	let steps = 0;
	while (alpha > 0 && steps < maxSteps) {
		bodies = step(bodies, links, alpha).bodies;
		alpha = cool(alpha);
		steps++;
	}
	return { bodies, steps };
}
