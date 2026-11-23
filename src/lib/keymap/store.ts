// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-23
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.ts -- the keyboard layout page's state: the open keymap, the layer shown (chosen with
// the chips, or held with the real modifier keys), the selected key, view settings, the
// saved layouts, and opening / saving keymap files.
//
// The open keymap is kept in this browser (localStorage) after every change, so a reload or
// a later visit continues where you were. Saved layouts are profiles ("loadouts", rules in
// ./saved.ts): several named layouts kept in this browser to switch between; the active one
// takes every change of the open layout automatically; files are the way
// to keep layouts outside this browser and to share them (Download .json, open a file, drop
// one on the page). The first visit opens the first example.
//
// Requires: a browser for the functions that touch localStorage, files and fetch (called
// from onMount and event handlers). Used by: routes/keyboard_layout/+page.svelte and the
// components in this folder. Details: docs/keyboard-layout.md
// -----------------------------------------------------------------------------------------

import { writable, get } from 'svelte/store';
import { emptyKeymap, readKeymap, keymapJson, type Keymap } from './keymap';
import {
	MAX_SAVED,
	readSavedList,
	savedListJson,
	addSaved,
	overwriteSaved,
	renameSaved,
	removeSaved,
	savedByName,
	type SavedLayout
} from './saved';

const KEYMAP_KEY = 'imge.keyboardLayout.keymap';
const VIEW_KEY = 'imge.keyboardLayout.view';
const SAVED_KEY = 'imge.keyboardLayout.saved';
const ACTIVE_KEY = 'imge.keyboardLayout.activeProfile';

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
/** The layouts saved in this browser (profiles: the menu's profile switch and Saved tab). */
export const savedLayouts = writable<SavedLayout[]>([]);
/** The saved layout (profile) the open layout belongs to: every change to the open layout is
 *  saved into it. null = the open layout isn't saved as a profile (new, example, file). */
export const activeProfile = writable<string | null>(null);

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
		savedLayouts.set(readSavedList(localStorage.getItem(SAVED_KEY)));
		const active = localStorage.getItem(ACTIVE_KEY);
		if (active && get(savedLayouts).some((s) => s.id === active)) activeProfile.set(active);
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
	const stops = [
		keymap.subscribe((m) => {
			store(KEYMAP_KEY, keymapJson(m));
			saveIntoActiveProfile(m);
		}),
		view.subscribe((v) => store(VIEW_KEY, v)),
		activeProfile.subscribe((id) => {
			try {
				if (id) localStorage.setItem(ACTIVE_KEY, id);
				else localStorage.removeItem(ACTIVE_KEY);
			} catch {
				// storage blocked: the profile isn't remembered for the next visit
			}
		})
	];
	return () => stops.forEach((stop) => stop());
}

/** Writes the open layout into the active profile when it changed (quietly: no status, no
 *  question; that is what makes switching profiles safe). */
function saveIntoActiveProfile(map: Keymap): void {
	const id = get(activeProfile);
	const entry = id ? get(savedLayouts).find((s) => s.id === id) : undefined;
	if (!entry) return;
	if (keymapJson(entry.keymap) === keymapJson(map)) return;
	commitSaved(overwriteSaved(get(savedLayouts), entry.id, map), null);
}

/** Whether the open layout may be replaced: yes when it is saved in a profile (nothing is
 *  lost) or empty; otherwise the user is asked `question`. */
function mayReplaceOpen(question: string): boolean {
	if (get(activeProfile) || !get(keymap).data.bindings.length) return true;
	return confirm(question);
}

/** Replaces the open layout with one that isn't a profile (new, example, file): the active
 *  profile is left first, so it keeps what it holds. */
function openDetached(map: Keymap, done: string): void {
	activeProfile.set(null);
	keymap.set(map);
	selectedKey.set(null);
	status.set(done);
}

