// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-13
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// ascii.ts -- the matrix calculator's text view: matrices in box-drawing brackets with
// right-aligned columns, the text of A and B to edit (and reading it back), and the whole
// equation side by side (A op B = C) to copy. Like the graph editor's text view
// ($lib/graph/ascii.ts), but the matrices' text can be typed in.
//
// Editable text: A and B side by side, each named on its left; every line with numbers is
// a row, left of the column where "B =" starts for A, from there on for B (brackets, bars
// and extra spaces are ignored). A and B stacked (a line "A =", its rows, a line "B =", its
// rows) is read too.
//       ┌         ┐       ┌            ┐
//   A = │ 1  2  3 │   B = │  7   8   9 │
//       │ 4  5  6 │       │ 10  11  12 │
//       └         ┘       └            ┘
// Used by src/routes/matrix_addition/+page.svelte. Details: docs/matrix-calculator.md

import { MAX_DIM, formatNumber, type Matrix } from './matrix';

/** A matrix in box-drawing brackets, columns right-aligned: one string per line (top, rows,
 *  bottom). Shown with the graph text view's font settings (page), so the lines join. */
export function matrixLines(M: Matrix): string[] {
	const cols = M[0]?.length ?? 0;
	const cells = M.map((row) => row.map(formatNumber));
	const widths = Array.from({ length: cols }, (_, c) => Math.max(1, ...cells.map((row) => row[c].length)));
	const body = cells.map((row) => row.map((v, c) => v.padStart(widths[c])).join('  '));
	const inner = Math.max(1, ...body.map((b) => b.length));
	return [`┌ ${' '.repeat(inner)} ┐`, ...body.map((b) => `│ ${b.padEnd(inner)} │`), `└ ${' '.repeat(inner)} ┘`];
}

/** The editable text of A and B, side by side, each named on its left:
 *        ┌         ┐       ┌            ┐
 *    A = │ 1  2  3 │   B = │  7   8   9 │
 *        │ 4  5  6 │       │ 10  11  12 │
 *        └         ┘       └            ┘ */
export function matricesToText(A: Matrix, B: Matrix): string {
	return equationText(['A =', A, '  ', 'B =', B]);
}

export type ParseResult = { ok: true; A: Matrix; B: Matrix } | { ok: false; error: string };

const BLOCK = /^\s*([AB])\s*=\s*(.*)$/;
const SIDE_BY_SIDE = /\bA\s*=.*?\bB\s*=/;
const NUMBER = /[-−]?\d+(?:[.,]\d+)?/g;

function numbersIn(text: string): number[] | null {
	const found = text.match(NUMBER);
	return found ? found.map((n) => Number(n.replace('−', '-').replace(',', '.'))) : null;
}

/** Reads A and B back from the text; an error names what is wrong (missing block, rows of
 *  different lengths, too large). Two layouts:
 *    side by side  a line with "A = ... B ="; on every line, what stands left of the column
 *                  where "B =" starts is A, the rest is B (as matricesToText writes it)
 *    stacked       a line "A =", its rows, then a line "B =", its rows */
export function parseMatricesText(text: string): ParseResult {
	const rows: Record<'A' | 'B', number[][]> = { A: [], B: [] };
	const seen = new Set<string>();
	const lines = text.split(/\r?\n/);
	const head = lines.findIndex((l) => SIDE_BY_SIDE.test(l));

	if (head >= 0) {
		const split = lines[head].search(/\bB\s*=/);
		seen.add('A').add('B');
		for (const line of lines) {
			const a = numbersIn(line.slice(0, split));
			const b = numbersIn(line.slice(split));
			if (a) rows.A.push(a);
			if (b) rows.B.push(b);
		}
	} else {
		let current: 'A' | 'B' | null = null;
		for (const line of lines) {
			const block = line.match(BLOCK);
			let rest = line;
			if (block) {
				current = block[1] as 'A' | 'B';
				seen.add(current);
				rest = block[2]; // numbers on the same line count as the first row
			}
			const numbers = numbersIn(rest);
			if (!numbers) continue;
			if (!current) return { ok: false, error: 'numbers before "A =": start with a line "A ="' };
			rows[current].push(numbers);
		}
	}

	for (const name of ['A', 'B'] as const) {
		const M = rows[name];
		if (!seen.has(name)) return { ok: false, error: `no line "${name} =" found` };
		if (M.length === 0) return { ok: false, error: `${name} has no rows` };
		const cols = M[0].length;
		const bad = M.findIndex((row) => row.length !== cols);
		if (bad >= 0) return { ok: false, error: `${name}: row ${bad + 1} has ${M[bad].length} values, row 1 has ${cols}` };
		if (M.length > MAX_DIM || cols > MAX_DIM) return { ok: false, error: `${name} is ${M.length}×${cols}; at most ${MAX_DIM}×${MAX_DIM}` };
	}
	return { ok: true, A: rows.A, B: rows.B };
}

/** Matrices and signs side by side, each block vertically centred, the signs on the middle
 *  line, e.g. A + B = C. `parts`: matrices (drawn with matrixLines) and signs (strings). */
export function equationText(parts: (Matrix | string)[]): string {
	const blocks = parts.map((p) => (typeof p === 'string' ? null : matrixLines(p)));
	const height = Math.max(1, ...blocks.map((b) => b?.length ?? 1));
	const middle = Math.floor((height - 1) / 2);
	const lines: string[] = Array.from({ length: height }, () => '');
	parts.forEach((p, k) => {
		const block = blocks[k];
		const width = block ? block[0].length : (p as string).length;
		const top = block ? Math.floor((height - block.length) / 2) : middle;
		for (let y = 0; y < height; y++) {
			const piece = block ? block[y - top] : y === middle ? (p as string) : undefined;
			lines[y] += (k ? ' ' : '') + (piece ?? '').padEnd(width);
		}
	});
	return lines.map((l) => l.trimEnd()).join('\n');
}
