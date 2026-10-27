// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// ascii.spec.ts -- checks the text drawing of graphs: boxes, links with their line style and
// end mark in both directions, lanes for cycles, UML compartments with static / abstract
// styles, groups, and that the editor's own graphs draw every node.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { graphToAscii, asciiText, wrap, type AsciiArt } from './ascii';
import type { Graph, GraphNode, Link } from './types';
import startGraph from '../../../static/data/test-node-graph.json';
import shapesUml from '../../../static/data/examples/shapes-uml.json';

const ports = [
	{ id: 'i1', kind: 'in' as const, type: 'basic', label: 'Input' },
	{ id: 'o1', kind: 'out' as const, type: 'basic', label: 'Output' }
];
const basic = (id: string, x: number, y: number, name: string): GraphNode => ({
	id, type: 'basic', typeVersion: 2, position: { x, y }, ports, content: { name, color: null, shape: 'square' }
});
const link = (id: string, from: string, to: string, more: Partial<Link> = {}): Link => ({
	id, type: 'basic', shape: 'spline', arrow: 'forward', line: 'solid', mark: 'arrow', route: 'above',
	source: { node: from, port: 'o1' }, target: { node: to, port: 'i1' }, ...more
});
const graph = (nodes: GraphNode[], links: Link[], direction: 'left-to-right' | 'top-to-bottom' = 'left-to-right'): Graph => ({
	metadata: { format: 'imge-graph', version: 7, direction }, data: { nodes, links }
});
const text = (art: AsciiArt) => asciiText(art);
const cellsWith = (art: AsciiArt, test: (cls: string) => boolean) => art.cells.flat().filter((c) => c.cls && test(c.cls));

describe('text drawing', () => {
	it('draws a node as a box with its name, an empty graph as nothing', () => {
		expect(text(graphToAscii(graph([basic('n1', 0, 0, 'Hello')], [])))).toBe(['┌───────┐', '│ Hello │', '└───────┘'].join('\n'));
		expect(graphToAscii(graph([], []))).toEqual({ width: 0, height: 0, cells: [] });
	});

	it('wraps long names', () => {
		expect(wrap('Copy / paste (Ctrl+C, V) at the mouse', 22)).toEqual(['Copy / paste (Ctrl+C,', 'V) at the mouse']);
	});

	it('links left to right with a solid line and an arrowhead into the target', () => {
		const art = graphToAscii(graph([basic('n1', 0, 0, 'A'), basic('n2', 200, 0, 'B')], [link('l1', 'n1', 'n2')]));
		const middle = text(art).split('\n')[1];
		expect(middle).toMatch(/│ A ├─+▶│ B │/);
	});

	it('uses the line style and mark, and puts a backward mark at the source', () => {
		const dashed = text(graphToAscii(graph([basic('n1', 0, 0, 'A'), basic('n2', 200, 0, 'B')], [link('l1', 'n1', 'n2', { line: 'dashed', mark: 'triangle' })])));
		expect(dashed.split('\n')[1]).toMatch(/├╌+▷│/);
		const back = text(graphToAscii(graph([basic('n1', 0, 0, 'A'), basic('n2', 200, 0, 'B')], [link('l1', 'n1', 'n2', { arrow: 'backward', mark: 'diamond' })])));
		expect(back.split('\n')[1]).toMatch(/│ A │◇─+┤ B │/); // no junction where the mark sits
	});

	it('draws top-to-bottom links downwards, the mark pointing into the box below', () => {
		const art = graphToAscii(graph([basic('n1', 0, 0, 'A'), basic('n2', 0, -200, 'B')], [link('l1', 'n1', 'n2', { mark: 'open-arrow' })], 'top-to-bottom'));
		const rows = text(art).split('\n');
		expect(rows[2]).toBe('└─┬─┘');
		expect(rows[rows.length - 4]).toBe('  v');
		expect(rows[rows.length - 3]).toBe('┌───┐');
	});

	it('routes a link that closes a cycle along a lane above the boxes', () => {
		const art = graphToAscii(graph([basic('n1', 0, 0, 'A'), basic('n2', 200, 0, 'B')], [link('l1', 'n1', 'n2'), link('l2', 'n2', 'n1')]));
		const rows = text(art).split('\n');
		expect(rows[0]).toMatch(/┌─+┐/); // the lane, over both boxes
		expect(rows.join('\n')).toContain('▶│ A');
	});

	it('writes a link name above the line', () => {
		const rows = text(graphToAscii(graph([basic('n1', 0, 0, 'A'), basic('n2', 240, 0, 'B')], [link('l1', 'n1', 'n2', { name: 'uses' })]))).split('\n');
		expect(rows[0]).toContain('uses');
	});

	it('draws UML classes in compartments, static members underlined, abstract ones in italics, without the markers', () => {
		const art = graphToAscii(shapesUml as unknown as Graph);
		const all = text(art);
		expect(all).toContain('├──');
		expect(all).not.toContain('{static}');
		expect(all).not.toContain('{abstract}');
		const underlined = cellsWith(art, (c) => c.includes('ascii-u')).map((c) => c.ch).join('');
		expect(underlined).toContain('count');
		const italic = cellsWith(art, (c) => c.includes('ascii-i')).map((c) => c.ch).join('');
		expect(italic).toContain('Shape'); // the abstract class name
		expect(italic).toContain('area');
		for (const mark of ['△', '◇', 'v']) expect(all).toContain(mark); // top-to-bottom: marks point up / down
		expect(all).toContain('╎'); // dashed lines (realization, dependency)
	});

	it('draws a group as a frame around its children with its name in the top edge', () => {
		const group: GraphNode = {
			id: 'n3', type: 'group', typeVersion: 3, position: { x: -40, y: 40 }, ports: [],
			content: { name: 'Frame', color: null, children: ['n1'], shape: 'square' }
		};
		const rows = text(graphToAscii(graph([basic('n1', 0, 0, 'A'), group], []))).split('\n');
		expect(rows[0]).toMatch(/^┌─ Frame ─*┐$/);
		expect(rows.some((r) => /│ +│ A │ +│/.test(r))).toBe(true);
	});

	it('the start graph and the UML example draw every node with its name', () => {
		for (const g of [startGraph, shapesUml] as unknown as Graph[]) {
			const art = graphToAscii(g);
			const names = g.data.nodes.filter((n) => n.type !== 'group').map((n) => String(n.content.name).split(' ')[0]);
			const all = text(art);
			for (const name of names) expect(all, name).toContain(name);
		}
	});
});
