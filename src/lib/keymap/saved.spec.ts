// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-23
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// saved.spec.ts -- checks the saved layouts' rules: storing and reading the list back
// (broken entries dropped), free names, adding, saving over, renaming, removing, order.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { emptyKeymap, setBinding } from './keymap';
import {
	readSavedList,
	savedListJson,
	freeName,
	addSaved,
	overwriteSaved,
	renameSaved,
	removeSaved,
	savedByName,
	sortedSaved
} from './saved';

const map = setBinding(emptyKeymap('Game'), 'KeyW', '', { action: 'forward' });
const t1 = new Date('2026-11-23T10:00:00Z');
const t2 = new Date('2026-11-23T11:00:00Z');

describe('storing the list', () => {
	it('reads back what it stored', () => {
		const list = addSaved([], 'Game', map, t1);
		const back = readSavedList(savedListJson(list));
		expect(back).toHaveLength(1);
		expect(back[0]).toMatchObject({ id: list[0].id, name: 'Game', savedAt: t1.toISOString() });
		expect(back[0].keymap.data.bindings[0]).toMatchObject({ key: 'KeyW', action: 'forward' });
	});
	it('drops broken entries and keeps the others', () => {
		const good = JSON.parse(savedListJson(addSaved([], 'Game', map, t1)))[0];
		const text = JSON.stringify([good, { id: 'x', name: 'broken', keymap: { format: 'something else' } }, 'junk']);
		expect(readSavedList(text).map((s) => s.name)).toEqual(['Game']);
	});
	it('gives an empty list for nothing or unreadable text', () => {
		expect(readSavedList(null)).toEqual([]);
		expect(readSavedList('not json')).toEqual([]);
		expect(readSavedList('{"a": 1}')).toEqual([]);
	});
});

describe('names', () => {
	it('numbers a taken name, any case', () => {
		const list = addSaved(addSaved([], 'Game', map), 'game (2)', map);
		expect(freeName(list, 'GAME')).toBe('GAME (3)');
		expect(freeName(list, 'Other')).toBe('Other');
		expect(freeName(list, '  ')).toBe('Layout');
	});
	it('finds an entry by name, any case', () => {
		const list = addSaved([], 'Game', map);
		expect(savedByName(list, ' game ')?.id).toBe(list[0].id);
		expect(savedByName(list, 'other')).toBeUndefined();
	});
});

describe('changing entries', () => {
	it('adds first, saves over with a new date, renames, removes', () => {
		let list = addSaved([], 'A', map, t1);
		list = addSaved(list, 'B', emptyKeymap('B'), t1);
		expect(list.map((s) => s.name)).toEqual(['B', 'A']);

		const a = list[1].id;
		list = overwriteSaved(list, a, emptyKeymap('A2'), t2);
		expect(list[1]).toMatchObject({ name: 'A', savedAt: t2.toISOString() });
		expect(list[1].keymap.metadata.name).toBe('A2');

		expect(renameSaved(list, a, 'B')[1].name).toBe('B (2)'); // taken by the other entry
		expect(renameSaved(list, a, '')[1].name).toBe('A'); // empty keeps the old name
		expect(renameSaved(list, a, 'a')[1].name).toBe('a'); // its own name in other case is free

		expect(removeSaved(list, a).map((s) => s.name)).toEqual(['B']);
	});
	it('shows the last saved first', () => {
		let list = addSaved([], 'old', map, t1);
		list = addSaved(list, 'new', map, t2);
		list = overwriteSaved(list, list.find((s) => s.name === 'old')!.id, map, new Date('2026-11-24T00:00:00Z'));
		expect(sortedSaved(list).map((s) => s.name)).toEqual(['old', 'new']);
	});
});