/** Starts an empty layout (asks first when the open one has unsaved bindings). */
export function newKeymap(): boolean {
	if (!mayReplaceOpen('Start an empty layout? The open one is replaced (save it as a profile or download it first to keep it).')) return false;
	openDetached(emptyKeymap('New layout', get(keymap).metadata.physical), 'New layout (not saved as a profile yet)');
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
	if (ask && !mayReplaceOpen(`Open the example "${example.name}"? The open layout is replaced.`)) return false;
	try {
		openDetached(readKeymap(await (await fetch(`data/${example.file}`)).json()), `Opened the example "${example.name}"`);
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
	if (!mayReplaceOpen(`Open ${file.name}? The open layout is replaced.`)) return false;
	try {
		openDetached(readKeymap(JSON.parse(await file.text())), `Opened ${file.name}`);
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

/**
 * Downloads a keymap as "<name>.json".
 *
 * Args:
 *     map: the keymap; the open one when left out.
 *     fileName: the file's name without .json; the layout's name when left out.
 */
export function downloadKeymap(map: Keymap = get(keymap), fileName: string = map.metadata.name): void {
	const name = `${fileName.trim().replace(/[\\/:*?"<>|]/g, '-') || 'keyboard-layout'}.json`;
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

// ---- saved layouts as profiles ("loadouts"): named layouts kept in this browser ------------
// One profile can be active: the open layout belongs to it and every change is saved into it
// (saveIntoActiveProfile), so switching profiles never loses anything and asks nothing.

/**
 * Stores a changed list of saved layouts; only when the browser accepts it is the list shown
 * changed, so the page never shows something that isn't kept.
 *
 * Args:
 *     done: the status to show; null keeps the status as it is (the quiet save of each change).
 *
 * Returns:
 *     True when stored; false when the browser refused (storage full or blocked, e.g. a
 *     private window); the reason is the status.
 */
function commitSaved(list: SavedLayout[], done: string | null): boolean {
	try {
		localStorage.setItem(SAVED_KEY, savedListJson(list));
	} catch {
		status.set('This browser didn’t keep it (storage full or blocked): download the layout instead');
		return false;
	}
	savedLayouts.set(list);
	if (done !== null) status.set(done);
	return true;
}

/** The saved entry with this id, or a status when it is gone (deleted in another tab). */
function savedEntry(id: string): SavedLayout | undefined {
	const entry = get(savedLayouts).find((s) => s.id === id);
	if (!entry) status.set('That saved layout is gone');
	return entry;
}

/**
 * Saves the open layout as a profile under a name and makes it the active one; a name
 * already in the list offers to save over that profile (no question when it is the active
 * one: it holds the open layout already).
 *
 * Returns:
 *     True when it was saved.
 */
export function saveOpenLayout(name: string): boolean {
	const list = get(savedLayouts);
	const wanted = name.trim() || get(keymap).metadata.name;
	const same = savedByName(list, wanted);
	if (same) {
		if (same.id !== get(activeProfile) && !confirm(`"${same.name}" is already saved. Save the open layout over it?`)) return false;
		if (!commitSaved(overwriteSaved(list, same.id, get(keymap)), `Saved as the profile "${same.name}"`)) return false;
		activeProfile.set(same.id);
		return true;
	}
	if (list.length >= MAX_SAVED) {
		status.set(`${MAX_SAVED} profiles are saved, the most this page keeps: delete one first (download it to keep it)`);
		return false;
	}
	const next = addSaved(list, wanted, get(keymap));
	if (!commitSaved(next, `Saved as the profile "${next[0].name}"; changes now go into it`)) return false;
	activeProfile.set(next[0].id);
	return true;
}

/** Switches to a profile: it opens and becomes the active one. Asks first only when the open
 *  layout has bindings that are in no profile (a new layout, an example, a file). */
export function openSavedLayout(id: string): boolean {
	const entry = savedEntry(id);
	if (!entry) return false;
	if (get(activeProfile) === id) return true;
	const differs = keymapJson(get(keymap)) !== keymapJson(entry.keymap);
	if (differs && !mayReplaceOpen(`Switch to "${entry.name}"? The open layout isn't saved as a profile and is replaced (save or download it first to keep it).`)) return false;
	activeProfile.set(id); // first, so the quiet save doesn't write the old layout into it
	keymap.set(entry.keymap);
	selectedKey.set(null);
	status.set(`Switched to the profile "${entry.name}"`);
	return true;
}

/** Saves the open layout over a profile (asks first) and makes it the active one. */
export function saveOverSavedLayout(id: string): boolean {
	const entry = savedEntry(id);
	if (!entry || !confirm(`Save the open layout over "${entry.name}"? What it holds now is replaced.`)) return false;
	if (!commitSaved(overwriteSaved(get(savedLayouts), id, get(keymap)), `Saved over "${entry.name}"; changes now go into it`)) return false;
	activeProfile.set(id);
	return true;
}

/** Renames a saved entry (asks for the new name). */
export function renameSavedLayout(id: string): boolean {
	const entry = savedEntry(id);
	const name = entry ? prompt('New name for the saved layout:', entry.name) : null;
	if (!entry || name === null || !name.trim() || name.trim() === entry.name) return false;
	const list = renameSaved(get(savedLayouts), id, name);
	return commitSaved(list, `Renamed to "${list.find((s) => s.id === id)?.name}"`);
}

/** Deletes a profile (asks first); the open layout stays as it is (no longer saved anywhere
 *  when it was the active profile). */
export function deleteSavedLayout(id: string): boolean {
	const entry = savedEntry(id);
	if (!entry || !confirm(`Delete the profile "${entry.name}" from this browser? Download it first to keep it.`)) return false;
	if (!commitSaved(removeSaved(get(savedLayouts), id), `Deleted "${entry.name}"`)) return false;
	if (get(activeProfile) === id) activeProfile.set(null);
	return true;
}

/** Downloads a saved entry as "<its name>.json", without opening it. */
export function downloadSavedLayout(id: string): void {
	const entry = savedEntry(id);
	if (entry) downloadKeymap(entry.keymap, entry.name);
}
