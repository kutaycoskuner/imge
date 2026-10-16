// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// file-access.ts -- opening and saving graphs on the user's computer.
//
// The user points the editor at a folder on their computer; the imge graphs in it (only
// .json files that are valid imge graphs, see readGraphVersion) are listed by name and
// opened with a click.
// - With the File System Access API (Chrome, Edge) the folder is read and written directly.
//   If the user agrees, the folder handle is remembered in IndexedDB (a cookie can't hold
//   one, and browsers never reveal real paths); on a later visit the browser asks once to
//   allow access again.
// - Without it (Firefox, Safari) a folder can only be read: it's picked with a directory
//   file input each visit, graphs open from it, and saving downloads the updated file.
// Also tracks unsaved changes and runs the optional autosave (writable folders only).
//
// Requires: a browser; every function that touches window/IndexedDB is only called from
// event handlers or onMount, never during server-side prerendering.
// Used by: GraphEditorMenu.svelte (all actions), routes/+page.svelte (startup,
// change tracking, export). Details: docs/graph-saving.md
// -----------------------------------------------------------------------------------------

import { writable, get } from 'svelte/store';
import { graph, selection, emptyGraph } from './store';
import {
	migrateGraph,
	readGraphVersion,
	stampCurrentVersion,
	CURRENT_GRAPH_VERSION
} from './migrations';
import type { Graph } from './types';

// File System Access API types aren't all in TypeScript's DOM lib yet
type DirectoryHandle = any;

/** An imge graph found in the folder. */
export interface GraphEntry {
	fileName: string; // e.g. "my graph.json"
	name: string; // shown in the list: the file name without ".json"
	nodes: number;
}

// read-only folder (browsers without folder access): its graph files, by file name
let readOnlyFiles = new Map<string, File>();

const DB_NAME = 'imge';
const DB_STORE = 'handles';
const FOLDER_KEY = 'graph-folder';
const AUTOSAVE_KEY = 'imge.graphEditor.autosave';
const AUTOSAVE_DELAY_MS = 800; // after the last change, so a drag saves once, not per frame
const DOWNLOAD_COUNTER_KEY = 'imge.graphEditor.downloadCounter'; // { date, n } of the last download

/**
 * Default graph name "imgegraph-YYYYMMDD-NN": today's local date and the first two-digit
 * number from `start` that isn't in `taken` (names without ".json"), e.g. imgegraph-20261014-01.
 */
export function defaultGraphName(taken: string[] = [], date = new Date(), start = 1): string {
	const day = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
	const used = new Set(taken.map((t) => t.toLowerCase()));
	for (let n = start; ; n++) {
		const name = `imgegraph-${day}-${String(n).padStart(2, '0')}`;
		if (!used.has(name)) return name;
	}
}

/**
 * Next default name for a download. The browser can't see the downloads folder, so the
 * last number used today is kept in localStorage; it starts again at 01 each day.
 */
function nextDownloadName(): string {
	const today = defaultGraphName().slice(10, 18); // the YYYYMMDD part
	let n = 1;
	try {
		const last = JSON.parse(localStorage.getItem(DOWNLOAD_COUNTER_KEY) ?? 'null');
		if (last?.date === today) n = last.n + 1;
		localStorage.setItem(DOWNLOAD_COUNTER_KEY, JSON.stringify({ date: today, n }));
	} catch {
		// storage blocked: every download of the session starts at 01
	}
	return defaultGraphName([], new Date(), n);
}

export interface Workspace {
	supported: boolean; // folder access (read + write) available in this browser
	folder: DirectoryHandle | null; // writable folder with access granted in this session
	readOnly: boolean; // a folder was read without write access (Firefox, Safari)
	folderName: string | null;
	rememberedName: string | null; // folder remembered from an earlier visit, not reopened yet
	askRemember: boolean; // just picked a folder: show "remember it?"
	files: GraphEntry[]; // imge graphs in the folder, by name
	skipped: number; // .json files in the folder that aren't imge graphs
	fileName: string | null; // file the open graph came from / is saved to
	dirty: boolean; // changes since the last load or save
	autosave: boolean;
	status: string; // last result or error, shown in the menu
	loads: number; // counts loaded graphs, so the page can fit each new one into view
}

export const workspace = writable<Workspace>({
	supported: false,
	folder: null,
	readOnly: false,
	folderName: null,
	rememberedName: null,
	askRemember: false,
	files: [],
	skipped: 0,
	fileName: null,
	dirty: false,
	autosave: false,
	status: '',
	loads: 0
});

const patch = (changes: Partial<Workspace>) => workspace.update((w) => ({ ...w, ...changes }));

