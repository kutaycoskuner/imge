// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-13
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// matrix.spec.ts -- checks the matrix calculator's math: size rules, results of addition and
// multiplication, the terms of one entry, resizing and cleaning typed values, and that every
// operation in operations.ts has its texts.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	canCombine,
	resultDims,
	combine,
	entryTerms,
	entryValue,
	entryText,
	resize,
	clampDim,
	cellValue,
	MAX_DIM
} from './matrix';
import { OPERATIONS } from './operations';

const A = [
	[1, 2, 3],
	[4, 5, 6]
]; // 2×3
const B = [
	[7, 8],
	[9, 10],
	[11, 12]
]; // 3×2

describe('size rules', () => {
	it('addition needs the same size', () => {
		expect(canCombine('add', { i: 2, j: 3, m: 2, n: 3 })).toBe(true);
		expect(canCombine('add', { i: 2, j: 3, m: 3, n: 2 })).toBe(false);
	});
	it('multiplication needs A columns = B rows, result i×n', () => {
		expect(canCombine('multiply', { i: 2, j: 3, m: 3, n: 2 })).toBe(true);
		expect(canCombine('multiply', { i: 2, j: 3, m: 2, n: 3 })).toBe(false);
		expect(resultDims('multiply', { i: 2, j: 3, m: 3, n: 4 })).toEqual({ rows: 2, cols: 4 });
	});
	it('determinant is not available yet', () => {
		expect(canCombine('determinant', { i: 2, j: 2, m: 2, n: 2 })).toBe(false);
		expect(resultDims('determinant', { i: 2, j: 2, m: 2, n: 2 })).toBeNull();
	});
});

describe('results', () => {
	it('adds entry by entry', () => {
		expect(combine('add', A, A, { i: 2, j: 3, m: 2, n: 3 })).toEqual([
			[2, 4, 6],
			[8, 10, 12]
		]);
	});
	it('multiplies row by column', () => {
		expect(combine('multiply', A, B, { i: 2, j: 3, m: 3, n: 2 })).toEqual([
			[58, 64],
			[139, 154]
		]);
	});
	it('gives [] when the sizes do not fit', () => {
		expect(combine('add', A, B, { i: 2, j: 3, m: 3, n: 2 })).toEqual([]);
	});
});

describe('one entry', () => {
	it('lists row r of A against column c of B', () => {
		const terms = entryTerms('multiply', A, B, 1, 0);
		expect(terms.map((t) => [t.a, t.b])).toEqual([
			[4, 7],
			[5, 9],
			[6, 11]
		]);
		expect(entryValue('multiply', terms)).toBe(139);
		expect(entryText('multiply', terms)).toBe('4·7 + 5·9 + 6·11');
	});
	it('writes negative numbers in brackets', () => {
		const terms = entryTerms('add', [[2]], [[-3]], 0, 0);
		expect(entryText('add', terms)).toBe('2 + (-3)');
		expect(entryValue('add', terms)).toBe(-1);
	});
});

describe('typed values', () => {
	it('keeps old values when resizing, 0 for new cells', () => {
		expect(resize(3, 2, [[1, 2, 3]])).toEqual([
			[1, 2],
			[0, 0],
			[0, 0]
		]);
	});
	it('keeps sizes between 1 and MAX_DIM', () => {
		expect(clampDim('')).toBe(1);
		expect(clampDim(0)).toBe(1);
		expect(clampDim(99)).toBe(MAX_DIM);
		expect(clampDim(2.7)).toBe(2);
	});
	it('reads empty cells as 0', () => {
		expect(cellValue(null)).toBe(0);
		expect(cellValue('')).toBe(0);
		expect(cellValue('2.5')).toBe(2.5);
	});
});

describe('operations', () => {
	it('every operation has a label and description boxes', () => {
		for (const op of OPERATIONS) {
			expect(op.label).not.toBe('');
			expect(op.boxes.length).toBeGreaterThan(0);
		}
	});
});
