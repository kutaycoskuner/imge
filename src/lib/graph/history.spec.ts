// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-17
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// history.spec.ts -- checks undo / redo: one step per change, one step per gesture, redo
// dropped by a new change, the step limit, clearing, and the selection after an undo.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { graph, selection, emptyGraph, addNode, moveNodes, renameNode } from './store';
import {
	trackHistory,
	holdHistory,
	releaseHistory,
	clearHistory,
	undo,
	redo,
	historySize,
	HISTORY_LIMIT
} from './history';

const add = () => graph.update((g) => addNode(g, { x: 0, y: 0 }).graph);
const nodeIds = () => get(graph).data.nodes.map((n) => n.id);

let stop: () => void;
beforeEach(() => {
	graph.set(emptyGraph());
	selection.set({ nodes: [], link: null });
	clearHistory();
	stop = trackHistory();
});
afterEach(() => stop());

describe('history', () => {
	it('undoes and redoes one change at a time', () => {
		add();
		add();
		expect(nodeIds()).toEqual(['n1', 'n2']);
		expect(undo()).toBe(true);
		expect(nodeIds()).toEqual(['n1']);
		expect(undo()).toBe(true);
		expect(nodeIds()).toEqual([]);
		expect(undo()).toBe(false);
		expect(redo()).toBe(true);
		expect(nodeIds()).toEqual(['n1']);
	});

	it('gives back the very same graph object (so saved state can be recognised)', () => {
		const before = get(graph);
		add();
		undo();
		expect(get(graph)).toBe(before);
	});

	it('records a gesture as one step', () => {
		add();
		holdHistory();
		for (let i = 0; i < 5; i++) graph.update((g) => moveNodes(g, ['n1'], 10, 0));
		releaseHistory();
		expect(historySize().undo).toBe(2);
		undo();
		expect(get(graph).data.nodes[0].position.x).toBe(-96); // where addNode put it
	});

	it('records nothing for a gesture or an operation that changed nothing', () => {
		add();
		holdHistory();
		releaseHistory();
		graph.update((g) => renameNode(g, 'n1', '   ')); // blank name: same graph back
		expect(historySize().undo).toBe(1);
	});

	it('drops the redo steps when something new changes', () => {
		add();
		add();
		undo();
		expect(historySize().redo).toBe(1);
		graph.update((g) => renameNode(g, 'n1', 'A'));
		expect(historySize()).toEqual({ undo: 2, redo: 0 });
		expect(redo()).toBe(false);
	});

	it('keeps at most HISTORY_LIMIT steps', () => {
		for (let i = 0; i < HISTORY_LIMIT + 5; i++) add();
		expect(historySize().undo).toBe(HISTORY_LIMIT);
	});

	it('does not undo while a gesture is running', () => {
		add();
		holdHistory();
		expect(undo()).toBe(false);
		releaseHistory();
		expect(undo()).toBe(true);
	});

	it('stops at a clear (a load)', () => {
		add();
		clearHistory();
		expect(undo()).toBe(false);
		expect(nodeIds()).toEqual(['n1']);
	});

	it('removes nodes that the undo took away from the selection', () => {
		add();
		add();
		selection.set({ nodes: ['n1', 'n2'], link: null });
		undo();
		expect(get(selection).nodes).toEqual(['n1']);
	});
});
