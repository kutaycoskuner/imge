// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-17
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// history.ts -- undo / redo for the open graph (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z).
//
// Every operation in store.ts returns a new graph object and never changes the old one, so
// a history step is just the graph object from before the change (no copying). Every change
// of the `graph` store is recorded once trackHistory() runs; a mouse gesture (drag a node,
// drag a link, move a corner) changes the graph on every mouse move, so the page wraps it in
// holdHistory() / releaseHistory() and the whole gesture becomes one step.
// Loading a graph (open, example, new) calls clearHistory(): undo never crosses a load.
// The history lives in memory only (HISTORY_LIMIT steps) and is not saved with the graph.
//
// Used by: routes/+page.svelte (keys, gestures), file-access.ts (clear on load).
// Details: docs/graph-editing.md#undo-and-redo
// -----------------------------------------------------------------------------------------

import { get } from 'svelte/store';
import { graph, selection } from './store';
import type { Graph } from './types';

export const HISTORY_LIMIT = 100; // oldest steps are dropped beyond this

const undoStack: Graph[] = []; // graphs before each change, oldest first
const redoStack: Graph[] = []; // graphs undone, most recent last
let current: Graph = get(graph); // the graph object the store holds now
let applying = false; // undo / redo is setting the store: not a new change
let holdStart: Graph | null = null; // graph when the running gesture began (null: none)

/**
 * Records every change of the `graph` store as one undo step. Call once (onMount).
 *
 * Returns:
 *     A function that stops recording.
 */
export function trackHistory(): () => void {
	current = get(graph);
	return graph.subscribe((g) => {
		// an operation that changed nothing returns the same object; svelte still notifies
		if (g === current) return;
		const previous = current;
		current = g;
		if (applying || holdStart) return; // a gesture is recorded once, when it ends
		record(previous);
	});
}

/** Starts a gesture: changes until releaseHistory() become one undo step. */
export function holdHistory(): void {
	if (!holdStart) holdStart = current;
}

/** Ends a gesture: records it as one step if it changed the graph. */
export function releaseHistory(): void {
	if (!holdStart) return;
	if (current !== holdStart) record(holdStart);
	holdStart = null;
}

/** Forgets all steps; the graph as it is now is where undo stops. Called by every load. */
export function clearHistory(): void {
	undoStack.length = 0;
	redoStack.length = 0;
	holdStart = null;
	current = get(graph);
}

/** Goes one step back. Returns false when there is nothing to undo (or a gesture is running). */
export function undo(): boolean {
	if (holdStart || undoStack.length === 0) return false;
	redoStack.push(current);
	apply(undoStack.pop()!);
	return true;
}

/** Goes one undone step forward again. Returns false when there is nothing to redo. */
export function redo(): boolean {
	if (holdStart || redoStack.length === 0) return false;
	undoStack.push(current);
	apply(redoStack.pop()!);
	return true;
}

/** Number of steps that can be undone / redone (for messages and tests). */
export function historySize(): { undo: number; redo: number } {
	return { undo: undoStack.length, redo: redoStack.length };
}

function record(previous: Graph): void {
	undoStack.push(previous);
	if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
	redoStack.length = 0; // a new change after undoing drops the undone steps
}

// sets the store without recording, and drops selected nodes / link that no longer exist
function apply(g: Graph): void {
	applying = true;
	graph.set(g);
	applying = false;
	const nodeIds = new Set(g.data.nodes.map((n) => n.id));
	selection.update((sel) => ({
		nodes: sel.nodes.filter((id) => nodeIds.has(id)),
		link: sel.link && g.data.links.some((l) => l.id === sel.link) ? sel.link : null
	}));
}
