// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// table.ts -- the table node's data (node type "table", node-types.ts): tabular text in
// rows and columns, with styles per row and per column. Pure rules only: reading a node's
// content into a clean table (rectangular, styles as long as the rows / columns), the style
// a cell is drawn with, and the changes the editor makes (a cell's text, adding / removing a
// row or column with its style, a row's or column's style). Each change returns the content
// keys to store (setNodeContent), so one change is one undo step.
//
// Content: cells: string[][] (rows of cells), rowStyles / colStyles: (TableStyle | null)[]
// (one per row / column, null = none). A cell is drawn with its column's style, then its
// row's on top: a row only overrides what it sets, so a bold header row stays bold in every
// column and a right-aligned number column keeps its alignment in other rows. Lines between
// the cells only with content `showLines: true` (optional; without it the table has none).
//
// Used by: node-types.ts (template, label), GraphNode.svelte (drawing, cell editing),
// properties/PropsTable.svelte, ascii.ts (text view). Details: docs/graph-table-and-graph-nodes.md
// -----------------------------------------------------------------------------------------

import type { GraphNode, NodeContent } from './types';

/** How a row or a column draws its cells; every key is optional (missing = not set). */
export interface TableStyle {
	size?: number; // font size, 1 = the node's normal size
	opacity?: number; // 0.1 .. 1
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	align?: TableAlign;
	color?: string | null; // "#rrggbb" or null = the theme's text colour
}

export const TABLE_ALIGNS = ['left', 'center', 'right'] as const;
export type TableAlign = (typeof TABLE_ALIGNS)[number];

/** What a cell is drawn with when neither its row nor its column sets anything. */
export const TABLE_DEFAULT: Required<TableStyle> = { size: 1, opacity: 1, bold: false, italic: false, underline: false, align: 'left', color: null };

/** Limits, so a table stays a node and not a spreadsheet. */
export const TABLE_MAX = { rows: 60, cols: 20 };
export const SIZE_RANGE = { min: 0.5, max: 3 };
export const OPACITY_RANGE = { min: 0.1, max: 1 };

