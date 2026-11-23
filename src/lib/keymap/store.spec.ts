// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-23
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.spec.ts -- checks the keyboard layout page's profiles in the store: saving the open
// layout as a profile makes it active, changes go into the active profile by themselves,
// switching never loses anything and only asks when the open layout is in no profile, new
// layouts leave the active profile untouched, deleting the active one leaves no profile
// active. The browser's storage and confirm() are stand-ins (vi.stubGlobal).
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { emptyKeymap, setBinding, keymapJson } from './keymap';
import {
	keymap,
	savedLayouts,
	activeProfile,
	startKeymapPage,
	saveOpenLayout,
	openSavedLayout,
	newKeymap,
	deleteSavedLayout
} from './store';

/** A minimal localStorage stand-in. */
function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, String(v)),
		removeItem: (k: string) => void data.delete(k),
		data
	};
}

const bind = (key: string, action: string) => keymap.update((m) => setBinding(m, key, '', { action }));
const profile = (name: string) => get(savedLayouts).find((s) => s.name === name)!;
const actionOf = (name: string, key: string) => profile(name).keymap.data.bindings.find((b) => b.key === key)?.action;

let storage: ReturnType<typeof memoryStorage>;
let confirmSpy: ReturnType<typeof vi.fn>;
let stop: () => void;

beforeEach(async () => {
	storage = memoryStorage();
	// a stored open layout, so the page start doesn't fetch the first example
	storage.setItem('imge.keyboardLayout.keymap', keymapJson(setBinding(emptyKeymap('Game'), 'KeyW', '', { action: 'forward' })));
	confirmSpy = vi.fn(() => true);
	vi.stubGlobal('localStorage', storage);
	vi.stubGlobal('confirm', confirmSpy);
	savedLayouts.set([]);
	activeProfile.set(null);
	stop = await startKeymapPage();
});

afterEach(() => {
	stop();
	vi.unstubAllGlobals();
});

describe('profiles', () => {
	it('saving makes the profile active; changes then go into it by themselves', () => {
		expect(saveOpenLayout('Game')).toBe(true);
		expect(get(activeProfile)).toBe(profile('Game').id);

		bind('KeyS', 'back');
		expect(actionOf('Game', 'KeyS')).toBe('back');
		// and it is in the browser's storage, not only in memory
		expect(storage.data.get('imge.keyboardLayout.saved')).toContain('back');
	});

	it('switching keeps each profile as it was left and asks nothing', () => {
		saveOpenLayout('Game'); // W forward
		newKeymap();
		bind('KeyZ', 'undo');
		saveOpenLayout('Editor'); // Z undo

		confirmSpy.mockClear();
		expect(openSavedLayout(profile('Game').id)).toBe(true);
		expect(get(keymap).data.bindings.map((b) => b.key)).toEqual(['KeyW']);
		bind('KeyE', 'use'); // goes into "Game"
		expect(openSavedLayout(profile('Editor').id)).toBe(true);
		expect(get(keymap).data.bindings.map((b) => b.key)).toEqual(['KeyZ']);
		expect(confirmSpy).not.toHaveBeenCalled();

		expect(actionOf('Game', 'KeyE')).toBe('use');
		expect(actionOf('Editor', 'KeyE')).toBeUndefined();
		expect(get(activeProfile)).toBe(profile('Editor').id);
	});

	it('a new layout leaves the active profile untouched and is in no profile', () => {
		saveOpenLayout('Game');
		confirmSpy.mockClear();
		expect(newKeymap()).toBe(true);
		expect(confirmSpy).not.toHaveBeenCalled(); // the open layout was safe in its profile
		expect(get(activeProfile)).toBeNull();
		bind('KeyQ', 'lean');
		expect(actionOf('Game', 'KeyQ')).toBeUndefined();
		expect(actionOf('Game', 'KeyW')).toBe('forward');
	});

	it('asks before switching away from bindings that are in no profile', () => {
		saveOpenLayout('Game');
		newKeymap();
		bind('KeyQ', 'lean'); // unsaved work
		confirmSpy.mockReturnValue(false);
		expect(openSavedLayout(profile('Game').id)).toBe(false);
		expect(confirmSpy).toHaveBeenCalledTimes(1);
		expect(get(keymap).data.bindings.some((b) => b.key === 'KeyQ')).toBe(true);
		expect(get(activeProfile)).toBeNull();
	});

	it('deleting the active profile leaves the open layout and no profile active', () => {
		saveOpenLayout('Game');
		expect(deleteSavedLayout(profile('Game').id)).toBe(true);
		expect(get(activeProfile)).toBeNull();
		expect(get(savedLayouts)).toHaveLength(0);
		expect(get(keymap).data.bindings.some((b) => b.key === 'KeyW')).toBe(true);
	});

	it('remembers the active profile for the next visit', async () => {
		saveOpenLayout('Game');
		const id = get(activeProfile);
		stop();
		activeProfile.set(null);
		savedLayouts.set([]);
		stop = await startKeymapPage();
		expect(get(activeProfile)).toBe(id);
	});
});
