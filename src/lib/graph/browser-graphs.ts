// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// browser-graphs.ts -- graphs saved in the browser (localStorage) under names, next to the
// folder on the computer. Pure data rules only, on top of the rules every saved list shares
// ($lib/saved-list.ts): an entry holds a graph, stored in the current file format; reading
// the stored list upgrades older graphs and drops entries that aren't graphs; the file names
// for saving them all as a folder. Storing, opening, saving and the questions to the user are
// in ./file-access.ts; the menu tab is GraphSavedMenu.svelte.
// Details: docs/graph-saving.md, "Saved in this browser".
// -----------------------------------------------------------------------------------------

import { migrateGraph, stampCurrentVersion } from './migrations';
import type { Graph } from './types';
import {
	addEntry,
	updateEntry,
	renameEntry,
	removeEntry,
	entryByName,
	sortedByDate,
	readStoredList,
	type SavedEntry
} from '$lib/saved-list';

/** A graph saved in the browser: its name, when it was last saved, the graph. */
export interface BrowserGraph extends SavedEntry {
	graph: Graph;
}

/** Most graphs one browser keeps here (storage is small, about 5 MB per site). */
export const MAX_BROWSER_GRAPHS = 100;

/** The stored list (JSON text) as graphs, each upgraded to the current format version;
 *  entries that aren't graphs (or are from a newer version) are dropped. */
export function readBrowserGraphs(text: string | null): BrowserGraph[] {
	return readStoredList<BrowserGraph>(text, (e) => ({ graph: migrateGraph(e.graph).graph }));
}

/** The list as JSON text for storing (each graph in the current file format). */
export function browserGraphsJson(list: BrowserGraph[]): string {
	return JSON.stringify(list.map((s) => ({ id: s.id, name: s.name, savedAt: s.savedAt, graph: stampCurrentVersion(s.graph) })));
}

export const addBrowserGraph = (list: BrowserGraph[], name: string, graph: Graph, now?: Date): BrowserGraph[] =>
	addEntry<BrowserGraph>(list, name, { graph }, now, 'graph');
export const overwriteBrowserGraph = (list: BrowserGraph[], id: string, graph: Graph, now?: Date): BrowserGraph[] =>
	updateEntry<BrowserGraph>(list, id, { graph }, now);
export const renameBrowserGraph = (list: BrowserGraph[], id: string, name: string): BrowserGraph[] => renameEntry(list, id, name);
export const removeBrowserGraph = (list: BrowserGraph[], id: string): BrowserGraph[] => removeEntry(list, id);
export const browserGraphByName = (list: BrowserGraph[], name: string): BrowserGraph | undefined => entryByName(list, name);
export const sortedBrowserGraphs = (list: BrowserGraph[]): BrowserGraph[] => sortedByDate(list);

/** How many nodes a graph has (shown in the list). */
export const nodeCount = (g: Graph): number => g.data.nodes.length;

/**
 * File names for saving every graph as files in one folder: each name made safe for file
 * names (characters not allowed become "-") with ".json", and names that would clash (also
 * by case, as on Windows) numbered: "map.json", "map (2).json".
 */
export function folderFileNames(list: BrowserGraph[]): string[] {
	const used = new Set<string>();
	return list.map((s) => {
		const base = s.name.trim().replace(/[\\/:*?"<>|]/g, '-').replace(/\.json$/i, '') || 'graph';
		let name = `${base}.json`;
		for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base} (${n}).json`;
		used.add(name.toLowerCase());
		return name;
	});
}

/** The folder name for saving them all: "imge-graphs-YYYYMMDD" (local date). */
export function exportFolderName(date: Date = new Date()): string {
	const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
	return `imge-graphs-${day}`;
}
