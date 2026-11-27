// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// augmentations.ts -- logic that runs on a graph and makes it do something (graphs are
// otherwise only drawn), as data: one entry per augmentation, listed in the Augment menu
// (AugmentMenu.svelte, top right). Before an augmentation runs, the open graph is tested
// against the augmentation's checks; only when every check passes can it be started, and
// the menu shows each check with what it found, so a refusal is never silent. Gravity, for
// now, refuses graphs with groups (kept simple: a group's frame wraps its nodes).
// Arithmetic (arithmetic.ts) only takes basic nodes named as numbers, operators and "=".
//
// Adding an augmentation: an entry here (id, title, description, checks) and its runner
// (like gravity-run.ts, started and stopped by the menu); its pure logic in its own module
// (like gravity.ts) with tests.
//
// Used by: AugmentMenu.svelte, gravity-run.ts. Details: docs/graph-augmentations.md
// -----------------------------------------------------------------------------------------

import type { Graph, GraphNode } from './types';
import { takesPart } from './gravity';
import { roleOf, cycleNodes } from './arithmetic';

/** What one check found: passed or not, and in words. */
export interface CheckResult {
	id: string;
	title: string;
	ok: boolean;
	detail: string;
}

/** A test a graph must pass before an augmentation can run on it. */
export interface Check {
	id: string;
	title: string;
	test: (g: Graph) => { ok: boolean; detail: string };
}

export interface Augmentation {
	id: string;
	title: string;
	description: string;
	checks: Check[];
}

/** Most nodes gravity moves: every two bodies push each other, so the work grows with the square of the count. */
export const GRAVITY_MAX_NODES = 400;

const moving = (g: Graph) => g.data.nodes.filter(takesPart);

const GRAVITY_CHECKS: Check[] = [
	{
		// for now: a group's frame wraps the nodes it holds, which gravity would pull apart
		id: 'groups',
		title: 'No groups',
		test: (g) => {
			const groups = g.data.nodes.filter((n) => n.type === 'group');
			const names = groups.map((n) => (typeof n.content.name === 'string' && n.content.name ? n.content.name : n.id));
			return {
				ok: groups.length === 0,
				detail: groups.length ? `${groups.length} ${groups.length === 1 ? 'group' : 'groups'}: ${names.join(', ')} (ungroup with Ctrl+Shift+G, or use a copy)` : 'none'
			};
		}
	},
	{
		id: 'nodes',
		title: 'At least 2 nodes that can move',
		test: (g) => {
			const n = moving(g).length;
			return { ok: n >= 2, detail: `${n} ${n === 1 ? 'node' : 'nodes'} (text nodes stay where they are)` };
		}
	},
	{
		id: 'links',
		title: 'At least 1 link between them',
		test: (g) => {
			const ids = new Set(moving(g).map((n) => n.id));
			const n = g.data.links.filter((l) => ids.has(l.source.node) && ids.has(l.target.node)).length;
			return { ok: n >= 1, detail: n ? `${n} ${n === 1 ? 'link' : 'links'}` : 'no links: nothing would pull' };
		}
	},
	{
		id: 'whole',
		title: 'Every link has both ends',
		test: (g) => {
			const ids = new Set(g.data.nodes.map((n) => n.id));
			const broken = g.data.links.filter((l) => !ids.has(l.source.node) || !ids.has(l.target.node));
			return { ok: broken.length === 0, detail: broken.length ? `${broken.length} broken: ${broken.map((l) => l.id).join(', ')}` : 'all links intact' };
		}
	},
	{
		id: 'size',
		title: `At most ${GRAVITY_MAX_NODES} moving nodes`,
		test: (g) => {
			const n = moving(g).length;
			return { ok: n <= GRAVITY_MAX_NODES, detail: n <= GRAVITY_MAX_NODES ? `${n} of ${GRAVITY_MAX_NODES}` : `${n}: too many to move smoothly` };
		}
	}
];

// a node in a check's detail: its name, or its id when it has none
const called = (n: GraphNode) => (typeof n.content.name === 'string' && n.content.name.trim() ? `"${n.content.name.trim()}"` : n.id);
const listed = (nodes: GraphNode[], max = 5) =>
	nodes.slice(0, max).map(called).join(', ') + (nodes.length > max ? ` and ${nodes.length - max} more` : '');