// -----------------------------------------------------------------------------------------
// startup, loading, change tracking
// -----------------------------------------------------------------------------------------
/** Reads browser support, the autosave setting and the remembered folder's name. */
export async function initWorkspace(): Promise<void> {
	const supported = 'showDirectoryPicker' in window;
	patch({ supported, autosave: readAutosaveSetting() });
	if (!supported) return;
	try {
		const remembered = await idbGet(FOLDER_KEY);
		if (remembered) patch({ rememberedName: remembered.name });
	} catch (error) {
		console.warn('Could not read the remembered folder:', error);
	}
}

let lastLoaded: Graph | null = null; // graph object set by a load; its store update isn't a change

/**
 * Upgrades parsed file content to the current format and makes it the open graph.
 *
 * Raises:
 *     GraphFormatError: not a graph file, or written by a newer app (see migrations.ts).
 */
export function loadGraph(raw: unknown, fileName: string | null): void {
	const { graph: loaded, fromVersion, applied } = migrateGraph(raw);
	if (applied.length > 0) {
		// older format versions are upgraded on load; say so, never silently
		console.info(
			`graph upgraded from v${fromVersion} to v${CURRENT_GRAPH_VERSION}:\n  ` + applied.join('\n  ')
		);
	}
	lastLoaded = loaded;
	graph.set(loaded);
	selection.set({ nodes: [], link: null });
	workspace.update((w) => ({ ...w, fileName, dirty: false, loads: w.loads + 1 }));
}

/**
 * Starts a new, empty graph without a file name (Shift+N, menu "New graph"); asks first if
 * the open graph has unsaved changes. The chosen folder stays, so Save as puts it there.
 *
 * Returns:
 *     False when the user kept the open graph.
 */
export function newGraph(): boolean {
	if (get(workspace).dirty && !confirm('The open graph has unsaved changes. Start a new graph anyway?')) {
		return false;
	}
	loadGraph(emptyGraph(), null);
	patch({ status: 'New graph: not saved yet' });
	return true;
}

/** An example graph listed in static/data/examples/index.json. */
export interface ExampleGraph {
	name: string;
	kind: string; // the graph type it shows (see docs/graph-types.md)
	file: string; // path under data/
	description: string;
}

/** The example graphs offered in the menu; an empty list when the index can't be read. */
export async function listExamples(): Promise<ExampleGraph[]> {
	try {
		const response = await fetch('data/examples/index.json');
		return (await response.json()).examples ?? [];
	} catch (error) {
		console.error('Could not read the example list:', error);
		return [];
	}
}

/**
 * Opens an example graph without a file name (so saving asks for a name and the example
 * is never overwritten); asks first if the open graph has unsaved changes.
 *
 * Returns:
 *     False when the user kept the open graph or the example couldn't be loaded.
 */
export async function openExample(example: ExampleGraph): Promise<boolean> {
	if (get(workspace).dirty && !confirm('The open graph has unsaved changes. Open the example anyway?')) {
		return false;
	}
	try {
		const response = await fetch(`data/${example.file}`);
		loadGraph(await response.json(), null);
		patch({ status: `Opened the example "${example.name}" (not saved yet)` });
		return true;
	} catch (error) {
		patch({ status: `Could not open the example "${example.name}": ${(error as Error).message}` });
		return false;
	}
}

let autosaveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Marks the graph dirty on every change and, with autosave on, saves shortly after.
 *
 * Returns:
 *     A function that stops tracking.
 */
export function trackChanges(): () => void {
	lastLoaded = get(graph);
	const unsubscribe = graph.subscribe((g) => {
		if (g === lastLoaded) return;
		patch({ dirty: true });
		const w = get(workspace);
		if (w.autosave && w.folder && w.fileName) {
			clearTimeout(autosaveTimer);
			autosaveTimer = setTimeout(() => save(), AUTOSAVE_DELAY_MS);
		}
	});
	return () => {
		unsubscribe();
		clearTimeout(autosaveTimer);
	};
}

export function setAutosave(on: boolean): void {
	patch({ autosave: on });
	try {
		localStorage.setItem(AUTOSAVE_KEY, on ? '1' : '0');
	} catch {
		// storage blocked (private window): the setting just isn't kept
	}
}

function readAutosaveSetting(): boolean {
	try {
		return localStorage.getItem(AUTOSAVE_KEY) === '1';
	} catch {
		return false;
	}
}

