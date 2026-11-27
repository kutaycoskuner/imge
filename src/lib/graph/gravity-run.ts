// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// gravity-run.ts -- runs the gravity augmentation on the open graph in the browser: started
// and stopped from the Augment menu, it tests the graph first (augmentations.ts checks),
// then moves the nodes every animation frame with the physics of gravity.ts until they
// settle, and keeps watching: a node the user drags is pinned while it moves and the others
// wake up and follow; nodes or links added or removed wake it up too.
// While it runs:
//   - nodes are drawn as dots sized by their links (GraphNode reads `gravityOn` and
//     `nodeDegrees`), links as straight lines (the display override; the user's own override
//     comes back when it stops)
//   - the whole run, the user's own changes included, is one undo step (history.ts session)
// Stopping either reverts (every node back where it was when gravity started; gravity isn't
// destructive) or keeps the new layout. Opening another graph stops it (AugmentMenu).
// Details: docs/graph-augmentations.md
// -----------------------------------------------------------------------------------------

import { writable, derived, get } from 'svelte/store';
import { graph, linkShapeOverride } from './store';
import { beginSession, endSession, sessionBase } from './history';
import { augmentation, runChecks, allPass, type CheckResult } from './augmentations';
import { degrees, dotRadius, takesPart, step, cool, withBodies, linkPairs, cornerOf, positionsOf, withPositions, type Body } from './gravity';
import type { LinkShape } from './types';
import type { Point } from '$lib/camera';

/** Whether gravity is running (nodes drawn as dots and moving). */
export const gravityOn = writable(false);
/** Whether the layout is still moving or has settled (it keeps watching for drags). */
export const gravityMoving = writable(false);
/** Each node's number of links, for the dots' sizes. */
export const nodeDegrees = derived(graph, degrees);

let frame = 0;
let bodies: Body[] = [];
let alpha = 0;
let savedOverride: LinkShape | null = null;
let before: Record<string, Point> = {}; // every node's position when gravity started (Revert)

/** Wakes the motion up again (after a drag, a new node ...), never below its current heat. */
const reheat = (to: number) => (alpha = Math.max(alpha, to));

/**
 * Tests the open graph and, when every check passes, starts gravity.
 *
 * Returns:
 *     The check results (all of them, passed or not); gravity runs when all passed.
 */
export function startGravity(): CheckResult[] {
	const results = runChecks(augmentation('gravity')!, get(graph));
	if (!allPass(results) || get(gravityOn)) return results;
	beginSession();
	before = positionsOf(get(graph));
	savedOverride = get(linkShapeOverride);
	linkShapeOverride.set('line');
	bodies = [];
	alpha = 1;
	gravityOn.set(true);
	gravityMoving.set(true);
	frame = requestAnimationFrame(tick);
	return results;
}

/**
 * Stops gravity; the normal look comes back.
 *
 * Args:
 *     how: 'keep' leaves the new layout (one undo step); 'revert' puts every node back where it
 *         was when gravity started (nodes added meanwhile keep their place). Without other
 *         changes during the run, reverting hands the graph back exactly as it was: no undo
 *         step, and no unsaved changes if it had none.
 */
export function stopGravity(how: 'keep' | 'revert' = 'keep'): void {
	if (!get(gravityOn)) return;
	cancelAnimationFrame(frame);
	frame = 0;
	gravityOn.set(false);
	gravityMoving.set(false);
	linkShapeOverride.set(savedOverride);
	if (how === 'revert') {
		const reverted = withPositions(get(graph), before);
		const base = sessionBase();
		// nothing else changed: the very graph from before, so nothing counts as changed
		graph.set(base && JSON.stringify(base) === JSON.stringify(reverted) ? base : reverted);
	}
	before = {};
	endSession();
}

// one animation frame: bring the bodies in line with the graph (the user may have dragged,
// added or removed nodes), move them one step if not settled, write the positions back
function tick(): void {
	const g = get(graph);
	const d = degrees(g);
	const before = new Map(bodies.map((b) => [b.id, b]));
	const pinned = new Set<string>();
	const next: Body[] = [];
	for (const n of g.data.nodes) {
		if (!takesPart(n)) continue;
		const r = dotRadius(d[n.id]);
		const b = before.get(n.id);
		if (!b) {
			// new (or the first frame): at its node's place
			next.push({ id: n.id, x: n.position.x + r, y: n.position.y - r, vx: 0, vy: 0, r });
			if (before.size) reheat(0.4);
			continue;
		}
		const was = cornerOf(b);
		if (was.x !== n.position.x || was.y !== n.position.y) {
			// moved by someone else since the last frame (a drag): follow it, pinned for now
			pinned.add(n.id);
			next.push({ id: n.id, x: n.position.x + r, y: n.position.y - r, vx: 0, vy: 0, r });
			reheat(0.3);
			continue;
		}
		if (b.r !== r) reheat(0.3); // its links changed: a new size
		next.push({ ...b, r, x: b.x - b.r + r, y: b.y + b.r - r }); // the corner stays where it is
	}
	if (next.length !== before.size && before.size) reheat(0.4);
	bodies = next;

	if (alpha > 0) {
		bodies = step(bodies, linkPairs(g), alpha, pinned).bodies;
		alpha = cool(alpha);
		const moved = withBodies(g, bodies);
		if (moved !== g) graph.set(moved);
	}
	gravityMoving.set(alpha > 0);
	frame = requestAnimationFrame(tick);
}
