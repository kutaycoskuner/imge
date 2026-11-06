// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-06
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// keymap.ts -- the keyboard layout page's data: a keymap is a named set of key bindings
// (what a key does, with or without modifiers), each in a coloured category, for a keyboard
// of a physical shape (ANSI or ISO). Pure functions: every change returns a new keymap.
//
// Keys are KeyboardEvent.code values ("KeyW", "Digit1", "ShiftLeft"): the physical position,
// the same on every language layout, so a game's map works on a Turkish Q or a German QWERTZ
// keyboard alike. Modifiers are Ctrl, Shift, Alt in any combination: a "layer" (LAYERS) is
// one combination, written in that order ("ctrl+shift"); "" is the key on its own.
//
// File format (JSON, versioned like the graph format, see docs/keyboard-layout.md):
//   { "metadata": { "format": "imge-keymap", "version": 1, "name": "...", "physical": "ansi" },
//     "data": { "categories": [{ "id", "name", "color" }],
//               "bindings": [{ "key": "KeyW", "mods": ["shift"], "action": "...", "category": "move" }] } }
//
// Used by: routes/keyboard_layout/+page.svelte and its components ($lib/keymap/*.svelte).
// -----------------------------------------------------------------------------------------

export const KEYMAP_FORMAT = 'imge-keymap';
export const KEYMAP_VERSION = 1;

/** The modifiers, in the order a layer is written. */
export const MODIFIERS = ['ctrl', 'shift', 'alt'] as const;
export type Modifier = (typeof MODIFIERS)[number];

/** Every combination of modifiers, from none to all three: the keyboard's layers. */
export const LAYERS: Modifier[][] = [[], ['shift'], ['ctrl'], ['alt'], ['ctrl', 'shift'], ['ctrl', 'alt'], ['shift', 'alt'], ['ctrl', 'shift', 'alt']];

/** Physical keyboard shapes: ANSI (US) and ISO (most of Europe: an extra key left of Z, tall Enter). */
export const PHYSICAL = ['ansi', 'iso'] as const;
export type Physical = (typeof PHYSICAL)[number];

export interface Category {
	id: string;
	name: string;
	color: string; // "#rrggbb"
}

export interface Binding {
	key: string; // KeyboardEvent.code
	mods: Modifier[]; // in MODIFIERS order
	action: string; // what it does
	category: string | null; // a category id, or none
}

export interface Keymap {
	metadata: { format: typeof KEYMAP_FORMAT; version: number; name: string; physical: Physical; [key: string]: unknown };
	data: { categories: Category[]; bindings: Binding[] };
}

/** Colours offered for new categories, in turn (readable on light and dark backgrounds). */
export const CATEGORY_COLORS = ['#0090ff', '#30a46c', '#e5484d', '#f76b15', '#8e4ec6', '#d6409f', '#12a594', '#ffc53d', '#6e56cf', '#8b8d98'];

/** A layer's id: its modifiers in MODIFIERS order, joined with "+" ("" = no modifier). */
export const layerId = (mods: readonly string[]): string => MODIFIERS.filter((m) => mods.includes(m)).join('+');

/** A layer as people read it: "Ctrl+Shift", or "No modifier". */
export const layerTitle = (id: string): string =>
	id ? id.split('+').map((m) => m[0].toUpperCase() + m.slice(1)).join('+') : 'No modifier';

/** The modifiers of a layer id. */
export const layerMods = (id: string): Modifier[] => MODIFIERS.filter((m) => id.split('+').includes(m));

/** The layer a key event belongs to: the modifiers held with it. */
export const eventLayer = (event: { ctrlKey: boolean; shiftKey: boolean; altKey: boolean }): string =>
	layerId([event.ctrlKey ? 'ctrl' : '', event.shiftKey ? 'shift' : '', event.altKey ? 'alt' : ''].filter(Boolean));

export function emptyKeymap(name = 'New layout', physical: Physical = 'ansi'): Keymap {
	return { metadata: { format: KEYMAP_FORMAT, version: KEYMAP_VERSION, name, physical }, data: { categories: [], bindings: [] } };
}

/** The binding of `key` in layer `layer`, if any. */
export const bindingOf = (map: Keymap, key: string, layer: string): Binding | undefined =>
	map.data.bindings.find((b) => b.key === key && layerId(b.mods) === layer);

/** The bindings of one layer, by key code. */
export function layerBindings(map: Keymap, layer: string): Map<string, Binding> {
	return new Map(map.data.bindings.filter((b) => layerId(b.mods) === layer).map((b) => [b.key, b]));
}

/** The layers that bind `key`, in LAYERS order. */
export const keyLayers = (map: Keymap, key: string): string[] =>
	LAYERS.map(layerId).filter((id) => map.data.bindings.some((b) => b.key === key && layerId(b.mods) === id));

/** How many bindings each layer has, by layer id. */
export function layerCounts(map: Keymap): Record<string, number> {
	const counts: Record<string, number> = Object.fromEntries(LAYERS.map((l) => [layerId(l), 0]));
	for (const b of map.data.bindings) counts[layerId(b.mods)] = (counts[layerId(b.mods)] ?? 0) + 1;
	return counts;
}

const withData = (map: Keymap, data: Partial<Keymap['data']>): Keymap => ({ ...map, data: { ...map.data, ...data } });

