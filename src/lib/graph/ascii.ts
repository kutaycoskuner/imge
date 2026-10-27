// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// ascii.ts -- draws a graph as text with box-drawing characters (the editor's experimental
// text view, and "Copy text" / "Download .txt" there). Pure: graph in, a grid of characters
// out, so it runs anywhere (tests, later a terminal tool).
//
// How it works:
//   1. Boxes: every node becomes a box of characters sized by its text (basic: its name,
//      wrapped at NAME_WRAP; UML class: name, attributes, methods with separator lines;
//      circle shapes get rounded corners). It is placed at its world position scaled to
//      character cells (COL_PX / ROW_PX world units per column / row); a box that would
//      overlap one placed before it moves down until it is free; a link reading forward gets
//      at least 3 free cells between its boxes (the target moves along).
//   2. Groups: a frame around their children's boxes (deepest first), the name in the top
//      edge; an empty group keeps its own size.
//   3. Links: right angles from the source port's side to the target port's side, like the
//      canvas's manhattan shape, its vertical piece where it crosses no box and no other
//      link's line if possible; a link that can't go forward (cycle, self-loop, target
//      beside or behind) takes a lane between or around the boxes (link.route). Lines are
//      kept as connection bits per cell (N E S W), so corners, junctions and crossings
//      become the right character; dashed / dotted lines (link.line) use dashed characters.
//      The end mark (link.mark) sits at the end(s) link.arrow names: ▶ > ▷ ◇ ◆ turned to
//      the box, with a junction (├ ┤ ┬ ┴) on box edges where no mark sits. A link's name
//      goes above (else below) its longest horizontal piece, where no box is.
//   4. Text styles: every cell can carry CSS classes (UML highlighting `uml-*`, `ascii-u`
//      underlined for {static}, `ascii-i` italic for abstract, `ascii-b` bold) and an owner
//      (`node:<id>` / `link:<id>`), so the view can colour, underline and select; plain text
//      (asciiText) has the characters only.
// Top-to-bottom graphs are routed in a "flow space" with columns and rows swapped, as the
// canvas does (GraphLinks.svelte).
//
// Used by: components/GraphTextView.svelte. Details: docs/graph-text-view.md
// -----------------------------------------------------------------------------------------

import type { Graph, GraphNode, Link, LinkArrow, LinkLine, LinkMark } from './types';
import { nodeLabel, nodeName, nodeColor, nodeShape, portSide, umlMembers, umlAbstract, groupSize } from './node-types';
import { groupChildren } from './groups';
import { parseAttribute, parseMethod, drawnTokens, type UmlLine } from './uml';

/** World units per text column and per text row (a default node is ~ 24 columns wide). */
export const COL_PX = 8;
export const ROW_PX = 20;
/** Basic node names wrap at this many characters. */
const NAME_WRAP = 22;

export interface AsciiCell {
	ch: string;
	cls?: string; // CSS classes, space separated
	owner?: string; // "node:<id>" or "link:<id>": what a click on it selects
	color?: string; // a node's own colour ("#rrggbb")
}

export interface AsciiArt {
	width: number;
	height: number;
	cells: AsciiCell[][]; // [row][column]
}

// ---- line characters --------------------------------------------------------------------
const N = 1;
const E = 2;
const S = 4;
const W = 8;
type Dir = typeof N | typeof E | typeof S | typeof W;
const OPPOSITE: Record<number, Dir> = { [N]: S, [E]: W, [S]: N, [W]: E };

// connection bits -> character; lines that only run one way use the link's line style
const JOIN: Record<number, string> = {
	[N | S]: '│', [E | W]: '─', [E | S]: '┌', [S | W]: '┐', [N | E]: '└', [N | W]: '┘',
	[N | E | S]: '├', [N | S | W]: '┤', [E | S | W]: '┬', [N | E | W]: '┴', [N | E | S | W]: '┼'
};
const ROUND: Record<number, string> = { [E | S]: '╭', [S | W]: '╮', [N | E]: '╰', [N | W]: '╯' };
const STRAIGHT: Record<LinkLine, { h: string; v: string }> = {
	solid: { h: '─', v: '│' },
	dashed: { h: '╌', v: '╎' },
	dotted: { h: '┄', v: '┆' }
};
// end marks, by the direction they point (into the box at that end)
const MARK_CHARS: Record<LinkMark, Record<number, string>> = {
	arrow: { [E]: '▶', [W]: '◀', [S]: '▼', [N]: '▲' },
	'open-arrow': { [E]: '>', [W]: '<', [S]: 'v', [N]: '^' },
	triangle: { [E]: '▷', [W]: '◁', [S]: '▽', [N]: '△' },
	diamond: { [E]: '◇', [W]: '◇', [S]: '◇', [N]: '◇' },
	'filled-diamond': { [E]: '◆', [W]: '◆', [S]: '◆', [N]: '◆' }
};

