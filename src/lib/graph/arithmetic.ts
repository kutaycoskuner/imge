// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// arithmetic.ts -- the arithmetic augmentation (augmentations.ts), pure: a graph of basic
// nodes read by their names as a calculation, without new node types.
//   number    a node named like "3", "-2.5" or "1,5": its value; it takes no inputs
//   operator  a node named +, −, ×, ÷ (also - * x · /): combines its inputs, at least two
//   output    a node named "=": shows the value of its one input
// Links carry the values from the source node to the target. An operator's inputs are taken
// left to right by where their source nodes stand (then top to bottom), so for − and ÷ the
// leftmost is the first: 10 left of 3 into − gives 7. Every operator and output gets a result,
// or an error that says why (÷ 0, a missing input, a value that couldn't be computed).
// The checks (augmentations.ts) refuse graphs that don't read as a calculation, naming the
// nodes; the results are shown beside the nodes while it runs (arithmetic-run.ts).
// Details: docs/graph-augmentations.md
// -----------------------------------------------------------------------------------------

import type { Graph, GraphNode } from './types';

export const OPERATORS = ['+', '−', '×', '÷'] as const;
export type Operator = (typeof OPERATORS)[number];

/** Other ways to write an operator, all read as one of OPERATORS. */
const SPELLINGS: Record<string, Operator> = { '+': '+', '-': '−', '−': '−', '–': '−', '*': '×', '×': '×', x: '×', X: '×', '·': '×', '/': '÷', '÷': '÷', ':': '÷' };

/** What a node is in a calculation. */
export type Role = { kind: 'number'; value: number } | { kind: 'operator'; op: Operator } | { kind: 'output' } | { kind: 'other' };

const nameOf = (node: GraphNode): string => (typeof node.content.name === 'string' ? node.content.name.trim() : '');

/** Reads a node by its name: a number, an operator, an output ("="), or something else. */
export function roleOf(node: GraphNode): Role {
	const name = nameOf(node);
	if (name in SPELLINGS) return { kind: 'operator', op: SPELLINGS[name] };
	if (name === '=') return { kind: 'output' };
	// a number: digits with an optional sign and one decimal point or comma
	if (/^[+\-−]?(\d+([.,]\d+)?|[.,]\d+)$/.test(name)) return { kind: 'number', value: Number(name.replace('−', '-').replace(',', '.')) };
	return { kind: 'other' };
}

/** A node's inputs: the source nodes of the links into it, left to right, then top to bottom. */
export function inputsOf(g: Graph, nodeId: string): GraphNode[] {
	const byId = new Map(g.data.nodes.map((n) => [n.id, n]));
	return g.data.links
		.filter((l) => l.target.node === nodeId)
		.map((l) => byId.get(l.source.node))
		.filter((n): n is GraphNode => !!n)
		.sort((a, b) => a.position.x - b.position.x || b.position.y - a.position.y);
}

/** What an operator or output came to: its value, or why there is none. */
export type Result = { ok: true; value: number } | { ok: false; error: string };

/** Applies an operator to its inputs, in order; ÷ 0 is an error. */
export function apply(op: Operator, values: number[]): Result {
	if (values.length < 2) return { ok: false, error: `needs at least 2 inputs, has ${values.length}` };
	let acc = values[0];
	for (const v of values.slice(1)) {
		if (op === '+') acc += v;
		else if (op === '−') acc -= v;
		else if (op === '×') acc *= v;
		else {
			if (v === 0) return { ok: false, error: 'division by 0' };
			acc /= v;
		}
	}
	return { ok: true, value: acc };
}

/**
 * Computes every operator and output of the graph, each once, following the links back to
 * the numbers. A node inside a cycle, a node that isn't part of a calculation feeding one, or
 * a failed input gives an error instead of a value.
 *
 * Returns:
 *     The result for every operator and output node, by node id.
 */
export function evaluate(g: Graph): Record<string, Result> {
	const results: Record<string, Result> = {};
	const visiting = new Set<string>();
	const byId = new Map(g.data.nodes.map((n) => [n.id, n]));

	function valueOf(node: GraphNode): Result {
		const role = roleOf(node);
		if (role.kind === 'number') return { ok: true, value: role.value };
		if (role.kind === 'other') return { ok: false, error: `"${nameOf(node) || node.id}" isn't a number, operator or =` };
		if (node.id in results) return results[node.id];
		if (visiting.has(node.id)) return { ok: false, error: 'part of a cycle' };
		visiting.add(node.id);
		const inputs = inputsOf(g, node.id).map(valueOf);
		visiting.delete(node.id);
		const failed = inputs.find((r) => !r.ok);
		let result: Result;
		if (role.kind === 'output') {
			result = inputs.length !== 1 ? { ok: false, error: `needs exactly 1 input, has ${inputs.length}` } : inputs[0];
		} else if (failed) {
			result = { ok: false, error: `an input failed: ${(failed as { error: string }).error}` };
		} else {
			result = apply(role.op, inputs.map((r) => (r as { value: number }).value));
		}
		if (role.kind === 'output' && failed && inputs.length === 1) result = { ok: false, error: (failed as { error: string }).error };
		results[node.id] = result;
		return result;
	}

	for (const n of g.data.nodes) {
		const kind = roleOf(n).kind;
		if (kind === 'operator' || kind === 'output') valueOf(byId.get(n.id)!);
	}
	return results;
}

/** A value as short text: whole numbers as they are, others with at most 6 significant digits. */
export function formatValue(v: number): string {
	if (!Number.isFinite(v)) return String(v);
	return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(6)));
}

/** The nodes that take part in a cycle of links (each listed once). */
export function cycleNodes(g: Graph): string[] {
	const next = new Map<string, string[]>();
	for (const l of g.data.links) next.set(l.source.node, [...(next.get(l.source.node) ?? []), l.target.node]);
	const state = new Map<string, 1 | 2>(); // 1 = on the current path, 2 = done
	const inCycle = new Set<string>();
	const path: string[] = [];
	function visit(id: string): void {
		state.set(id, 1);
		path.push(id);
		for (const to of next.get(id) ?? []) {
			if (state.get(to) === 1) for (const p of path.slice(path.indexOf(to))) inCycle.add(p);
			else if (!state.get(to)) visit(to);
		}
		path.pop();
		state.set(id, 2);
	}
	for (const n of g.data.nodes) if (!state.get(n.id)) visit(n.id);
	return [...inCycle];
}
