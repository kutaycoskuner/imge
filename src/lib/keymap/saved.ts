// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// saved.ts -- the keyboard layout page's saved layouts (profiles, "loadouts"): several named
// layouts kept in this browser, next to the open one. Pure data rules only, on top of the
// rules every saved list shares ($lib/saved-list.ts): an entry here holds a keymap; reading
// the stored list keeps only valid layouts. Storing them (localStorage), the active profile
// and the questions to the user are in ./store.ts; the menu: ./KeymapMenu.svelte (switch),
// ./KeymapSavedMenu.svelte. Details: docs/keyboard-layout.md, "Saved layouts (profiles)".
// -----------------------------------------------------------------------------------------

import { readKeymap, keymapJson, type Keymap } from './keymap';
import {
	addEntry,
	updateEntry,
	renameEntry,
	removeEntry,
	entryByName,
	sortedByDate,
	readStoredList,
	freeName as freeEntryName,
	type SavedEntry
} from '$lib/saved-list';

export { newId } from '$lib/saved-list';

/** One saved layout: its own name (may differ from the layout's), when it was last saved, the layout. */
export interface SavedLayout extends SavedEntry {
	keymap: Keymap;
}

/** Most layouts one browser keeps; a full list must be cleaned up before saving more. */
export const MAX_SAVED = 50;

/** The name an empty wish gets. */
const FALLBACK_NAME = 'Layout';

/** The stored list (JSON text) as layouts; entries that aren't valid layouts are dropped, so
 *  one broken entry never hides the others. Empty or unreadable text → []. */
export function readSavedList(text: string | null): SavedLayout[] {
	return readStoredList<SavedLayout>(text, (e) => ({ keymap: readKeymap(e.keymap) }));
}

/** The list as JSON text for storing (each layout in its file format). */
export function savedListJson(list: SavedLayout[]): string {
	return JSON.stringify(list.map((s) => ({ id: s.id, name: s.name, savedAt: s.savedAt, keymap: JSON.parse(keymapJson(s.keymap)) })));
}

/** A name for a new entry: the wanted one, or "<name> (2)", "(3)" ... when it is taken. */
export const freeName = (list: SavedLayout[], wanted: string): string => freeEntryName(list, wanted, FALLBACK_NAME);

/** Adds a layout as a new entry (its name made free), first in the list. */
export const addSaved = (list: SavedLayout[], name: string, keymap: Keymap, now: Date = new Date()): SavedLayout[] =>
	addEntry<SavedLayout>(list, name, { keymap }, now, FALLBACK_NAME);

/** Saves a layout over an entry (same name and id, new date and content). */
export const overwriteSaved = (list: SavedLayout[], id: string, keymap: Keymap, now: Date = new Date()): SavedLayout[] =>
	updateEntry<SavedLayout>(list, id, { keymap }, now);

/** Renames an entry; an empty name keeps the old one, a taken name gets a number. */
export const renameSaved = (list: SavedLayout[], id: string, name: string): SavedLayout[] => renameEntry(list, id, name);

/** Removes an entry. */
export const removeSaved = (list: SavedLayout[], id: string): SavedLayout[] => removeEntry(list, id);

/** The entry with this name (any case), if there is one: saving under it offers to save over. */
export const savedByName = (list: SavedLayout[], name: string): SavedLayout | undefined => entryByName(list, name);

/** The list as shown: last saved first. */
export const sortedSaved = (list: SavedLayout[]): SavedLayout[] => sortedByDate(list);