/** A table node's data, clean: every row has `cols` cells; one style slot per row and column. */
export interface Table {
	cells: string[][];
	rowStyles: (TableStyle | null)[];
	colStyles: (TableStyle | null)[];
	rows: number;
	cols: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** A style as stored, with only valid keys (wrong values dropped, numbers kept in range); null when nothing is set. */
export function cleanStyle(raw: unknown): TableStyle | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	const s: TableStyle = {};
	if (typeof r.size === 'number' && Number.isFinite(r.size)) s.size = Math.round(clamp(r.size, SIZE_RANGE.min, SIZE_RANGE.max) * 100) / 100;
	if (typeof r.opacity === 'number' && Number.isFinite(r.opacity)) s.opacity = Math.round(clamp(r.opacity, OPACITY_RANGE.min, OPACITY_RANGE.max) * 100) / 100;
	for (const key of ['bold', 'italic', 'underline'] as const) if (typeof r[key] === 'boolean') s[key] = r[key] as boolean;
	if (typeof r.align === 'string' && (TABLE_ALIGNS as readonly string[]).includes(r.align)) s.align = r.align as TableAlign;
	if (r.color === null || (typeof r.color === 'string' && /^#[0-9a-f]{6}$/i.test(r.color))) s.color = r.color as string | null;
	return Object.keys(s).length ? s : null;
}

/** A node's content as a clean table: missing or odd cells become '', rows padded to the
 *  widest one, a style slot for every row and column (at least 1 × 1). */
export function tableOf(content: NodeContent): Table {
	const rawRows = Array.isArray(content.cells) ? content.cells : [];
	let cells = rawRows.map((row) => (Array.isArray(row) ? row.map((c) => (typeof c === 'string' ? c : c == null ? '' : String(c))) : []));
	if (cells.length === 0) cells = [['']];
	const cols = Math.max(1, ...cells.map((r) => r.length));
	cells = cells.map((r) => [...r, ...Array(cols - r.length).fill('')]);
	const styles = (raw: unknown, n: number) => Array.from({ length: n }, (_, i) => cleanStyle(Array.isArray(raw) ? raw[i] : null));
	return { cells, rowStyles: styles(content.rowStyles, cells.length), colStyles: styles(content.colStyles, cols), rows: cells.length, cols };
}

/** The style a cell is drawn with: the defaults, its column's style, then its row's on top. */
export function cellStyle(t: Table, row: number, col: number): Required<TableStyle> {
	return { ...TABLE_DEFAULT, ...(t.colStyles[col] ?? {}), ...(t.rowStyles[row] ?? {}) };
}

/** The table as content keys to store. */
export const tableContent = (t: Table): NodeContent => ({ cells: t.cells, rowStyles: t.rowStyles, colStyles: t.colStyles });

const rebuild = (cells: string[][], rowStyles: (TableStyle | null)[], colStyles: (TableStyle | null)[]): Table => ({
	cells,
	rowStyles,
	colStyles,
	rows: cells.length,
	cols: cells[0]?.length ?? 0
});

/** The table with one cell's text set. */
export function setCell(t: Table, row: number, col: number, text: string): Table {
	if (row < 0 || row >= t.rows || col < 0 || col >= t.cols) return t;
	return rebuild(t.cells.map((r, i) => (i === row ? r.map((c, j) => (j === col ? text : c)) : r)), t.rowStyles, t.colStyles);
}

/** The table with an empty row inserted at `at` (default: at the end), without a style; unchanged at the limit. */
export function addRow(t: Table, at: number = t.rows): Table {
	if (t.rows >= TABLE_MAX.rows) return t;
	const i = clamp(at, 0, t.rows);
	return rebuild([...t.cells.slice(0, i), Array(t.cols).fill(''), ...t.cells.slice(i)], [...t.rowStyles.slice(0, i), null, ...t.rowStyles.slice(i)], t.colStyles);
}

/** The table without row `row` and its style; the last row stays. */
export function removeRow(t: Table, row: number): Table {
	if (t.rows <= 1 || row < 0 || row >= t.rows) return t;
	return rebuild(t.cells.filter((_, i) => i !== row), t.rowStyles.filter((_, i) => i !== row), t.colStyles);
}

/** The table with an empty column inserted at `at` (default: at the end), without a style. */
export function addColumn(t: Table, at: number = t.cols): Table {
	if (t.cols >= TABLE_MAX.cols) return t;
	const j = clamp(at, 0, t.cols);
	return rebuild(t.cells.map((r) => [...r.slice(0, j), '', ...r.slice(j)]), t.rowStyles, [...t.colStyles.slice(0, j), null, ...t.colStyles.slice(j)]);
}

/** The table without column `col` and its style; the last column stays. */
export function removeColumn(t: Table, col: number): Table {
	if (t.cols <= 1 || col < 0 || col >= t.cols) return t;
	return rebuild(t.cells.map((r) => r.filter((_, j) => j !== col)), t.rowStyles, t.colStyles.filter((_, j) => j !== col));
}

/** The table with a row's or column's style changed: `patch` keys set (undefined = unset), cleaned. */
export function setStyle(t: Table, axis: 'row' | 'col', index: number, patch: Partial<Record<keyof TableStyle, unknown>>): Table {
	const list = axis === 'row' ? t.rowStyles : t.colStyles;
	if (index < 0 || index >= list.length) return t;
	const merged: Record<string, unknown> = { ...(list[index] ?? {}) };
	for (const [k, v] of Object.entries(patch)) {
		if (v === undefined) delete merged[k];
		else merged[k] = v;
	}
	const next = list.map((s, i) => (i === index ? cleanStyle(merged) : s));
	return axis === 'row' ? rebuild(t.cells, next, t.colStyles) : rebuild(t.cells, t.rowStyles, next);
}

/** Whether the table draws lines between its cells: content `showLines`, an optional key
 *  (missing = no lines, a plain table; the template version stays 1). */
export const tableLines = (content: NodeContent): boolean => content.showLines === true;

/** A table node's label in lists: its name, else its first cell, else "Table". */
export function tableLabel(node: GraphNode): string {
	if (typeof node.content.name === 'string' && node.content.name.trim()) return node.content.name;
	const first = tableOf(node.content).cells[0][0].trim();
	return first ? (first.length > 40 ? `${first.slice(0, 39)}…` : first) : 'Table';
}