const linksInto = (g: Graph, id: string) => g.data.links.filter((l) => l.target.node === id).length;

const ARITHMETIC_CHECKS: Check[] = [
	{
		id: 'basic',
		title: 'Only basic nodes',
		test: (g) => {
			const other = g.data.nodes.filter((n) => n.type !== 'basic');
			return { ok: other.length === 0, detail: other.length ? `not basic: ${listed(other)}` : `${g.data.nodes.length} basic nodes` };
		}
	},
	{
		id: 'names',
		title: 'Every node is a number, an operator (+ − × ÷) or =',
		test: (g) => {
			const other = g.data.nodes.filter((n) => n.type === 'basic' && roleOf(n).kind === 'other');
			return { ok: other.length === 0, detail: other.length ? `can't read: ${listed(other)}` : 'all read' };
		}
	},
	{
		id: 'numbers',
		title: 'Numbers take no inputs',
		test: (g) => {
			const fed = g.data.nodes.filter((n) => roleOf(n).kind === 'number' && linksInto(g, n.id) > 0);
			return { ok: fed.length === 0, detail: fed.length ? `with inputs: ${listed(fed)}` : 'none has one' };
		}
	},
	{
		id: 'operators',
		title: 'Every operator has at least 2 inputs',
		test: (g) => {
			const ops = g.data.nodes.filter((n) => roleOf(n).kind === 'operator');
			const short = ops.filter((n) => linksInto(g, n.id) < 2);
			return { ok: short.length === 0, detail: short.length ? `too few: ${listed(short)}` : `${ops.length} ${ops.length === 1 ? 'operator' : 'operators'}` };
		}
	},
	{
		id: 'outputs',
		title: 'At least one =, each with exactly 1 input',
		test: (g) => {
			const outs = g.data.nodes.filter((n) => roleOf(n).kind === 'output');
			const wrong = outs.filter((n) => linksInto(g, n.id) !== 1);
			if (outs.length === 0) return { ok: false, detail: 'no node named "=": nothing to show the result' };
			return { ok: wrong.length === 0, detail: wrong.length ? `not 1 input: ${wrong.map((n) => n.id).join(', ')}` : `${outs.length} ${outs.length === 1 ? 'output' : 'outputs'}` };
		}
	},
	{
		id: 'cycles',
		title: 'No cycles',
		test: (g) => {
			const ids = new Set(cycleNodes(g));
			const nodes = g.data.nodes.filter((n) => ids.has(n.id));
			return { ok: nodes.length === 0, detail: nodes.length ? `in a cycle: ${listed(nodes)}` : 'none' };
		}
	}
];

export const AUGMENTATIONS: Augmentation[] = [
	{
		id: 'gravity',
		title: 'Gravity',
		description:
			'Nodes become dots sized by their number of links and move by themselves: links pull, nodes push apart, a pull to the centre holds them together. Drag a dot and the others follow; stopping it either reverts (every node back where it was) or keeps the new layout (one undo step).',
		checks: GRAVITY_CHECKS
	},
	{
		id: 'arithmetic',
		title: 'Arithmetic',
		description:
			'Reads basic nodes as a calculation: nodes named like 3 or -2.5 are numbers, + − × ÷ operators, = shows a result. Links carry the values; an operator takes its inputs left to right. Each operator and = shows its result beside it, live while you edit; the graph itself doesn\'t change.',
		checks: ARITHMETIC_CHECKS
	}
];

/** The entry for an augmentation id. */
export const augmentation = (id: string): Augmentation | undefined => AUGMENTATIONS.find((a) => a.id === id);

/** Tests a graph against an augmentation's checks: every result, in order. */
export const runChecks = (a: Augmentation, g: Graph): CheckResult[] => a.checks.map((c) => ({ id: c.id, title: c.title, ...c.test(g) }));

/** Whether every check passed. */
export const allPass = (results: CheckResult[]): boolean => results.every((r) => r.ok);