/**
 * Sets what `key` does in `layer`: a new binding, or the existing one changed. An empty action
 * removes the binding (a key does nothing). Returns the same keymap when nothing changes.
 */
export function setBinding(map: Keymap, key: string, layer: string, change: { action?: string; category?: string | null }): Keymap {
	const old = bindingOf(map, key, layer);
	const action = (change.action ?? old?.action ?? '').trim();
	const category = change.category !== undefined ? change.category : (old?.category ?? null);
	if (!action) return old ? removeBinding(map, key, layer) : map;
	if (old && old.action === action && old.category === category) return map;
	const binding: Binding = { key, mods: layerMods(layer), action, category };
	return withData(map, {
		bindings: old ? map.data.bindings.map((b) => (b === old ? binding : b)) : [...map.data.bindings, binding]
	});
}

/** Removes what `key` does in `layer`. */
export function removeBinding(map: Keymap, key: string, layer: string): Keymap {
	const old = bindingOf(map, key, layer);
	return old ? withData(map, { bindings: map.data.bindings.filter((b) => b !== old) }) : map;
}

/** Adds a category with the next colour of CATEGORY_COLORS; returns the keymap and its id. */
export function addCategory(map: Keymap, name: string): { map: Keymap; id: string } {
	let n = map.data.categories.length + 1;
	while (map.data.categories.some((c) => c.id === `c${n}`)) n++;
	const id = `c${n}`;
	const color = CATEGORY_COLORS[map.data.categories.length % CATEGORY_COLORS.length];
	return { map: withData(map, { categories: [...map.data.categories, { id, name: name.trim() || `Category ${n}`, color }] }), id };
}

/** Renames or recolours a category. */
export function updateCategory(map: Keymap, id: string, change: Partial<Pick<Category, 'name' | 'color'>>): Keymap {
	return withData(map, { categories: map.data.categories.map((c) => (c.id === id ? { ...c, ...change } : c)) });
}

/** Removes a category; its bindings stay, without a category. */
export function removeCategory(map: Keymap, id: string): Keymap {
	return withData(map, {
		categories: map.data.categories.filter((c) => c.id !== id),
		bindings: map.data.bindings.map((b) => (b.category === id ? { ...b, category: null } : b))
	});
}

/** Sets the keymap's name or physical keyboard shape. */
export const setMetadata = (map: Keymap, change: Partial<Pick<Keymap['metadata'], 'name' | 'physical'>>): Keymap => ({
	...map,
	metadata: { ...map.metadata, ...change }
});

export class KeymapFormatError extends Error {
	name = 'KeymapFormatError';
}

/**
 * Reads a keymap file (parsed JSON): checks it and fills what may be missing.
 *
 * Raises:
 *     KeymapFormatError: not a keymap file, or written by a newer version of the page.
 */
export function readKeymap(raw: unknown): Keymap {
	const doc = raw as any;
	if (!doc || typeof doc !== 'object' || doc.metadata?.format !== KEYMAP_FORMAT) {
		throw new KeymapFormatError(doc?.metadata?.format === 'imge-graph' ? 'this is a graph file: open it in the graph editor' : 'not a keyboard layout file (imge-keymap)');
	}
	const version = doc.metadata.version;
	if (!Number.isInteger(version) || version < 1) throw new KeymapFormatError(`invalid version: ${JSON.stringify(version)}`);
	if (version > KEYMAP_VERSION) throw new KeymapFormatError(`version ${version} is newer than this page supports (${KEYMAP_VERSION})`);
	const categories: Category[] = (Array.isArray(doc.data?.categories) ? doc.data.categories : [])
		.filter((c: any) => c && typeof c.id === 'string')
		.map((c: any) => ({ id: c.id, name: String(c.name ?? c.id), color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : CATEGORY_COLORS[0] }));
	const ids = new Set(categories.map((c) => c.id));
	const bindings: Binding[] = [];
	for (const b of Array.isArray(doc.data?.bindings) ? doc.data.bindings : []) {
		if (!b || typeof b.key !== 'string' || typeof b.action !== 'string' || !b.action.trim()) continue;
		const mods = layerMods(layerId(Array.isArray(b.mods) ? b.mods : []));
		// one binding per key and layer: a later duplicate replaces an earlier one
		const at = bindings.findIndex((x) => x.key === b.key && layerId(x.mods) === layerId(mods));
		const binding = { key: b.key, mods, action: b.action.trim(), category: ids.has(b.category) ? b.category : null };
		if (at >= 0) bindings[at] = binding;
		else bindings.push(binding);
	}
	return {
		metadata: {
			...doc.metadata,
			format: KEYMAP_FORMAT,
			version: KEYMAP_VERSION,
			name: typeof doc.metadata.name === 'string' && doc.metadata.name.trim() ? doc.metadata.name : 'Keyboard layout',
			physical: (PHYSICAL as readonly string[]).includes(doc.metadata.physical) ? doc.metadata.physical : 'ansi'
		},
		data: { categories, bindings }
	};
}

/** The keymap as file text: bindings sorted by key and layer, so files compare well. */
export function keymapJson(map: Keymap): string {
	const order = LAYERS.map(layerId);
	const bindings = [...map.data.bindings].sort((a, b) => a.key.localeCompare(b.key) || order.indexOf(layerId(a.mods)) - order.indexOf(layerId(b.mods)));
	return JSON.stringify({ ...map, data: { ...map.data, bindings } }, null, 2) + '\n';
}