// -----------------------------------------------------------------------------------------
// folder (File System Access API)
// -----------------------------------------------------------------------------------------
/** Lets the user pick a folder, then asks (in the menu) whether to remember it. */
export async function chooseFolder(): Promise<void> {
	let folder: DirectoryHandle;
	try {
		folder = await (window as any).showDirectoryPicker({ id: 'imge-graphs', mode: 'readwrite' });
	} catch (error) {
		if ((error as Error).name !== 'AbortError') patch({ status: `Could not open folder: ${error}` });
		return; // AbortError: the user closed the dialog
	}
	await useFolder(folder);
	patch({ askRemember: true });
}

/** Stores the folder handle in IndexedDB (answer to "remember this folder?"). */
export async function rememberFolder(remember: boolean): Promise<void> {
	const { folder } = get(workspace);
	patch({ askRemember: false });
	if (!remember || !folder) return;
	try {
		await idbSet(FOLDER_KEY, folder);
		patch({ rememberedName: folder.name, status: `"${folder.name}" will be offered next time` });
	} catch (error) {
		patch({ status: `Could not remember the folder: ${error}` });
	}
}

/** Asks the browser for access to the remembered folder again (needs a click). */
export async function reopenRememberedFolder(): Promise<void> {
	try {
		const folder = await idbGet(FOLDER_KEY);
		if (!folder) return patch({ rememberedName: null, status: 'No remembered folder' });
		const opts = { mode: 'readwrite' };
		const granted =
			(await folder.queryPermission(opts)) === 'granted' ||
			(await folder.requestPermission(opts)) === 'granted';
		if (!granted) return patch({ status: `Access to "${folder.name}" was not allowed` });
		await useFolder(folder);
	} catch (error) {
		patch({ status: `Could not reopen the folder: ${error}` });
	}
}

/** Deletes the remembered folder from the browser ("remove saved folder"). */
export async function forgetFolder(): Promise<void> {
	try {
		await idbDelete(FOLDER_KEY);
		patch({ rememberedName: null, status: 'Saved folder removed from this browser' });
	} catch (error) {
		patch({ status: `Could not remove the saved folder: ${error}` });
	}
}

async function useFolder(folder: DirectoryHandle): Promise<void> {
	readOnlyFiles = new Map();
	patch({ folder, readOnly: false, folderName: folder.name, status: '' });
	await refreshFiles();
}

/** Re-reads the folder and lists the imge graphs in it. */
export async function refreshFiles(): Promise<void> {
	const { folder } = get(workspace);
	if (!folder) return;
	const files: File[] = [];
	for await (const entry of folder.values()) {
		if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json')) {
			files.push(await entry.getFile());
		}
	}
	await listGraphs(files);
}

/**
 * Keeps only the files that are imge graphs and puts them in the list by name. Other .json
 * files are counted, not hidden silently: the menu shows how many were skipped.
 */
async function listGraphs(files: File[]): Promise<void> {
	const entries: GraphEntry[] = [];
	let skipped = 0;
	for (const file of files) {
		const entry = await inspectGraphFile(file);
		if (entry) entries.push(entry);
		else skipped++;
	}
	entries.sort((a, b) => a.name.localeCompare(b.name));
	patch({ files: entries, skipped });
}

/** A list entry for an imge graph file, or null when the file isn't one. */
async function inspectGraphFile(file: File): Promise<GraphEntry | null> {
	try {
		const doc = JSON.parse(await file.text());
		readGraphVersion(doc); // throws for anything that isn't an imge graph
		return {
			fileName: file.name,
			name: file.name.replace(/\.json$/i, ''),
			nodes: doc.data.nodes.length
		};
	} catch {
		return null;
	}
}

/** Opens a graph from the folder; asks first if there are unsaved changes. */
export async function openFile(fileName: string): Promise<void> {
	const { folder, dirty } = get(workspace);
	if (dirty && !confirm('The open graph has unsaved changes. Open another one anyway?')) return;
	try {
		const file = folder
			? await (await folder.getFileHandle(fileName)).getFile()
			: readOnlyFiles.get(fileName);
		if (!file) return patch({ status: `${fileName} is no longer in the folder` });
		loadGraph(JSON.parse(await file.text()), fileName);
		patch({ status: `Opened ${fileName.replace(/\.json$/i, '')}` });
	} catch (error) {
		patch({ status: `Could not open ${fileName}: ${(error as Error).message}` });
	}
}

/**
 * Saves the open graph to its file: written into a writable folder, or downloaded when the
 * folder is read-only (the user puts the file back into the folder).
 */
export async function save(): Promise<void> {
	const { folder, fileName } = get(workspace);
	if (!fileName) return;
	if (!folder) return downloadGraph();
	try {
		await writeFile(folder, fileName, get(graph));
		patch({ dirty: false, status: `Saved ${fileName} at ${new Date().toLocaleTimeString()}` });
	} catch (error) {
		patch({ status: `Could not save ${fileName}: ${(error as Error).message}` });
	}
}

