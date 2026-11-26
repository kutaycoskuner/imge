// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// saved-list.ts -- the rules shared by every list of things saved in the browser under
// names (keyboard layout profiles, graphs saved in the browser): ids, free names ("Game (2)"),
// adding, changing, renaming, removing, the order shown, and reading a stored list while
// dropping broken entries. Pure: no storage, no questions; each page keeps its own entry
// type (what is saved next to id, name and date) and its storage key.
// Used by: $lib/keymap/saved.ts, $lib/graph/browser-graphs.ts.
// -----------------------------------------------------------------------------------------

/** What every saved entry has: an id, its name, when it was last saved (ISO date and time). */
export interface SavedEntry {
	id: string;
	name: string;
	savedAt: string;
}

/** A new id, unique enough for one browser's list. */
export function newId(now: number = Date.now()): string {
	return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A name for an entry: the wanted one, or "<name> (2)", "(3)" ... when it is taken (any
 *  case); an empty wish gets `fallback`. */
export function freeName(list: SavedEntry[], wanted: string, fallback = 'Untitled'): string {
	const base = wanted.trim() || fallback;
	const taken = new Set(list.map((s) => s.name.toLowerCase()));
	if (!taken.has(base.toLowerCase())) return base;
	for (let n = 2; ; n++) if (!taken.has(`${base} (${n})`.toLowerCase())) return `${base} (${n})`;
}

/** The list with a new entry first: a new id, a free name, saved now; `rest` is the page's
 *  own content (e.g. { keymap } or { graph }). */
export function addEntry<E extends SavedEntry>(list: E[], name: string, rest: Omit<E, keyof SavedEntry>, now: Date = new Date(), fallback?: string): E[] {
	const entry = { id: newId(now.getTime()), name: freeName(list, name, fallback), savedAt: now.toISOString(), ...rest } as E;
	return [entry, ...list];
}

/** The list with one entry's content replaced and its date set to now (name and id stay). */
export function updateEntry<E extends SavedEntry>(list: E[], id: string, rest: Partial<Omit<E, keyof SavedEntry>>, now: Date = new Date()): E[] {
	return list.map((s) => (s.id === id ? { ...s, ...rest, savedAt: now.toISOString() } : s));
}

/** Renames an entry; an empty name keeps the old one, a name another entry has gets a number. */
export function renameEntry<E extends SavedEntry>(list: E[], id: string, name: string): E[] {
	const others = list.filter((s) => s.id !== id);
	return list.map((s) => (s.id === id && name.trim() ? { ...s, name: freeName(others, name) } : s));
}

/** The list without an entry. */
export function removeEntry<E extends SavedEntry>(list: E[], id: string): E[] {
	return list.filter((s) => s.id !== id);
}

/** The entry with this name (any case, spaces around ignored), if there is one. */
export function entryByName<E extends SavedEntry>(list: E[], name: string): E | undefined {
	return list.find((s) => s.name.toLowerCase() === name.trim().toLowerCase());
}

/** The list as shown: last saved first. */
export function sortedByDate<E extends SavedEntry>(list: E[]): E[] {
	return [...list].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

/**
 * Reads a stored list (JSON text): each entry needs an id and a name, and `readRest` turns
 * its own content into the page's type (it throws for content that isn't valid, e.g. not a
 * layout, or from a newer version). Such entries are dropped, so one broken entry never hides
 * the others. Empty or unreadable text → [].
 */
export function readStoredList<E extends SavedEntry>(text: string | null, readRest: (raw: Record<string, unknown>) => Omit<E, keyof SavedEntry>): E[] {
	if (!text) return [];
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return [];
	}
	if (!Array.isArray(raw)) return [];
	const list: E[] = [];
	for (const entry of raw) {
		try {
			const e = entry as Record<string, unknown>;
			if (typeof e.id !== 'string' || typeof e.name !== 'string') continue;
			list.push({ id: e.id, name: e.name, savedAt: typeof e.savedAt === 'string' ? e.savedAt : '', ...readRest(e) } as E);
		} catch {
			// not valid content (or from a newer version): left out
		}
	}
	return list;
}
