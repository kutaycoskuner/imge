// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-13
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// operations.ts -- the matrix calculator's operations as data: the switch's label, the
// formula, the size rule (in words, checked with the typed sizes, and the button that fixes
// the sizes), the operator sign, and the boxes of the description column. The page renders
// this list; the math is in ./matrix.ts. Add an operation (e.g. the determinant) by filling
// in its entry here and its rules in matrix.ts.
//
// Description boxes (sections of the page's explanation panel), in the order shown:
//   text   a title and paragraphs; $...$ in a paragraph is KaTeX math
//   rule   the size rule, checked live against the sizes typed in (texts from `rule`)
//   entry  the selected entry of C written out term by term (hover or click a cell of C)
// Details: docs/matrix-calculator.md

import type { Dims, OperationId } from './matrix';
import IconPlus from '$lib/icons/icon-plus.svelte';
import IconTimes from '$lib/icons/icon-times.svelte';
import IconLetterD from '$lib/icons/icon-letter-d.svelte';

export type DescriptionBox =
	| { kind: 'text'; title: string; paragraphs: string[] }
	| { kind: 'rule'; title: string }
	| { kind: 'entry'; title: string };

/** The sizes as KaTeX text: numbers, or the letters i, j, m, n for the general formula. */
type DimTex = Record<keyof Dims, string | number>;

export interface Operation {
	id: OperationId;
	label: string; // the full name, shown as the switch button's hover hint
	icon: typeof IconPlus; // the switch's small button, an icon from $lib/icons
	enabled: boolean; // false: shown in the switch, can't be chosen yet
	formula: (d: DimTex) => string; // KaTeX, e.g. A_{i×j} + B_{m×n} = C
	operator: string; // between A and B in the expanded view
	templateTitle: string; // title of the written-out matrix
	rule: {
		needs: string; // the rule in words
		check: (d: Dims) => string; // KaTeX: the rule with the sizes typed in
		ok: string;
		fails: string;
		resultSize: string;
		fixLabel: string; // button under the warning
		fix: (d: Dims) => Partial<Dims>; // the sizes that button sets
	};
	boxes: DescriptionBox[];
}

/** The general formula, with the letters i, j, m, n. */
export function symbolicFormula(op: Operation): string {
	return op.formula({ i: 'i', j: 'j', m: 'm', n: 'n' });
}

const noRule = { needs: '', check: () => '', ok: '', fails: '', resultSize: '', fixLabel: '', fix: () => ({}) };

export const OPERATIONS: Operation[] = [
	{
		id: 'add',
		label: 'Addition',
		icon: IconPlus,
		enabled: true,
		formula: (d) => `A_{${d.i}\\times ${d.j}} + B_{${d.m}\\times ${d.n}} = C`,
		operator: '+',
		templateTitle: 'Sum written out',
		rule: {
			needs: 'A and B must have the same size: $i = m$ and $j = n$.',
			check: (d) =>
				`i = ${d.i} ${d.i === d.m ? '=' : '\\neq'} m = ${d.m}, \\quad j = ${d.j} ${d.j === d.n ? '=' : '\\neq'} n = ${d.n}`,
			ok: 'The sizes match.',
			fails: 'The sizes differ: addition needs $i = m$ and $j = n$.',
			resultSize: 'C has the same size as A and B: $i \\times j$.',
			fixLabel: 'make B the size of A',
			fix: (d) => ({ m: d.i, n: d.j })
		},
		boxes: [
			{
				kind: 'text',
				title: 'Matrix addition',
				paragraphs: [
					'Two matrices of the same size are added entry by entry: each entry of C is the sum of the entries at the same place in A and B.',
					'$c_{rc} = a_{rc} + b_{rc}$'
				]
			},
			{ kind: 'rule', title: 'Size rule' },
			{ kind: 'entry', title: 'Selected entry' },
			{
				kind: 'text',
				title: 'Properties',
				paragraphs: [
					'Order does not matter: $A + B = B + A$ (commutative), and $(A + B) + C = A + (B + C)$ (associative).',
					'The zero matrix changes nothing: $A + 0 = A$.'
				]
			}
		]
	},
	{
		id: 'multiply',
		label: 'Multiplication',
		icon: IconTimes,
		enabled: true,
		formula: (d) => `A_{${d.i}\\times ${d.j}} \\cdot B_{${d.m}\\times ${d.n}} = C`,
		operator: '·',
		templateTitle: 'Product written out',
		rule: {
			needs: 'A must have as many columns as B has rows: $j = m$.',
			check: (d) => `j = ${d.j} ${d.j === d.m ? '=' : '\\neq'} m = ${d.m}`,
			ok: 'The inner sizes match.',
			fails: 'The inner sizes differ: multiplication needs $j = m$.',
			resultSize: 'C takes the outer sizes: $i \\times n$ (rows of A, columns of B).',
			fixLabel: 'give B as many rows as A has columns',
			fix: (d) => ({ m: d.j })
		},
		boxes: [
			{
				kind: 'text',
				title: 'Matrix multiplication',
				paragraphs: [
					'Each entry of C combines one row of A with one column of B: multiply their entries pair by pair, then add the products (the dot product).',
					'$c_{rc} = \\sum_{k=1}^{j} a_{rk}\\, b_{kc} = a_{r1}b_{1c} + a_{r2}b_{2c} + \\dots + a_{rj}b_{jc}$'
				]
			},
			{ kind: 'rule', title: 'Size rule' },
			{ kind: 'entry', title: 'Selected entry' },
			{
				kind: 'text',
				title: 'Properties',
				paragraphs: [
					'Order matters: $A \\cdot B$ is usually not $B \\cdot A$, and one of them may not even exist (not commutative).',
					'Grouping does not matter: $(A \\cdot B) \\cdot C = A \\cdot (B \\cdot C)$ (associative).',
					'The identity matrix changes nothing: $A \\cdot I = A$.'
				]
			}
		]
	},
	{
		id: 'determinant',
		label: 'Determinant (coming later)',
		icon: IconLetterD,
		enabled: false,
		formula: () => '\\det(A)',
		operator: '',
		templateTitle: '',
		rule: noRule,
		boxes: [{ kind: 'text', title: 'Determinant', paragraphs: ['Coming later.'] }]
	}
];
