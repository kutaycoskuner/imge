// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-06
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.ts -- the keyboard layout page's state: the open keymap, the layer shown (chosen with
// the chips, or held with the real modifier keys), the selected key, view settings, and
// opening / saving keymap files.
//
// The open keymap is kept in this browser (localStorage) after every change, so a reload or
// a later visit continues where you were; files are the way to keep and share layouts
// (Download .json, open a file, drop one on the page). The first visit opens the first example.
//
// Requires: a browser for the functions that touch localStorage, files and fetch (called
// from onMount and event handlers). Used by: routes/keyboard_layout/+page.svelte and the
// components in this folder. Details: docs/keyboard-layout.md
// -----------------------------------------------------------------------------------------

import { writable, get } from 'svelte/store';
import { emptyKeymap, readKeymap, keymapJson, type Keymap } from './keymap';

const KEYMAP_KEY = 'imge.keyboardLayout.keymap';
const VIEW_KEY = 'imge.keyboardLayout.view';

/** The open keymap. */
export const keymap = writable<Keymap>(emptyKeymap());
/** The layer chosen with the chips ("" = no modifier). */
export const chosenLayer = writable<string>('');
/** The layer of the modifier keys held right now, or null when none is held. */
export const heldLayer = writable<string | null>(null);
/** The key being edited (KeyboardEvent.code), or null. */
export const selectedKey = writable<string | null>(null);
/** View settings, kept in this browser: numpad shown, labels from the user's own layout. */
export const view = writable<{ numpad: boolean; ownLabels: boolean }>({ numpad: true, ownLabels: true });
/** The user's keyboard layout (code -> character), when the browser tells it (Chrome, Edge). */
export const layoutMap = writable<Map<string, string> | null>(null);
/** The last result or problem (opened, saved, not a layout file ...), shown on the page. */
export const status = writable<string>('');

/** An example layout listed in static/data/keymaps/index.json. */
export interface KeymapExample {
	name: string;
	file: string; // path under data/
	description: string;
}

/**
 * Restores the open keymap and the view settings from this browser (or opens the first
 * example on a first visit), reads the user's keyboard layout, and keeps both stored.
 *
 * Returns:
 *     A function that stops storing.
 */
export async function startKeymapPage(): Promise<() => void> {
	try {
		const stored = localStorage.getItem(KEYMAP_KEY);
		if (stored) keymap.set(readKeymap(JSON.parse(stored)));
		else {
			const [first] = await listKeymapExamples();
			if (first) await openExample(first, false);
		}
		const v = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null');
		if (v) view.set({ numpad: v.numpad !== false, ownLabels: v.ownLabels !== false });
	} catch {
		// storage blocked or a broken entry: start with what is there
	}
	try {
		const map = await (navigator as any).keyboard?.getLayoutMap?.();
		if (map) layoutMap.set(new Map(map));
	} catch {
		// not offered by this browser (Firefox, Safari): the US labels are shown
	}
	const store = (key: string, value: unknown) => {
		try {
			localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
		} catch {
			// storage blocked (private window): nothing is kept, files still work
		}
	};
	const stops = [keymap.subscribe((m) => store(KEYMAP_KEY, keymapJson(m))), view.subscribe((v) => store(VIEW_KEY, v))];
	return () => stops.forEach((stop) => stop());
}

/** Starts an empty layout (asks first when the open one has bindings). */
export function newKeymap(): boolean {
	if (get(keymap).data.bindings.length && !confirm('Start an empty layout? The open one is replaced (download it first to keep it).')) return false;
	keymap.set(emptyKeymap('New layout', get(keymap).metadata.physical));
	selectedKey.set(null);
	status.set('New layout');
	return true;
}

/** The example layouts offered in the menu; an empty list when the index can't be read. */
export async function listKeymapExamples(): Promise<KeymapExample[]> {
	try {
		return (await (await fetch('data/keymaps/index.json')).json()).examples ?? [];
	} catch {
		return [];
	}
}

/** Opens an example layout (asks first when the open one has bindings and `ask` is on). */
export async function openExample(example: KeymapExample, ask = true): Promise<boolean> {
	if (ask && get(keymap).data.bindings.length && !confirm(`Open the example "${example.name}"? The open layout is replaced.`)) return false;
	try {
		keymap.set(readKeymap(await (await fetch(`data/${example.file}`)).json()));
		selectedKey.set(null);
		status.set(`Opened the example "${example.name}"`);
		return true;
	} catch (error) {
		status.set(`Could not open the example: ${(error as Error).message}`);
		return false;
	}
}

/**
 * Opens a keymap file from the computer (picked or dropped); asks first when the open layout
 * has bindings.
 *
 * Returns:
 *     True when it opened; false when the user kept the open layout or the file isn't a
 *     keyboard layout (the reason is the status).
 */
export async function openKeymapFile(file: File): Promise<boolean> {
	if (get(keymap).data.bindings.length && !confirm(`Open ${file.name}? The open layout is replaced.`)) return false;
	try {
		keymap.set(readKeymap(JSON.parse(await file.text())));
		selectedKey.set(null);
		status.set(`Opened ${file.name}`);
		return true;
	} catch (error) {
		status.set(`Could not open ${file.name}: ${(error as Error).message}`);
		return false;
	}
}

/** Lets the user pick a keymap file and opens it. */
export function pickKeymapFile(): Promise<boolean> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json,application/json';
		input.onchange = async () => {
			const file = input.files?.[0];
			resolve(file ? await openKeymapFile(file) : false);
		};
		input.oncancel = () => resolve(false);
		input.click();
	});
}

/** Downloads the open keymap as "<name>.json". */
export function downloadKeymap(): void {
	const map = get(keymap);
	const name = `${map.metadata.name.trim().replace(/[\\/:*?"<>|]/g, '-') || 'keyboard-layout'}.json`;
	const url = URL.createObjectURL(new Blob([keymapJson(map)], { type: 'application/json' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
	status.set(`Downloaded ${name}`);
}
