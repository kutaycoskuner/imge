// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-06
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// keymap.spec.ts -- checks the keyboard layout page's data: layers, setting and removing
// bindings, categories, reading files (also refusing other files), the keyboards' keys,
// and that the example layouts are valid and only use keys the keyboards have.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	LAYERS,
	layerId,
	layerTitle,
	eventLayer,
	emptyKeymap,
	setBinding,
	removeBinding,
	bindingOf,
	keyLayers,
	layerCounts,
	addCategory,
	removeCategory,
	readKeymap,
	keymapJson,
	KeymapFormatError
} from './keymap';
import { keyboardKeys, keyboardSize, keyLabel, isKnownKey } from './keyboards';

const EXAMPLES = import.meta.glob('../../../static/data/keymaps/*.json', { eager: true, import: 'default' }) as Record<string, any>;

describe('layers', () => {
	it('are every combination of Ctrl, Shift and Alt, written in that order', () => {
		expect(LAYERS.map(layerId)).toEqual(['', 'shift', 'ctrl', 'alt', 'ctrl+shift', 'ctrl+alt', 'shift+alt', 'ctrl+shift+alt']);
		expect(layerId(['alt', 'shift', 'ctrl'])).toBe('ctrl+shift+alt');
		expect(layerTitle('ctrl+shift')).toBe('Ctrl+Shift');
		expect(layerTitle('')).toBe('No modifier');
		expect(eventLayer({ ctrlKey: true, shiftKey: false, altKey: true })).toBe('ctrl+alt');
	});
});

describe('bindings', () => {
	it('sets, changes and removes what a key does in a layer; the same key differs per layer', () => {
		let map = setBinding(emptyKeymap(), 'KeyW', '', { action: 'Forward' });
		map = setBinding(map, 'KeyW', 'shift', { action: 'Sprint' });
		expect(bindingOf(map, 'KeyW', '')?.action).toBe('Forward');
		expect(bindingOf(map, 'KeyW', 'shift')).toMatchObject({ action: 'Sprint', mods: ['shift'] });
		expect(keyLayers(map, 'KeyW')).toEqual(['', 'shift']);
		map = setBinding(map, 'KeyW', '', { action: 'Walk' });
		expect(map.data.bindings).toHaveLength(2);
		expect(bindingOf(map, 'KeyW', '')?.action).toBe('Walk');
		expect(setBinding(map, 'KeyW', '', { action: 'Walk' })).toBe(map); // nothing changes
		map = setBinding(map, 'KeyW', '', { action: '  ' }); // an empty action removes it
		expect(bindingOf(map, 'KeyW', '')).toBeUndefined();
		map = removeBinding(map, 'KeyW', 'shift');
		expect(map.data.bindings).toEqual([]);
	});

	it('counts the bindings per layer', () => {
		let map = setBinding(emptyKeymap(), 'Digit1', '', { action: 'Weapon 1' });
		map = setBinding(map, 'Digit1', 'ctrl+shift', { action: 'Loadout 1' });
		expect(layerCounts(map)).toMatchObject({ '': 1, 'ctrl+shift': 1, shift: 0 });
	});
});

describe('categories', () => {
	it('get ids and colours in turn; removing one keeps its bindings without a category', () => {
		const a = addCategory(emptyKeymap(), 'Movement');
		const b = addCategory(a.map, 'Combat');
		expect([a.id, b.id]).toEqual(['c1', 'c2']);
		expect(b.map.data.categories[0].color).not.toBe(b.map.data.categories[1].color);
		let map = setBinding(b.map, 'KeyW', '', { action: 'Forward', category: 'c1' });
		map = removeCategory(map, 'c1');
		expect(map.data.categories.map((c) => c.id)).toEqual(['c2']);
		expect(bindingOf(map, 'KeyW', '')?.category).toBeNull();
	});
});

