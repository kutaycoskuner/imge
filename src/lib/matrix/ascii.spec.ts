// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-13
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// ascii.spec.ts -- checks the matrix calculator's text view: aligned drawing, reading the
// edited text back (also loose typing and errors), and the side-by-side equation.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { matrixLines, matricesToText, parseMatricesText, equationText } from './ascii';

describe('drawing', () => {
	it('right-aligns every column', () => {
		expect(matrixLines([
			[1, 20],
			[-3, 4]
		])).toEqual(['┌        ┐', '│  1  20 │', '│ -3   4 │', '└        ┘']);
	});
	it('draws A, B = C side by side, centred, signs on the middle line', () => {
		expect(equationText([[[1], [2]], '+', [[3], [4]], '=', [[4], [6]]])).toBe(
			['┌   ┐   ┌   ┐   ┌   ┐', '│ 1 │ + │ 3 │ = │ 4 │', '│ 2 │   │ 4 │   │ 6 │', '└   ┘   └   ┘   └   ┘'].join('\n')
		);
	});
	it('centres a shorter matrix next to a taller one', () => {
		expect(equationText([[[1, 2]], '·', [[3], [4], [5]]])).toBe(
			['           ┌   ┐', '┌      ┐   │ 3 │', '│ 1  2 │ · │ 4 │', '└      ┘   │ 5 │', '           └   ┘'].join('\n')
		);
	});
});

describe('reading the text back', () => {
	it('writes A and B side by side, each named on its left', () => {
		expect(matricesToText([[1, 2]], [[3], [40]])).toBe(
			['    ┌      ┐        ┌    ┐', 'A = │ 1  2 │    B = │  3 │', '    └      ┘        │ 40 │', '                    └    ┘'].join('\n')
		);
	});
	it('reads what it wrote, also when B has more rows than A', () => {
		const A = [
			[1, 2, 3],
			[4, 5, 6]
		];
		const B = [[7], [8], [9]];
		expect(parseMatricesText(matricesToText(A, B))).toEqual({ ok: true, A, B });
		expect(parseMatricesText(matricesToText(B, A))).toEqual({ ok: true, A: B, B: A });
	});
	it('reads A and B stacked too', () => {
		expect(parseMatricesText('A =\n[ 1 2 ]\n\nB =\n[ 3 4 ]')).toEqual({ ok: true, A: [[1, 2]], B: [[3, 4]] });
	});
	it('takes loose typing: no brackets, numbers on the "=" line, decimals, minus signs', () => {
		const r = parseMatricesText('A = 1 2\n3,5 −4\nB =\n[ 5 6 ]\n[ 7 8 ]');
		expect(r).toEqual({ ok: true, A: [[1, 2], [3.5, -4]], B: [[5, 6], [7, 8]] });
	});
	it('names what is wrong', () => {
		expect(parseMatricesText('A =\n1 2\n3\nB =\n1')).toEqual({ ok: false, error: 'A: row 2 has 1 values, row 1 has 2' });
		expect(parseMatricesText('A =\n1')).toEqual({ ok: false, error: 'no line "B =" found' });
		expect(parseMatricesText('1 2\nA =\n1\nB =\n1')).toMatchObject({ ok: false });
		expect(parseMatricesText('A =\n1 2 3 4 5 6 7\nB =\n1')).toMatchObject({ ok: false });
	});
});
