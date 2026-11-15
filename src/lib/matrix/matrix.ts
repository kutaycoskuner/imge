// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-13
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// matrix.ts -- the matrix calculator's math, without any page code: matrices as number[][]
// (rows of numbers), the size rule and result size of each operation, the result, and the
// terms of one result entry (what the page's expanded view and "selected entry" box show).
// Used by src/routes/matrix_addition/+page.svelte; texts per operation: ./operations.ts.
// Details: docs/matrix-calculator.md

export type Matrix = number[][];
export type OperationId = 'add' | 'multiply' | 'determinant';

/** Matrix sizes on the page: A is i×j, B is m×n. */
export interface Dims {
	i: number;
	j: number;
	m: number;
	n: number;
}

/** One term of a result entry: a value of A at (aRow, aCol), combined with a value of B. */
export interface Term {
	aRow: number;
	aCol: number;
	bRow: number;
	bCol: number;
	a: number;
	b: number;
}

/** Largest number of rows or columns the page allows (keeps the expanded view readable). */
export const MAX_DIM = 6;

/** A size typed into a box as a whole number from 1 to MAX_DIM (empty or invalid → 1). */
export function clampDim(value: unknown): number {
	const v = Math.floor(Number(value));
	return Number.isFinite(v) ? Math.min(MAX_DIM, Math.max(1, v)) : 1;
}

/** A cell value as a number (empty or invalid → 0). */
export function cellValue(value: unknown): number {
	const v = Number(value);
	return Number.isFinite(v) ? v : 0;
}

/** A rows×cols matrix, keeping the values of `prev` where they fit, 0 elsewhere. */
export function resize(rows: number, cols: number, prev: Matrix = []): Matrix {
	return Array.from({ length: rows }, (_, r) =>
		Array.from({ length: cols }, (_, c) => cellValue(prev[r]?.[c]))
	);
}

/** Whether A (i×j) and B (m×n) can be combined by the operation. */
export function canCombine(op: OperationId, d: Dims): boolean {
	if (op === 'add') return d.i === d.m && d.j === d.n;
	if (op === 'multiply') return d.j === d.m;
	return false; // determinant: not yet
}

/** Size of the result C, or null when A and B can't be combined. */
export function resultDims(op: OperationId, d: Dims): { rows: number; cols: number } | null {
	if (!canCombine(op, d)) return null;
	return op === 'add' ? { rows: d.i, cols: d.j } : { rows: d.i, cols: d.n };
}

/** The terms of result entry (r, c): for addition one pair (a_rc, b_rc), for multiplication
 *  row r of A against column c of B (a_r1 b_1c, a_r2 b_2c, ...). */
export function entryTerms(op: OperationId, A: Matrix, B: Matrix, r: number, c: number): Term[] {
	if (op === 'add') {
		return [{ aRow: r, aCol: c, bRow: r, bCol: c, a: cellValue(A[r]?.[c]), b: cellValue(B[r]?.[c]) }];
	}
	const k = A[r]?.length ?? 0;
	return Array.from({ length: k }, (_, x) => ({
		aRow: r,
		aCol: x,
		bRow: x,
		bCol: c,
		a: cellValue(A[r]?.[x]),
		b: cellValue(B[x]?.[c])
	}));
}

/** Value of one result entry from its terms: the sum (addition) or sum of products. */
export function entryValue(op: OperationId, terms: Term[]): number {
	return op === 'add'
		? terms.reduce((s, t) => s + t.a + t.b, 0)
		: terms.reduce((s, t) => s + t.a * t.b, 0);
}

/** The result C = A + B or A · B, or [] when they can't be combined. */
export function combine(op: OperationId, A: Matrix, B: Matrix, d: Dims): Matrix {
	const size = resultDims(op, d);
	if (!size) return [];
	return Array.from({ length: size.rows }, (_, r) =>
		Array.from({ length: size.cols }, (_, c) => entryValue(op, entryTerms(op, A, B, r, c)))
	);
}

/** A number as short text: whole numbers as they are, others with at most 3 decimals. */
export function formatNumber(v: number): string {
	return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
}

/** A number in a written-out term, in brackets when negative: 2 · (−3). */
export function termNumber(v: number): string {
	return v < 0 ? `(${formatNumber(v)})` : formatNumber(v);
}

/** One result entry written out, e.g. "1·4 + 2·5 + 3·6" (multiply) or "1 + 4" (add). */
export function entryText(op: OperationId, terms: Term[]): string {
	return op === 'add'
		? terms.map((t) => `${termNumber(t.a)} + ${termNumber(t.b)}`).join('')
		: terms.map((t) => `${termNumber(t.a)}·${termNumber(t.b)}`).join(' + ');
}