describe('files', () => {
	it('round-trip: what is written is read back the same', () => {
		let map = addCategory(emptyKeymap('Test', 'iso'), 'Move').map;
		map = setBinding(map, 'KeyA', 'alt', { action: 'Left', category: 'c1' });
		expect(readKeymap(JSON.parse(keymapJson(map)))).toEqual(map);
	});

	it('refuses other files and newer versions, with a reason', () => {
		expect(() => readKeymap({ metadata: { format: 'imge-graph', version: 7 }, data: { nodes: [] } })).toThrow(/graph file/);
		expect(() => readKeymap({ a: 1 })).toThrow(KeymapFormatError);
		expect(() => readKeymap({ metadata: { format: 'imge-keymap', version: 99 } })).toThrow(/newer/);
	});

	it('cleans what it reads: unknown categories dropped, modifiers in order, one binding per key and layer', () => {
		const map = readKeymap({
			metadata: { format: 'imge-keymap', version: 1, name: 'x', physical: 'weird' },
			data: {
				categories: [{ id: 'm', name: 'Move', color: 'red' }],
				bindings: [
					{ key: 'KeyW', mods: ['shift', 'ctrl'], action: 'A', category: 'nope' },
					{ key: 'KeyW', mods: ['ctrl', 'shift'], action: 'B', category: 'm' },
					{ key: 'KeyQ', mods: [], action: '' }
				]
			}
		});
		expect(map.metadata.physical).toBe('ansi');
		expect(map.data.categories[0].color).toMatch(/^#[0-9a-f]{6}$/i);
		expect(map.data.bindings).toEqual([{ key: 'KeyW', mods: ['ctrl', 'shift'], action: 'B', category: 'm' }]);
	});
});

describe('keyboards', () => {
	it('have every key once, without overlaps, ISO with its extra key', () => {
		for (const [physical, numpad] of [['ansi', true], ['iso', true], ['ansi', false]] as const) {
			const keys = keyboardKeys(physical, numpad);
			expect(new Set(keys.map((k) => k.code)).size, physical).toBe(keys.length);
			for (const a of keys)
				for (const b of keys)
					if (a !== b) {
						const apart = a.x + a.w <= b.x + 1e-9 || b.x + b.w <= a.x + 1e-9 || a.y + a.h <= b.y + 1e-9 || b.y + b.h <= a.y + 1e-9;
						expect(apart, `${a.code} / ${b.code}`).toBe(true);
					}
		}
		expect(keyboardKeys('iso', false).some((k) => k.code === 'IntlBackslash')).toBe(true);
		expect(keyboardKeys('ansi', false).some((k) => k.code === 'IntlBackslash')).toBe(false);
		expect(keyboardSize(keyboardKeys('ansi', false)).w).toBeCloseTo(18.25);
	});

	it('label keys by the user’s layout when known', () => {
		expect(keyLabel('KeyI')).toBe('I');
		// Turkish Q: the I key gives dotless ı, the key next to L gives i; upper case in Turkish
		expect(keyLabel('KeyI', new Map([['KeyI', 'ı']]), 'tr')).toBe('I');
		expect(keyLabel('Quote', new Map([['Quote', 'i']]), 'tr')).toBe('İ');
		expect(keyLabel('ShiftLeft')).toBe('Shift');
	});
});

describe('example layouts', () => {
	it('are valid keymaps that only use keys the keyboards have, every category used', () => {
		const files = Object.entries(EXAMPLES).filter(([path]) => !path.endsWith('index.json'));
		expect(files.length).toBeGreaterThan(0);
		for (const [path, raw] of files) {
			const map = readKeymap(raw);
			expect(map.data.bindings.length, path).toBe(raw.data.bindings.length); // nothing dropped
			for (const b of map.data.bindings) expect(isKnownKey(b.key), `${path} ${b.key}`).toBe(true);
			for (const c of map.data.categories) expect(map.data.bindings.some((b) => b.category === c.id), `${path} ${c.id}`).toBe(true);
		}
	});
});
