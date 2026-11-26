// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// arithmetic-run.ts -- runs the arithmetic augmentation on the open graph: started and
// stopped from the Augment menu, it tests the graph first (augmentations.ts checks); while it
// runs, every operator's and "="'s result (arithmetic.ts evaluate) is worked out again on
// every change of the graph and shown beside the node (GraphNode reads `arithmeticResults`).
// It never changes the graph, so it is no undo step; stopping hides the results.
// Details: docs/graph-augmentations.md
// -----------------------------------------------------------------------------------------

import { writable, derived, get } from 'svelte/store';
import { graph } from './store';
import { augmentation, runChecks, allPass, type CheckResult } from './augmentations';
import { evaluate, type Result } from './arithmetic';

/** Whether arithmetic is running (results shown beside the nodes). */
export const arithmeticOn = writable(false);

/** Each operator's and output's result while it runs, by node id; empty otherwise. */
export const arithmeticResults = derived([graph, arithmeticOn], ([g, on]): Record<string, Result> => (on ? evaluate(g) : {}));

/**
 * Tests the open graph and, when every check passes, starts arithmetic.
 *
 * Returns:
 *     The check results; it runs when all passed.
 */
export function startArithmetic(): CheckResult[] {
	const results = runChecks(augmentation('arithmetic')!, get(graph));
	if (allPass(results)) arithmeticOn.set(true);
	return results;
}

/** Stops arithmetic: the results disappear; the graph is as it was. */
export function stopArithmetic(): void {
	arithmeticOn.set(false);
}