// ---- boxes ------------------------------------------------------------------------------
type Text = { ch: string; cls?: string }[];
interface Box {
	id: string;
	col: number;
	row: number;
	w: number; // outer size, borders included
	h: number;
	rows: (Text | 'sep')[]; // the h - 2 rows inside; 'sep' = a separator line (UML)
	round: boolean;
	color: string | null;
	group: boolean;
}

const chars = (text: string, cls?: string): Text => Array.from(text).map((ch) => ({ ch, cls }));
const length = (text: string) => Array.from(text).length;

/** Splits text into lines of at most `width` characters, at spaces where it can. */
export function wrap(text: string, width: number): string[] {
	const lines: string[] = [];
	let line = '';
	for (let word of text.split(/\s+/).filter(Boolean)) {
		while (length(word) > width) {
			if (line) lines.push(line), (line = '');
			lines.push(Array.from(word).slice(0, width).join(''));
			word = Array.from(word).slice(width).join('');
		}
		if (!word) continue;
		if (line && length(line) + 1 + length(word) > width) lines.push(line), (line = '');
		line = line ? `${line} ${word}` : word;
	}
	if (line || !lines.length) lines.push(line);
	return lines;
}

function centered(text: Text, inner: number): Text {
	const left = Math.floor((inner - text.length) / 2);
	return [...chars(' '.repeat(left)), ...text, ...chars(' '.repeat(inner - left - text.length))];
}

function leftAligned(text: Text, inner: number): Text {
	return [...chars(' '), ...text, ...chars(' '.repeat(Math.max(0, inner - 1 - text.length)))];
}

// one UML member line: its highlighted tokens (without markers), underlined / italic by them
function umlLine(line: UmlLine): Text {
	const style = [line.static && !line.error ? 'ascii-u' : '', line.abstract && !line.error ? 'ascii-i' : '', line.error ? 'ascii-err' : '']
		.filter(Boolean)
		.join(' ');
	const tokens = line.error ? line.tokens : drawnTokens(line);
	return tokens.flatMap((t) => chars(t.text, [`uml-${t.kind}`, style].filter(Boolean).join(' ')));
}

function nodeBox(node: GraphNode, col: number, row: number): Box {
	const base = { id: node.id, col, row, round: nodeShape(node) === 'circle', color: nodeColor(node), group: false };
	if (node.type === 'uml-class') {
		const name = chars(nodeName(node) || 'Class', umlAbstract(node) ? 'ascii-b ascii-i' : 'ascii-b');
		const attributes = umlMembers(node, 'attributes').map((l) => umlLine(parseAttribute(l)));
		const methods = umlMembers(node, 'methods').map((l) => umlLine(parseMethod(l)));
		const inner = Math.max(10, name.length + 2, ...[...attributes, ...methods].map((t) => t.length + 2));
		const block = (lines: Text[]) => (lines.length ? lines : [[]]).map((t) => leftAligned(t, inner));
		const rows = [centered(name, inner), 'sep' as const, ...block(attributes), 'sep' as const, ...block(methods)];
		return { ...base, round: false, w: inner + 2, h: rows.length + 2, rows };
	}
	const lines = wrap(nodeLabel(node), NAME_WRAP);
	const inner = Math.max(...lines.map(length)) + 2;
	return { ...base, w: inner + 2, h: lines.length + 2, rows: lines.map((l) => centered(chars(l), inner)) };
}

