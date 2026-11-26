// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// table.spec.ts -- checks the table node's data: reading odd content into a clean table, the
// style order (column first, row on top, only what the row sets), and the changes (cells,
// rows and columns with their styles, styles, limits).
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	tableOf,
	cellStyle,
	cleanStyle,
	setCell,
	addRow,
	removeRow,
	addColumn,
	removeColumn,
	setStyle,
	tableContent,
	TABLE_MAX
} from './table';

describe('reading content', () => {
	it('makes odd content rectangular, with a style slot per row and column', () => {
		const t = tableOf({ cells: [['a', 'b', 'c'], ['d'], 'junk', [1, null]], rowStyles: [{ bold: true }], colStyles: 'x' });
		expect(t.cells).toEqual([['a', 'b', 'c'], ['d', '', ''], ['', '', ''], ['1', '', '']]);
		expect([t.rows, t.cols]).toEqual([4, 3]);
		expect(t.rowStyles).toEqual([{ bold: true }, null, null, null]);
		expect(t.colStyles).toEqual([null, null, null]);
	});
	it('gives at least one cell', () => {
		expect(tableOf({}).cells).toEqual([['']]);
	});
	it('keeps only valid style values, numbers within range', () => {
		expect(cleanStyle({ size: 9, opacity: 0, bold: 'yes', italic: true, align: 'middle', color: '#ABCDEF', extra: 1 })).toEqual({
			size: 3,
			opacity: 0.1,
			italic: true,
			color: '#ABCDEF'
		});
		expect(cleanStyle({ color: 'red' })).toBeNull();
	});
});

describe('cell style', () => {
	const t = tableOf({
		cells: [['Name', 'Price'], ['Tea', '3']],
		rowStyles: [{ bold: true, size: 1.2 }, null],
		colStyles: [null, { align: 'right', bold: false, opacity: 0.8 }]
	});
	it('is the column style with the row style on top', () => {
		expect(cellStyle(t, 0, 1)).toMatchObject({ bold: true, size: 1.2, align: 'right', opacity: 0.8 }); // header row stays bold
		expect(cellStyle(t, 1, 1)).toMatchObject({ bold: false, align: 'right', size: 1 }); // the column alone
		expect(cellStyle(t, 1, 0)).toEqual({ size: 1, opacity: 1, bold: false, italic: false, underline: false, align: 'left', color: null });
	});
});

describe('changes', () => {
	const base = tableOf({ cells: [['a', 'b'], ['c', 'd']], rowStyles: [{ bold: true }, null], colStyles: [null, { italic: true }] });

	it('sets a cell', () => {
		expect(setCell(base, 1, 0, 'x').cells).toEqual([['a', 'b'], ['x', 'd']]);
		expect(setCell(base, 5, 0, 'x')).toBe(base);
	});
	it('adds and removes rows with their styles', () => {
		const added = addRow(base, 1);
		expect(added.cells).toEqual([['a', 'b'], ['', ''], ['c', 'd']]);
		expect(added.rowStyles).toEqual([{ bold: true }, null, null]);
		const removed = removeRow(base, 0);
		expect(removed.cells).toEqual([['c', 'd']]);
		expect(removed.rowStyles).toEqual([null]);
		expect(removeRow(removed, 0)).toBe(removed); // the last row stays
	});
	it('adds and removes columns with their styles', () => {
		const added = addColumn(base, 0);
		expect(added.cells).toEqual([['', 'a', 'b'], ['', 'c', 'd']]);
		expect(added.colStyles).toEqual([null, null, { italic: true }]);
		expect(removeColumn(base, 1).colStyles).toEqual([null]);
	});
	it('stops at the limits', () => {
		let t = tableOf({ cells: [['']] });
		for (let i = 0; i < TABLE_MAX.cols + 5; i++) t = addColumn(t);
		expect(t.cols).toBe(TABLE_MAX.cols);
	});
	it('sets and unsets style keys', () => {
		const styled = setStyle(base, 'col', 0, { size: 2, align: 'center' });
		expect(styled.colStyles[0]).toEqual({ size: 2, align: 'center' });
		expect(setStyle(styled, 'col', 0, { size: undefined, align: undefined }).colStyles[0]).toBeNull();
		expect(setStyle(base, 'row', 0, { bold: undefined }).rowStyles[0]).toBeNull();
	});
	it('stores as content keys', () => {
		expect(tableContent(base)).toEqual({ cells: base.cells, rowStyles: base.rowStyles, colStyles: base.colStyles });
	});
});
