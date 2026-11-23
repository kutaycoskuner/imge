// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-23
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// saved.ts -- the keyboard layout page's saved layouts ("loadouts"): several named layouts
// kept in this browser, next to the open one. Pure data rules only: reading the stored list
// (dropping broken entries), adding, saving over, renaming, removing, and the order shown.
// Storing them (localStorage) and the questions to the user are in ./store.ts; the menu tab
// is ./KeymapSavedMenu.svelte. Details: docs/keyboard-layout.md, "Saved layouts".
// -----------------------------------------------------------------------------------------

import { readKeymap, keymapJson, type Keymap } from './keymap';

/** One saved layout: its own name (may differ from the layout's), when it was last saved, the layout. */
export interface SavedLayout {
	id: string;
	name: string;
	savedAt: string; // ISO date and time
	keymap: Keymap;
}

/** Most layouts one browser keeps; a full list must be cleaned up before saving more. */
export const MAX_SAVED = 50;

/** A new id, unique enough for one browser's list. */
export function newId(now: number = Date.now()): string {
	return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The stored list (JSON text) as layouts; entries that aren't valid layouts are dropped, so
 *  one broken entry never hides the others. Empty or unreadable text → []. */
export function readSavedList(text: string | null): SavedLayout[] {
	if (!text) return [];
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return [];
	}
	if (!Array.isArray(raw)) return [];
	const list: SavedLayout[] = [];
	for (const entry of raw) {
		try {
			const e = entry as Record<string, unknown>;
			if (typeof e.id !== 'string' || typeof e.name !== 'string') continue;
			list.push({ id: e.id, name: e.name, savedAt: typeof e.savedAt === 'string' ? e.savedAt : '', keymap: readKeymap(e.keymap) });
		} catch {
			// not a keyboard layout (or from a newer version): left out
		}
	}
	return list;
}

/** The list as JSON text for storing (each layout in its file format). */
export function savedListJson(list: SavedLayout[]): string {
	return JSON.stringify(list.map((s) => ({ id: s.id, name: s.name, savedAt: s.savedAt, keymap: JSON.parse(keymapJson(s.keymap)) })));
}

/** A name for a new entry: the wanted one, or "<name> (2)", "(3)" ... when it is taken. */
export function freeName(list: SavedLayout[], wanted: string): string {
	const base = wanted.trim() || 'Layout';
	const taken = new Set(list.map((s) => s.name.toLowerCase()));
	if (!taken.has(base.toLowerCase())) return base;
	for (let n = 2; ; n++) if (!taken.has(`${base} (${n})`.toLowerCase())) return `${base} (${n})`;
}

/** Adds a layout as a new entry (its name made free), first in the list. */
export function addSaved(list: SavedLayout[], name: string, keymap: Keymap, now: Date = new Date()): SavedLayout[] {
	return [{ id: newId(now.getTime()), name: freeName(list, name), savedAt: now.toISOString(), keymap }, ...list];
}

/** Saves a layout over an entry (same name and id, new date and content). */
export function overwriteSaved(list: SavedLayout[], id: string, keymap: Keymap, now: Date = new Date()): SavedLayout[] {
	return list.map((s) => (s.id === id ? { ...s, keymap, savedAt: now.toISOString() } : s));
}

/** Renames an entry; an empty name keeps the old one, a taken name gets a number. */
export function renameSaved(list: SavedLayout[], id: string, name: string): SavedLayout[] {
	const others = list.filter((s) => s.id !== id);
	return list.map((s) => (s.id === id && name.trim() ? { ...s, name: freeName(others, name) } : s));
}

/** Removes an entry. */
export function removeSaved(list: SavedLayout[], id: string): SavedLayout[] {
	return list.filter((s) => s.id !== id);
}

/** The entry with this name (any case), if there is one: saving under it offers to save over. */
export function savedByName(list: SavedLayout[], name: string): SavedLayout | undefined {
	return list.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
}

/** The list as shown: last saved first. */
export function sortedSaved(list: SavedLayout[]): SavedLayout[] {
	return [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}