const overlaps = (a: Box, b: Box, gapCols: number, gapRows: number) =>
	a.col < b.col + b.w + gapCols && b.col < a.col + a.w + gapCols && a.row < b.row + b.h + gapRows && b.row < a.row + a.h + gapRows;

// ---- the drawing surface: sparse cells keyed "row,col" --------------------------------------
class Surface {
	bits = new Map<string, number>();
	line = new Map<string, LinkLine>();
	round = new Set<string>();
	text = new Map<string, AsciiCell>();
	owner = new Map<string, string>();
	color = new Map<string, string>();
	inBox = new Set<string>(); // cells inside or on a node box (labels and marks stay out)

	lineAt(r: number, c: number, bits: number, style: LinkLine, owner?: string, color?: string | null): void {
		const k = `${r},${c}`;
		this.bits.set(k, (this.bits.get(k) ?? 0) | bits);
		if (style !== 'solid' || !this.line.has(k)) this.line.set(k, style);
		if (owner) this.owner.set(k, owner);
		if (color) this.color.set(k, color);
	}
	border(r: number, c: number, bits: number, owner: string, color: string | null, round = false): void {
		const k = `${r},${c}`;
		this.bits.set(k, bits);
		this.line.set(k, 'solid');
		this.text.delete(k);
		this.owner.set(k, owner);
		if (color) this.color.set(k, color);
		else this.color.delete(k);
		if (round) this.round.add(k);
	}
	put(r: number, c: number, cell: AsciiCell): void {
		const k = `${r},${c}`;
		this.bits.delete(k);
		this.text.set(k, cell);
	}
	cell(k: string): AsciiCell | null {
		const text = this.text.get(k);
		if (text) return text;
		const bits = this.bits.get(k);
		if (!bits) return null;
		const style = STRAIGHT[this.line.get(k) ?? 'solid'];
		const ch =
			bits === E || bits === W || bits === (E | W) ? style.h
			: bits === N || bits === S || bits === (N | S) ? style.v
			: (this.round.has(k) && ROUND[bits]) || JOIN[bits];
		return { ch, owner: this.owner.get(k), color: this.color.get(k) };
	}
}

interface Point {
	c: number;
	r: number;
}

/**
 * Draws the graph as a grid of characters.
 *
 * Args:
 *     g: the graph (any node types; unknown types are drawn as boxes with their label).
 *     options.arrowOverride: the editor's display override for arrows (null = each link's own).
 *
 * Returns:
 *     The grid, [row][column], trimmed to what is drawn; 0 x 0 for an empty graph.
 */
