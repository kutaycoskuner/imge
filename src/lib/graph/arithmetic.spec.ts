// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// arithmetic.spec.ts -- checks the arithmetic augmentation: reading nodes by name (numbers,
// operators in their spellings, =), the input order (left to right, then top to bottom),
// the results and their errors (÷ 0, too few inputs, cycles), and the checks a graph must
// pass (augmentations.ts), including the arithmetic test example.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { roleOf, inputsOf, apply, evaluate, formatValue, cycleNodes, type Result } from './arithmetic';
import { augmentation, runChecks, allPass } from './augmentations';
import { migrateGraph } from './migrations';
import type { Graph, GraphNode, Link } from './types';
import example from '../../../static/data/examples/arithmetic-test.json';

const node = (id: string, name: string, x = 0, y = 0, type = 'basic'): GraphNode => ({ id, type, typeVersion: 2, position: { x, y }, ports: [], content: { name } });
const link = (a: string, b: string): Link =>
	({ id: `${a}-${b}`, type: 'basic', shape: 'line', arrow: 'forward', line: 'solid', mark: 'arrow', route: 'above', source: { node: a, port: 'o1' }, target: { node: b, port: 'i1' } }) as Link;
const G = (nodes: GraphNode[], links: Link[]): Graph => ({ metadata: { format: 'imge-graph', version: 7, direction: 'left-to-right' }, data: { nodes, links } });
const value = (r: Result) => (r.ok ? r.value : NaN);

describe('reading nodes by name', () => {
	it('reads numbers, operators in their spellings, and =', () => {
		expect(roleOf(node('a', '3'))).toEqual({ kind: 'number', value: 3 });
		expect(roleOf(node('a', ' -2.5 '))).toEqual({ kind: 'number', value: -2.5 });
		expect(roleOf(node('a', '1,5'))).toEqual({ kind: 'number', value: 1.5 });
		expect(roleOf(node('a', '−4'))).toEqual({ kind: 'number', value: -4 });
		expect(roleOf(node('a', '-'))).toEqual({ kind: 'operator', op: '−' });
		expect(roleOf(node('a', '*'))).toEqual({ kind: 'operator', op: '×' });
		expect(roleOf(node('a', '/'))).toEqual({ kind: 'operator', op: '÷' });
		expect(roleOf(node('a', '='))).toEqual({ kind: 'output' });
		expect(roleOf(node('a', 'three'))).toEqual({ kind: 'other' });
		expect(roleOf(node('a', '3 + 4'))).toEqual({ kind: 'other' });
	});
});

describe('calculating', () => {
	it('takes inputs left to right, then top to bottom', () => {
		const g = G([node('m', '−', 300, 0), node('b', '3', 0, 0), node('a', '10', -100, 0), node('c', '1', -100, -100)], [link('b', 'm'), link('c', 'm'), link('a', 'm')]);
		expect(inputsOf(g, 'm').map((n) => n.id)).toEqual(['a', 'c', 'b']); // a and c share x: a is higher
		expect(value(evaluate(g).m)).toBe(10 - 1 - 3);
	});
	it('applies the operators; ÷ 0 and too few inputs are errors', () => {
		expect(apply('+', [1, 2, 3])).toEqual({ ok: true, value: 6 });
		expect(apply('×', [2, 3, 4])).toEqual({ ok: true, value: 24 });
		expect(apply('÷', [1, 0])).toEqual({ ok: false, error: 'division by 0' });
		expect(apply('+', [1])).toMatchObject({ ok: false });
	});
	it('follows the links back to the numbers; an output shows its input', () => {
		const g = G(
			[node('a', '2', 0, 0), node('b', '5', 0, -100), node('p', '+', 300, 0), node('c', '4', 300, -200), node('t', '×', 600, 0), node('o', '=', 900, 0)],
			[link('a', 'p'), link('b', 'p'), link('p', 't'), link('c', 't'), link('t', 'o')]
		);
		const r = evaluate(g);
		expect(value(r.p)).toBe(7);
		expect(value(r.t)).toBe(28);
		expect(value(r.o)).toBe(28);
	});
	it('passes errors on and marks cycles', () => {
		const g = G([node('a', '1', 0, 0), node('z', '0', 0, -100), node('d', '÷', 300, 0), node('o', '=', 600, 0)], [link('a', 'd'), link('z', 'd'), link('d', 'o')]);
		expect(evaluate(g).o).toEqual({ ok: false, error: 'division by 0' });
		const loop = G([node('p', '+', 0, 0), node('q', '+', 300, 0)], [link('p', 'q'), link('q', 'p')]);
		expect(cycleNodes(loop).sort()).toEqual(['p', 'q']);
		expect(evaluate(loop).p).toMatchObject({ ok: false });
	});
	it('formats values short', () => {
		expect(formatValue(28)).toBe('28');
		expect(formatValue(1 / 3)).toBe('0.333333');
		expect(formatValue(3.5)).toBe('3.5');
	});
});

describe('checks before arithmetic runs', () => {
	const arithmetic = augmentation('arithmetic')!;
	const failed = (g: Graph) => runChecks(arithmetic, g).filter((r) => !r.ok).map((r) => r.id);

	it('passes the arithmetic test example, which comes to 28 and 3.5', () => {
		const g = migrateGraph(example).graph;
		expect(failed(g)).toEqual([]);
		const r = evaluate(g);
		const outs = g.data.nodes.filter((n) => n.content.name === '=').map((n) => value(r[n.id]));
		expect(outs.sort((a, b) => a - b)).toEqual([3.5, 28]);
	});
	it('refuses with reasons, naming the nodes', () => {
		expect(failed(G([node('a', '3'), node('t', 'x', 0, 0, 'text')], []))).toContain('basic');
		const unread = runChecks(arithmetic, G([node('a', 'hello'), node('o', '=')], [link('a', 'o')]));
		expect(unread.find((r) => r.id === 'names')).toMatchObject({ ok: false, detail: 'can\'t read: "hello"' });
		expect(failed(G([node('a', '3'), node('b', '4'), node('o', '=')], [link('a', 'b'), link('b', 'o')]))).toContain('numbers');
		expect(failed(G([node('a', '3'), node('p', '+'), node('o', '=')], [link('a', 'p'), link('p', 'o')]))).toContain('operators');
		expect(failed(G([node('a', '3')], []))).toContain('outputs');
		expect(failed(G([node('p', '+'), node('q', '+'), node('o', '=')], [link('p', 'q'), link('q', 'p'), link('q', 'o')]))).toContain('cycles');
	});
	it('passes a graph only when every check does', () => {
		const ok = G([node('a', '1', 0, 0), node('b', '2', 0, -100), node('p', '+', 300, 0), node('o', '=', 600, 0)], [link('a', 'p'), link('b', 'p'), link('p', 'o')]);
		expect(allPass(runChecks(arithmetic, ok))).toBe(true);
	});
});