/** Saves the open graph under a new name in the folder; asks before overwriting any file. */
export async function saveAs(rawName: string): Promise<void> {
	const { folder } = get(workspace);
	// an empty name field saves under the next free default name (imgegraph-YYYYMMDD-NN)
	const typed = rawName.trim() || defaultGraphName(get(workspace).files.map((f) => f.name));
	const name = normalizeFileName(typed);
	if (!name) return patch({ status: 'Type a graph name first' });
	if (folder && (await fileExists(folder, name)) && !confirm(`${name} already exists. Overwrite it?`)) {
		return;
	}
	patch({ fileName: name });
	await save();
	await refreshFiles();
}

async function fileExists(folder: DirectoryHandle, name: string): Promise<boolean> {
	try {
		await folder.getFileHandle(name);
		return true;
	} catch {
		return false;
	}
}

// -----------------------------------------------------------------------------------------
// read-only folder (Firefox, Safari): directory file input
// -----------------------------------------------------------------------------------------
/** Lets the user pick a folder to read; lists the imge graphs directly inside it. */
export function chooseFolderReadOnly(): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.webkitdirectory = true; // folder picker; supported by Firefox and Safari too
	input.onchange = async () => {
		const all = Array.from(input.files ?? []);
		if (all.length === 0) return;
		// webkitRelativePath is "<folder>/<file>"; only files directly in the folder count
		const direct = all.filter(
			(f) => f.webkitRelativePath.split('/').length === 2 && f.name.toLowerCase().endsWith('.json')
		);
		readOnlyFiles = new Map(direct.map((f) => [f.name, f]));
		patch({
			folder: null,
			readOnly: true,
			folderName: all[0].webkitRelativePath.split('/')[0],
			status: ''
		});
		await listGraphs(direct);
	};
	input.click();
}

async function writeFile(folder: DirectoryHandle, name: string, g: Graph): Promise<void> {
	const handle = await folder.getFileHandle(name, { create: true });
	const writable = await handle.createWritable();
	// always written as the current format version, see docs/graph-format.md
	await writable.write(JSON.stringify(stampCurrentVersion(g), null, 2) + '\n');
	await writable.close();
}

/**
 * Turns user input into a safe file name: characters not allowed in file names become
 * "-", and ".json" is added if missing.
 *
 * Returns:
 *     The file name, or null when nothing usable is left.
 */
export function normalizeFileName(input: string): string | null {
	const base = input
		.trim()
		.replace(/[\\/:*?"<>|]/g, '-')
		.replace(/\.json$/i, '');
	return base ? `${base}.json` : null;
}

// -----------------------------------------------------------------------------------------
// fallback for browsers without folder access: upload and download
// -----------------------------------------------------------------------------------------
/** Lets the user pick a .json file and loads it. */
export function uploadGraph(): void {
	if (get(workspace).dirty && !confirm('The open graph has unsaved changes. Open another one anyway?')) {
		return;
	}
	const input = document.createElement('input');
	input.type = 'file';
	input.accept = '.json,application/json';
	input.onchange = async () => {
		const file = input.files?.[0];
		if (!file) return;
		try {
			loadGraph(JSON.parse(await file.text()), file.name);
			patch({ status: `Opened ${file.name}` });
		} catch (error) {
			patch({ status: `Could not open ${file.name}: ${(error as Error).message}` });
		}
	};
	input.click();
}

/** Downloads the open graph as a .json file (also the toolbar's Export). */
export function downloadGraph(): void {
	// a graph without a file yet gets the default name, e.g. imgegraph-20261014-01.json
	const name = get(workspace).fileName ?? `${nextDownloadName()}.json`;
	const blob = new Blob([JSON.stringify(stampCurrentVersion(get(graph)), null, 2) + '\n'], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
	patch({ dirty: false, status: `Downloaded ${name}` });
}

// -----------------------------------------------------------------------------------------
// IndexedDB: a tiny key-value store for the folder handle
// -----------------------------------------------------------------------------------------
function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, 1);
		request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
}

async function idbRequest<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
	const db = await openDb();
	try {
		return await new Promise<T>((resolve, reject) => {
			const request = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} finally {
		db.close();
	}
}

const idbGet = (key: string) => idbRequest<any>('readonly', (s) => s.get(key));
const idbSet = (key: string, value: unknown) => idbRequest('readwrite', (s) => s.put(value, key));
const idbDelete = (key: string) => idbRequest('readwrite', (s) => s.delete(key));