export function graphToAscii(g: Graph, options: { arrowOverride?: LinkArrow | null } = {}): AsciiArt {
	const nodes = g.data.nodes;
	if (!nodes.length) return { width: 0, height: 0, cells: [] };
	const swap = g.metadata.direction === 'top-to-bottom';
	// boxes keep a gap; more of it along the reading direction, where links run between them
	const gapCols = swap ? 2 : 4;
	const gapRows = swap ? 3 : 1;
	const minX = Math.min(...nodes.map((n) => n.position.x));
	const maxY = Math.max(...nodes.map((n) => n.position.y));
	const at = (n: GraphNode) => ({ col: Math.round((n.position.x - minX) / COL_PX), row: Math.round((maxY - n.position.y) / ROW_PX) });

	// 1. node boxes, top to bottom, each moved down past the boxes placed before it
	const boxes = new Map<string, Box>();
	const placed: Box[] = [];
	const plain = nodes.filter((n) => n.type !== 'group').map((n) => nodeBox(n, at(n).col, at(n).row));
	plain.sort((a, b) => a.row - b.row || a.col - b.col);
	for (const box of plain) {
		while (placed.some((p) => overlaps(box, p, gapCols, gapRows))) box.row++;
		placed.push(box);
		boxes.set(box.id, box);
	}
	// a link that reads forward (its target further along the reading direction) needs room
	// for its line and mark: its target box moves along until there are 3 free cells, then
	// boxes are kept apart again; a few rounds settle chains of links
	const flowStart = (b: Box) => (swap ? b.row : b.col);
	const flowEnd = (b: Box) => (swap ? b.row + b.h : b.col + b.w);
	const ahead = (a: GraphNode, b: GraphNode) => (swap ? b.position.y < a.position.y : b.position.x > a.position.x);
	for (let round = 0; round < 8; round++) {
		let moved = false;
		for (const link of g.data.links) {
			const a = nodes.find((n) => n.id === link.source.node);
			const b = nodes.find((n) => n.id === link.target.node);
			const from = a && boxes.get(a.id);
			const to = b && boxes.get(b.id);
			if (!a || !b || !from || !to || from === to || !ahead(a, b)) continue;
			const need = flowEnd(from) + 3 - flowStart(to);
			if (need <= 0) continue;
			if (swap) to.row += need;
			else to.col += need;
			moved = true;
		}
		if (!moved) break;
		placed.sort((a, b) => a.row - b.row || a.col - b.col);
		placed.forEach((box, i) => {
			while (placed.slice(0, i).some((p) => overlaps(box, p, gapCols, gapRows))) box.row++;
		});
	}

	// 2. groups around their children, deepest first (a group's child may be a group)
	const groups = nodes.filter((n) => n.type === 'group');
	const depth = (n: GraphNode, seen = new Set<string>()): number => {
		const parent = groups.find((p) => !seen.has(p.id) && groupChildren(g, p).includes(n.id));
		return parent ? 1 + depth(parent, seen.add(n.id)) : 0;
	};
	for (const group of [...groups].sort((a, b) => depth(b) - depth(a))) {
		const inside = groupChildren(g, group).map((id) => boxes.get(id)).filter((b): b is Box => !!b);
		const name = nodeName(group);
		let box: Box;
		const base = { id: group.id, rows: [], round: nodeShape(group) === 'circle', color: nodeColor(group), group: true };
		if (inside.length) {
			const left = Math.min(...inside.map((b) => b.col)) - 3;
			const top = Math.min(...inside.map((b) => b.row)) - 2;
			const right = Math.max(...inside.map((b) => b.col + b.w)) + 3;
			const bottom = Math.max(...inside.map((b) => b.row + b.h)) + 1;
			box = { ...base, col: left, row: top, w: Math.max(right - left, length(name) + 6), h: bottom - top + 1 };
		} else {
			const size = groupSize(group);
			box = { ...base, ...at(group), w: Math.max(Math.round(size.w / COL_PX), length(name) + 6), h: Math.round(size.h / ROW_PX) };
		}
		boxes.set(group.id, box);
	}

	const s = new Surface();
	const toReal = (d: Dir): Dir => (!swap ? d : d === E ? S : d === S ? E : d === W ? N : W);
	const real = (p: Point): Point => (swap ? { c: p.r, r: p.c } : p);
	const flowBox = (b: Box) => (swap ? { col: b.row, row: b.col, w: b.h, h: b.w } : { col: b.col, row: b.row, w: b.w, h: b.h });

	// group frames first: links crossing them join their lines
	for (const id of [...groups].sort((a, b) => depth(a) - depth(b)).map((n) => n.id)) {
		const b = boxes.get(id)!;
		const owner = `node:${id}`;
		for (let c = b.col; c < b.col + b.w; c++) {
			s.lineAt(b.row, c, (c > b.col ? W : 0) | (c < b.col + b.w - 1 ? E : 0), 'solid', owner, b.color);
			s.lineAt(b.row + b.h - 1, c, (c > b.col ? W : 0) | (c < b.col + b.w - 1 ? E : 0), 'solid', owner, b.color);
		}
		for (let r = b.row; r < b.row + b.h; r++) {
			s.lineAt(r, b.col, (r > b.row ? N : 0) | (r < b.row + b.h - 1 ? S : 0), 'solid', owner, b.color);
			s.lineAt(r, b.col + b.w - 1, (r > b.row ? N : 0) | (r < b.row + b.h - 1 ? S : 0), 'solid', owner, b.color);
		}
		if (b.round) [`${b.row},${b.col}`, `${b.row},${b.col + b.w - 1}`, `${b.row + b.h - 1},${b.col}`, `${b.row + b.h - 1},${b.col + b.w - 1}`].forEach((k) => s.round.add(k));
	}

	// 3. links: right-angled routes in flow space, drawn in real space
	const attach = new Map<string, number>(); // box border cells a link enters / leaves, with its side
	const marks: { p: Point; ch: string; owner: string }[] = [];
	const labels: { r: number; c: number; text: string; owner: string }[] = [];
	let above = 0;
	let below = 0;
	// node boxes in flow space, for routes to steer around; vertical cells (flow space) used by
	// links so far, by source port (links from the same port may share their trunk)
	const solid = placed.map((b) => ({ id: b.id, ...flowBox(b) }));
	const usedVertical = new Map<string, string>();
	// how many boxes (other than the link's own two) a straight piece runs through
	const crossings = (p: Point, q: Point, skip: string[]): number =>
		solid.filter(
			(b) =>
				!skip.includes(b.id) &&
				Math.max(p.c, q.c) >= b.col && Math.min(p.c, q.c) <= b.col + b.w - 1 &&
				Math.max(p.r, q.r) >= b.row && Math.min(p.r, q.r) <= b.row + b.h - 1
		).length;

	const portPoint = (node: GraphNode, box: Box, portId: string, side: 'start' | 'end'): Point => {
		const f = flowBox(box);
		const ports = node.ports.filter((p) => portSide(p) === side);
		const i = Math.max(0, ports.findIndex((p) => p.id === portId));
		const r = f.row + Math.min(f.h - 2, Math.max(1, Math.round(((i + 1) * (f.h - 1)) / (ports.length + 1))));
		return side === 'end' ? { c: f.col + f.w, r } : { c: f.col - 1, r };
	};

	for (const link of g.data.links) {
		const from = nodes.find((n) => n.id === link.source.node);
		const to = nodes.find((n) => n.id === link.target.node);
		const fromBox = from && boxes.get(from.id);
		const toBox = to && boxes.get(to.id);
		if (!from || !to || !fromBox || !toBox || fromBox.group || toBox.group) continue;
		const a = portPoint(from, fromBox, link.source.port, 'end');
		const b = portPoint(to, toBox, link.target.port, 'start');
		const fa = flowBox(fromBox);
		const fb = flowBox(toBox);
		let pts: Point[];
		const own = [from.id, to.id];
		const trunk = `${from.id}:${link.source.port}`;
		if (b.c - a.c >= 2) {
			// the column of the vertical piece: through no box if possible, then not along
			// another link's vertical line, then as close to the link's bend as possible
			const wanted = a.c + Math.round(Math.min(1, Math.max(0, link.bend ?? 0.5)) * (b.c - a.c));
			let mid = wanted;
			let best = Infinity;
			for (let c = a.c + 1; c <= b.c - 1; c++) {
				let shared = 0;
				for (let r = Math.min(a.r, b.r) + 1; r < Math.max(a.r, b.r); r++) {
					const user = usedVertical.get(`${r},${c}`);
					if (user && user !== trunk) shared++;
				}
				const hit = crossings(a, { c, r: a.r }, own) + crossings({ c, r: a.r }, { c, r: b.r }, own) + crossings({ c, r: b.r }, b, own);
				const cost = hit * 1000 + shared * 20 + Math.abs(c - wanted);
				if (cost < best) (best = cost), (mid = c);
			}
			for (let r = Math.min(a.r, b.r) + 1; r < Math.max(a.r, b.r); r++) usedVertical.set(`${r},${mid}`, trunk);
			pts = [a, { c: mid, r: a.r }, { c: mid, r: b.r }, b];
		} else {
			// can't go straight ahead: a lane between the boxes if one is below the other, else
			// around both on the link's route side
			const aBottom = fa.row + fa.h - 1;
			const bBottom = fb.row + fb.h - 1;
			let lane: number;
			if (fb.row > aBottom + 2) lane = Math.floor((aBottom + fb.row) / 2);
			else if (fa.row > bBottom + 2) lane = Math.floor((bBottom + fa.row) / 2);
			else if (link.route === 'below') lane = Math.max(aBottom, bBottom) + 2 + below++;
			else lane = Math.min(fa.row, fb.row) - 2 - above++;
			// further out past any box the lane would run through (like the canvas's lanes)
			const goingDown = lane > a.r;
			for (let tries = 0; tries < 50 && crossings({ c: a.c + 1, r: lane }, { c: b.c - 1, r: lane }, []) > 0; tries++) {
				const hit = solid.filter((x) => crossings({ c: a.c + 1, r: lane }, { c: b.c - 1, r: lane }, solid.filter((y) => y !== x).map((y) => y.id)) > 0);
				lane = goingDown ? Math.max(...hit.map((x) => x.row + x.h)) + 1 : Math.min(...hit.map((x) => x.row)) - 2;
			}
			pts = [a, { c: a.c + 1, r: a.r }, { c: a.c + 1, r: lane }, { c: b.c - 1, r: lane }, { c: b.c - 1, r: b.r }, b];
		}
		const route = pts.map(real);
		const owner = `link:${link.id}`;
		const style: LinkLine = STRAIGHT[link.line] ? link.line : 'solid';
		for (let i = 1; i < route.length; i++) {
			const p = route[i - 1];
			const q = route[i];
			const step = { c: Math.sign(q.c - p.c), r: Math.sign(q.r - p.r) };
			const dir: Dir = step.c > 0 ? E : step.c < 0 ? W : step.r > 0 ? S : N;
			for (let cur = { ...p }; cur.c !== q.c || cur.r !== q.r; ) {
				s.lineAt(cur.r, cur.c, dir, style, owner);
				cur = { c: cur.c + step.c, r: cur.r + step.r };
				s.lineAt(cur.r, cur.c, OPPOSITE[dir], style, owner);
			}
		}
		const arrow = options.arrowOverride ?? link.arrow;
		const markAtTarget = arrow === 'forward' || arrow === 'both';
		const markAtSource = arrow === 'backward' || arrow === 'both';
		// the ends reach into their boxes' borders (a junction there, unless a mark sits at it)
		const start = route[0];
		const end = route[route.length - 1];
		const intoSource = toReal(W);
		const intoTarget = toReal(E);
		s.lineAt(start.r, start.c, intoSource, style, owner);
		s.lineAt(end.r, end.c, intoTarget, style, owner);
		const step = (p: Point, d: Dir): Point => ({ c: p.c + (d === E ? 1 : d === W ? -1 : 0), r: p.r + (d === S ? 1 : d === N ? -1 : 0) });
		const sb = step(start, intoSource);
		const tb = step(end, intoTarget);
		if (!markAtSource) attach.set(`${sb.r},${sb.c}`, (attach.get(`${sb.r},${sb.c}`) ?? 0) | OPPOSITE[intoSource]);
		if (!markAtTarget) attach.set(`${tb.r},${tb.c}`, (attach.get(`${tb.r},${tb.c}`) ?? 0) | OPPOSITE[intoTarget]);

		const mark: LinkMark = MARK_CHARS[link.mark] ? link.mark : 'arrow';
		if (markAtTarget) marks.push({ p: end, ch: MARK_CHARS[mark][intoTarget], owner });
		if (markAtSource) marks.push({ p: start, ch: MARK_CHARS[mark][intoSource], owner });

		if (link.name) {
			// above the longest horizontal piece, else beside the longest vertical one
			let best: { p: Point; q: Point } | null = null;
			let bestLen = -1;
			let horizontal = false;
			for (const want of [true, false]) {
				for (let i = 1; i < route.length; i++) {
					const p = route[i - 1];
					const q = route[i];
					const isH = p.r === q.r && p.c !== q.c;
					const isV = p.c === q.c && p.r !== q.r;
					const len = Math.abs(q.c - p.c) + Math.abs(q.r - p.r);
					if ((want ? isH : isV) && len > bestLen) (best = { p, q }), (bestLen = len), (horizontal = want);
				}
				if (best) break;
			}
			if (best) {
				const midC = Math.round((best.p.c + best.q.c) / 2);
				const midR = Math.round((best.p.r + best.q.r) / 2);
				labels.push(
					horizontal
						? { r: midR - 1, c: midC - Math.floor(length(link.name) / 2), text: link.name, owner }
						: { r: midR, c: midC + 2, text: link.name, owner }
				);
			}
		}
	}

	// 4. node boxes over the lines (lines run behind them), borders joined where links attach
	for (const box of placed) {
		const owner = `node:${box.id}`;
		const { col: c0, row: r0, w, h } = box;
		for (let r = r0; r < r0 + h; r++) for (let c = c0; c < c0 + w; c++) s.inBox.add(`${r},${c}`);
		for (let c = c0; c < c0 + w; c++) {
			const across = (c > c0 ? W : 0) | (c < c0 + w - 1 ? E : 0);
			s.border(r0, c, across | (c === c0 || c === c0 + w - 1 ? S : 0), owner, box.color, box.round);
			s.border(r0 + h - 1, c, across | (c === c0 || c === c0 + w - 1 ? N : 0), owner, box.color, box.round);
		}
		box.rows.forEach((row, i) => {
			const r = r0 + 1 + i;
			if (row === 'sep') {
				s.border(r, c0, N | S | E, owner, box.color);
				for (let c = c0 + 1; c < c0 + w - 1; c++) s.border(r, c, E | W, owner, box.color);
				s.border(r, c0 + w - 1, N | S | W, owner, box.color);
				return;
			}
			s.border(r, c0, N | S, owner, box.color);
			s.border(r, c0 + w - 1, N | S, owner, box.color);
			row.forEach((cell, j) => s.put(r, c0 + 1 + j, { ch: cell.ch, cls: cell.cls, owner, color: cell.cls?.includes('ascii-b') ? (box.color ?? undefined) : undefined }));
		});
		for (let r = r0; r < r0 + h; r++)
			for (const c of [c0, c0 + w - 1]) {
				const k = `${r},${c}`;
				if (attach.has(k)) s.bits.set(k, (s.bits.get(k) ?? 0) | attach.get(k)!);
			}
		for (let c = c0; c < c0 + w; c++)
			for (const r of [r0, r0 + h - 1]) {
				const k = `${r},${c}`;
				if (attach.has(k)) s.bits.set(k, (s.bits.get(k) ?? 0) | attach.get(k)!);
			}
	}

	// group names in their top edges (over the frame line)
	for (const group of groups) {
		const b = boxes.get(group.id)!;
		const name = nodeName(group);
		if (!name) continue;
		Array.from(` ${name} `).forEach((ch, i) =>
			s.put(b.row, b.col + 2 + i, { ch, cls: 'ascii-b', owner: `node:${group.id}`, color: b.color ?? undefined })
		);
	}

	for (const m of marks) if (!s.inBox.has(`${m.p.r},${m.p.c}`)) s.put(m.p.r, m.p.c, { ch: m.ch, cls: 'ascii-mark', owner: m.owner });
	// a name goes above its line, else below it, wherever no box is in the way (else it is left out)
	for (const l of labels) {
		const free = (r: number) => Array.from(l.text).every((_, i) => !s.inBox.has(`${r},${l.c + i}`));
		const r = [l.r, l.r + 2].find(free);
		if (r === undefined) continue;
		Array.from(l.text).forEach((ch, i) => s.put(r, l.c + i, { ch, cls: 'ascii-label', owner: l.owner }));
	}

	// 5. the grid: everything drawn, shifted to start at row 0 / column 0
	const keys = new Set([...s.bits.keys(), ...s.text.keys()]);
	let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
	for (const k of keys) {
		const [r, c] = k.split(',').map(Number);
		if (!s.cell(k)) continue;
		minR = Math.min(minR, r), maxR = Math.max(maxR, r), minC = Math.min(minC, c), maxC = Math.max(maxC, c);
	}
	if (minR === Infinity) return { width: 0, height: 0, cells: [] };
	const width = maxC - minC + 1;
	const height = maxR - minR + 1;
	const cells: AsciiCell[][] = Array.from({ length: height }, (_, r) =>
		Array.from({ length: width }, (_, c) => s.cell(`${r + minR},${c + minC}`) ?? { ch: ' ' })
	);
	return { width, height, cells };
}

/** The drawing as plain text: characters only, trailing spaces trimmed from every row. */
export const asciiText = (art: AsciiArt): string => art.cells.map((row) => row.map((c) => c.ch).join('').trimEnd()).join('\n');

/** Links the drawing leaves out: those that start or end at a group (groups have no ports). */
export const undrawnLinks = (g: Graph): Link[] =>
	g.data.links.filter((l) => [l.source.node, l.target.node].some((id) => g.data.nodes.find((n) => n.id === id)?.type === 'group'));
