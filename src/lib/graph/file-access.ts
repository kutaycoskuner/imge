// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// file-access.ts -- opening and saving graphs on the user's computer and in the browser.
//
// Saved in this browser: graphs kept in localStorage under names (rules in
// ./browser-graphs.ts), listed in the menu's Saved tab; a graph opened from there is saved
// back there (Save, Ctrl+S, autosave). All of them can be saved as one folder on the computer
// (a new folder in a picked one, Chrome and Edge) or downloaded as that folder in a .zip
// (other browsers).
//
// The user points the editor at a folder on their computer; the imge graphs in it and in its
// subfolders (up to MAX_DEPTH levels; hidden folders and node_modules skipped; only .json
// files that are valid imge graphs, see readGraphVersion) are listed by name, with their
// subfolder, and opened with a click. A graph file can also be dropped on the page or picked
// with a file dialog (openLocalFile).
// - With the File System Access API (Chrome, Edge) the folder is read and written directly.
//   If the user agrees, the folder handle is remembered in IndexedDB (a cookie can't hold
//   one, and browsers never reveal real paths); on a later visit the browser asks once to
//   allow access again.
// - Without it (Firefox, Safari) a folder can only be read: it's picked with a directory
//   file input each visit, graphs open from it, and saving downloads the updated file.
// Also tracks unsaved changes and runs the optional autosave (writable folders only).
// Loading a graph clears the undo history (history.ts); undoing back to the graph as it was
// loaded or last saved counts as no unsaved changes.
//
// Requires: a browser; every function that touches window/IndexedDB is only called from
// event handlers or onMount, never during server-side prerendering.
// Used by: GraphEditorMenu.svelte (all actions), routes/+page.svelte (startup,
// change tracking, export). Details: docs/graph-saving.md
// -----------------------------------------------------------------------------------------

import { writable, get } from 'svelte/store';
import { graph, selection, emptyGraph } from './store';
import { clearHistory } from './history';
import {
	migrateGraph,
	readGraphVersion,
	stampCurrentVersion,
	CURRENT_GRAPH_VERSION
} from './migrations';
import type { Graph } from './types';
import {
	MAX_BROWSER_GRAPHS,
	readBrowserGraphs,
	browserGraphsJson,
	addBrowserGraph,
	overwriteBrowserGraph,
	renameBrowserGraph as renameEntry,
	removeBrowserGraph,
	browserGraphByName,
	folderFileNames,
	exportFolderName,
	type BrowserGraph
} from './browser-graphs';
import { makeZip } from '$lib/zip';

// File System Access API types aren't all in TypeScript's DOM lib yet
type DirectoryHandle = any;

/** An imge graph found in the folder. */
export interface GraphEntry {
	fileName: string; // its path in the folder, e.g. "my graph.json" or "uml/kugel.json"
	name: string; // shown in the list: the file name without ".json"
	dir: string; // its subfolder with a trailing "/", or "" directly in the folder
	nodes: number;
}

/** How many subfolder levels below the chosen folder are searched for graphs. */
export const MAX_DEPTH = 4;
// folders never searched: hidden ones (.git, .svelte-kit ...) and installed packages
const SKIP_DIR = (name: string) => name.startsWith('.') || name === 'node_modules';
const isJson = (name: string) => name.toLowerCase().endsWith('.json');

// read-only folder (browsers without folder access): its graph files, by their path in it
let readOnlyFiles = new Map<string, File>();

const DB_NAME = 'imge';
const DB_STORE = 'handles';
const FOLDER_KEY = 'graph-folder';
const AUTOSAVE_KEY = 'imge.graphEditor.autosave';
const AUTOSAVE_DELAY_MS = 800; // after the last change, so a drag saves once, not per frame
const DOWNLOAD_COUNTER_KEY = 'imge.graphEditor.downloadCounter'; // { date, n } of the last download
const BROWSER_GRAPHS_KEY = 'imge.graphEditor.browserGraphs'; // graphs saved in this browser

/** The graphs saved in this browser (the menu's Saved tab). */
export const browserGraphs = writable<BrowserGraph[]>([]);

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
	skippedNames: string[]; // their paths, shown on hover
	fileName: string | null; // file the open graph came from / is saved to
	browserId: string | null; // or: the graph saved in this browser it came from / is saved to
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
	skippedNames: [],
	fileName: null,
	browserId: null,
	dirty: false,
	autosave: false,
	status: '',
	loads: 0
});

const patch = (changes: Partial<Workspace>) => workspace.update((w) => ({ ...w, ...changes }));

// -----------------------------------------------------------------------------------------
// startup, loading, change tracking
// -----------------------------------------------------------------------------------------
/** Reads browser support, the autosave setting, the graphs saved in this browser and the
 *  remembered folder's name. */
export async function initWorkspace(): Promise<void> {
	const supported = 'showDirectoryPicker' in window;
	patch({ supported, autosave: readAutosaveSetting() });
	try {
		browserGraphs.set(readBrowserGraphs(localStorage.getItem(BROWSER_GRAPHS_KEY)));
	} catch {
		// storage blocked (private window): no graphs saved in this browser
	}
	if (!supported) return;
	try {
		const remembered = await idbGet(FOLDER_KEY);
		if (remembered) patch({ rememberedName: remembered.name });
	} catch (error) {
		console.warn('Could not read the remembered folder:', error);
	}
}

// graph object as last loaded or saved: the open graph is unsaved exactly when it is another
// object (operations always return a new one; undo can bring this one back)
let cleanGraph: Graph | null = null;

/**
 * Upgrades parsed file content to the current format and makes it the open graph.
 *
 * Args:
 *     fileName: the file in the folder it is saved to, or null.
 *     browserId: the graph saved in this browser it is saved to, or null (at most one of the two).
 *
 * Raises:
 *     GraphFormatError: not a graph file, or written by a newer app (see migrations.ts).
 */
export function loadGraph(raw: unknown, fileName: string | null, browserId: string | null = null): void {
	const { graph: loaded, fromVersion, applied } = migrateGraph(raw);
	if (applied.length > 0) {
		// older format versions are upgraded on load; say so, never silently
		console.info(
			`graph upgraded from v${fromVersion} to v${CURRENT_GRAPH_VERSION}:\n  ` + applied.join('\n  ')
		);
	}
	cleanGraph = loaded;
	graph.set(loaded);
	clearHistory(); // undo stops at the loaded graph
	selection.set({ nodes: [], link: null });
	workspace.update((w) => ({ ...w, fileName, browserId, dirty: false, loads: w.loads + 1 }));
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
	// a graph type the editor can't draw yet, shown with basic nodes (docs/graph-types.md)
	sketch?: boolean;
	// heading it is listed under in the Examples tab (index.json lists the categories in order)
	category?: string;
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
	cleanGraph = get(graph);
	const unsubscribe = graph.subscribe((g) => {
		if (g === cleanGraph) {
			patch({ dirty: false }); // loaded, or undone back to the saved state
			return;
		}
		patch({ dirty: true });
		const w = get(workspace);
		if (w.autosave && ((w.folder && w.fileName) || w.browserId)) {
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

/** Re-reads the folder and lists the imge graphs in it and its subfolders. */
export async function refreshFiles(): Promise<void> {
	const { folder } = get(workspace);
	if (!folder) return;
	const found: { path: string; file: File }[] = [];
	// one folder level: its .json files, then its subfolders (up to MAX_DEPTH)
	async function read(dir: DirectoryHandle, prefix: string, depth: number): Promise<void> {
		for await (const entry of dir.values()) {
			if (entry.kind === 'file' && isJson(entry.name)) found.push({ path: prefix + entry.name, file: await entry.getFile() });
			else if (entry.kind === 'directory' && depth < MAX_DEPTH && !SKIP_DIR(entry.name)) await read(entry, `${prefix}${entry.name}/`, depth + 1);
		}
	}
	try {
		await read(folder, '', 0);
	} catch (error) {
		// said in the menu, never an empty list without a reason
		patch({ status: `Could not read the folder "${folder.name}": ${(error as Error).message}` });
	}
	await listGraphs(found);
}

/**
 * Keeps only the files that are imge graphs and puts them in the list: the folder's own first,
 * then by subfolder, by name. Other .json files are counted, not hidden silently: the menu
 * shows how many were skipped (their names on hover).
 */
async function listGraphs(files: { path: string; file: File }[]): Promise<void> {
	const entries: GraphEntry[] = [];
	const skippedNames: string[] = [];
	for (const { path, file } of files) {
		const entry = await inspectGraphFile(path, file);
		if (entry) entries.push(entry);
		else skippedNames.push(path);
	}
	entries.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : !a.dir ? -1 : !b.dir ? 1 : a.dir.localeCompare(b.dir)));
	patch({ files: entries, skipped: skippedNames.length, skippedNames });
}

/** A list entry for an imge graph file at `path` in the folder, or null when it isn't one. */
async function inspectGraphFile(path: string, file: File): Promise<GraphEntry | null> {
	try {
		const doc = JSON.parse(await file.text());
		readGraphVersion(doc); // throws for anything that isn't an imge graph
		const slash = path.lastIndexOf('/');
		return {
			fileName: path,
			name: path.slice(slash + 1).replace(/\.json$/i, ''),
			dir: path.slice(0, slash + 1),
			nodes: doc.data.nodes.length
		};
	} catch {
		return null;
	}
}

// a file handle at `path` ("uml/kugel.json") in the folder; `create` makes the file (its
// subfolders exist already: they come from the list)
async function fileHandle(folder: DirectoryHandle, path: string, create = false): Promise<any> {
	const parts = path.split('/');
	let dir = folder;
	for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
	return dir.getFileHandle(parts[parts.length - 1], { create });
}

/**
 * Opens a graph from the folder (`fileName`: its path in the folder); asks first if there
 * are unsaved changes.
 *
 * Returns:
 *     True when the graph was opened (the menu then closes).
 */
export async function openFile(fileName: string): Promise<boolean> {
	const { folder, dirty } = get(workspace);
	if (dirty && !confirm('The open graph has unsaved changes. Open another one anyway?')) return false;
	try {
		const file = folder ? await (await fileHandle(folder, fileName)).getFile() : readOnlyFiles.get(fileName);
		if (!file) {
			patch({ status: `${fileName} is no longer in the folder` });
			return false;
		}
		loadGraph(JSON.parse(await file.text()), fileName);
		patch({ status: `Opened ${fileName.replace(/\.json$/i, '')}` });
		return true;
	} catch (error) {
		patch({ status: `Could not open ${fileName}: ${(error as Error).message}` });
		return false;
	}
}

/**
 * Saves the open graph where it belongs: back into this browser when it came from there;
 * otherwise to its file, written into a writable folder, or downloaded when the folder is
 * read-only (the user puts the file back into the folder).
 */
export async function save(): Promise<void> {
	const { folder, fileName, browserId } = get(workspace);
	if (browserId) {
		saveIntoBrowserGraph(browserId);
		return;
	}
	if (!fileName) return;
	if (!folder) return downloadGraph();
	try {
		const saved = get(graph);
		await writeFile(folder, fileName, saved);
		cleanGraph = saved;
		patch({ dirty: get(graph) !== saved, status: `Saved ${fileName} at ${new Date().toLocaleTimeString()}` });
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
	patch({ fileName: name, browserId: null }); // from now on it belongs to the file
	await save();
	await refreshFiles();
}

async function fileExists(folder: DirectoryHandle, name: string): Promise<boolean> {
	try {
		await fileHandle(folder, name);
		return true;
	} catch {
		return false;
	}
}

// -----------------------------------------------------------------------------------------
// read-only folder (Firefox, Safari): directory file input
// -----------------------------------------------------------------------------------------
/** Lets the user pick a folder to read; lists the imge graphs in it and its subfolders. */
export function chooseFolderReadOnly(): void {
	const input = document.createElement('input');
	input.type = 'file';
	input.webkitdirectory = true; // folder picker; supported by Firefox and Safari too
	input.onchange = async () => {
		const all = Array.from(input.files ?? []);
		if (all.length === 0) return;
		// webkitRelativePath is "<folder>/<subfolders>/<file>": the path in the folder is the
		// part after the folder's own name; the same depth and skipped folders as with access
		const found = all
			.map((file) => ({ parts: file.webkitRelativePath.split('/'), file }))
			.filter(({ parts, file }) => isJson(file.name) && parts.length - 2 <= MAX_DEPTH && !parts.slice(1, -1).some(SKIP_DIR))
			.map(({ parts, file }) => ({ path: parts.slice(1).join('/'), file }));
		readOnlyFiles = new Map(found.map(({ path, file }) => [path, file]));
		patch({
			folder: null,
			readOnly: true,
			folderName: all[0].webkitRelativePath.split('/')[0],
			status: ''
		});
		await listGraphs(found);
	};
	input.click();
}

async function writeFile(folder: DirectoryHandle, name: string, g: Graph): Promise<void> {
	const handle = await fileHandle(folder, name, true); // a graph opened from a subfolder is saved there
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
/**
 * Opens a graph file from anywhere on the computer (dropped on the page, or picked with
 * uploadGraph); asks first if there are unsaved changes. With a writable folder open, the
 * graph opens without a file name, so Save can't overwrite a different file of the same name
 * in that folder (Save as stores it there); otherwise it keeps its name for Save (download).
 *
 * Returns:
 *     True when the graph was opened (the menu then closes); false when the user kept the
 *     open graph or the file isn't an imge graph (the reason is the status).
 */
export async function openLocalFile(file: File): Promise<boolean> {
	if (get(workspace).dirty && !confirm(`The open graph has unsaved changes. Open ${file.name} anyway?`)) return false;
	try {
		const inFolder = !!get(workspace).folder;
		loadGraph(JSON.parse(await file.text()), inFolder ? null : file.name);
		patch({ status: inFolder ? `Opened ${file.name} (not in the folder: Save as stores it there)` : `Opened ${file.name}` });
		return true;
	} catch (error) {
		patch({ status: `Could not open ${file.name}: ${(error as Error).message}` });
		return false;
	}
}

/**
 * Lets the user pick a .json file and loads it (openLocalFile).
 *
 * Returns:
 *     True when a graph was opened.
 */
export function uploadGraph(): Promise<boolean> {
	return new Promise((resolve) => {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = '.json,application/json';
		input.onchange = async () => {
			const file = input.files?.[0];
			resolve(file ? await openLocalFile(file) : false);
		};
		input.oncancel = () => resolve(false);
		input.click();
	});
}

/** A graph as the text of its .json file (the current format version). */
const graphFileText = (g: Graph): string => JSON.stringify(stampCurrentVersion(g), null, 2) + '\n';

/** Lets the browser download `data` as a file named `name`. */
function downloadBlob(data: BlobPart, name: string, type: string): void {
	const url = URL.createObjectURL(new Blob([data], { type }));
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/** Downloads the open graph as a .json file (also the toolbar's Export). */
export function downloadGraph(): void {
	const { fileName, browserId } = get(workspace);
	const inBrowser = browserId ? get(browserGraphs).find((s) => s.id === browserId) : undefined;
	// named after its file or its name in the browser; a graph without either gets the
	// default name, e.g. imgegraph-20261014-01.json
	const name = fileName ?? (inBrowser ? normalizeFileName(inBrowser.name) : null) ?? `${nextDownloadName()}.json`;
	downloadBlob(graphFileText(get(graph)), name, 'application/json');
	if (!browserId) {
		// a download is how a graph without a writable place is saved; one in the browser
		// stays "unsaved" there until saved into the browser
		cleanGraph = get(graph);
		patch({ dirty: false });
	}
	patch({ status: `Downloaded ${name}` });
}

// -----------------------------------------------------------------------------------------
// saved in this browser (localStorage)
// -----------------------------------------------------------------------------------------
/**
 * Stores a changed list of graphs saved in this browser; only when the browser accepts it is
 * the list shown changed.
 *
 * Returns:
 *     True when stored; false when refused (storage full, e.g. by pictures in image nodes, or
 *     blocked in a private window); the reason is the status.
 */
function commitBrowserGraphs(list: BrowserGraph[], done: string | null): boolean {
	try {
		localStorage.setItem(BROWSER_GRAPHS_KEY, browserGraphsJson(list));
	} catch {
		patch({ status: 'This browser didn’t keep it (storage full or blocked): save it to a folder or download it instead' });
		return false;
	}
	browserGraphs.set(list);
	if (done !== null) patch({ status: done });
	return true;
}

/** The entry with this id, or a status when it is gone (deleted in another tab). */
function browserEntry(id: string): BrowserGraph | undefined {
	const entry = get(browserGraphs).find((s) => s.id === id);
	if (!entry) patch({ status: 'That graph is no longer saved in this browser' });
	return entry;
}

/** The name the open graph would be saved under in the browser: its name there, its file's
 *  name, or the next free default name. */
export function suggestedBrowserName(list: BrowserGraph[] = get(browserGraphs), w: Workspace = get(workspace)): string {
	const inBrowser = w.browserId ? list.find((s) => s.id === w.browserId) : undefined;
	return inBrowser?.name ?? w.fileName?.replace(/\.json$/i, '').split('/').pop() ?? defaultGraphName(list.map((s) => s.name));
}

/** Writes the open graph into its entry in this browser (Save, Ctrl+S, autosave). */
function saveIntoBrowserGraph(id: string): void {
	const entry = browserEntry(id);
	if (!entry) return;
	const saved = get(graph);
	if (commitBrowserGraphs(overwriteBrowserGraph(get(browserGraphs), id, saved), `Saved "${entry.name}" in this browser at ${new Date().toLocaleTimeString()}`)) {
		cleanGraph = saved;
		patch({ dirty: get(graph) !== saved });
	}
}

/**
 * Saves the open graph in this browser under a name; from then on Save writes it there. A
 * name already saved asks to save over that graph (no question when it is the open one).
 *
 * Returns:
 *     True when it was saved.
 */
export function saveToBrowser(rawName: string): boolean {
	const list = get(browserGraphs);
	const name = rawName.trim() || suggestedBrowserName();
	const same = browserGraphByName(list, name);
	const g = get(graph);
	let id: string;
	if (same) {
		if (same.id !== get(workspace).browserId && !confirm(`"${same.name}" is already saved in this browser. Save the open graph over it?`)) return false;
		if (!commitBrowserGraphs(overwriteBrowserGraph(list, same.id, g), `Saved "${same.name}" in this browser`)) return false;
		id = same.id;
	} else {
		if (list.length >= MAX_BROWSER_GRAPHS) {
			patch({ status: `${MAX_BROWSER_GRAPHS} graphs are saved in this browser, the most it keeps: delete one first (download it to keep it)` });
			return false;
		}
		const next = addBrowserGraph(list, name, g);
		if (!commitBrowserGraphs(next, `Saved "${next[0].name}" in this browser; Save now writes it there`)) return false;
		id = next[0].id;
	}
	cleanGraph = g;
	patch({ fileName: null, browserId: id, dirty: false }); // from now on it belongs to the browser
	return true;
}

/** Opens a graph saved in this browser (asks first if the open graph has unsaved changes). */
export function openBrowserGraph(id: string): boolean {
	const entry = browserEntry(id);
	if (!entry) return false;
	if (get(workspace).dirty && !confirm(`The open graph has unsaved changes. Open "${entry.name}" anyway?`)) return false;
	loadGraph(entry.graph, null, id);
	patch({ status: `Opened "${entry.name}" from this browser` });
	return true;
}

/** Saves the open graph over a graph in this browser (asks first); it then belongs there. */
export function saveOverBrowserGraph(id: string): boolean {
	const entry = browserEntry(id);
	if (!entry) return false;
	if (id !== get(workspace).browserId && !confirm(`Save the open graph over "${entry.name}"? What it holds now is replaced.`)) return false;
	const g = get(graph);
	if (!commitBrowserGraphs(overwriteBrowserGraph(get(browserGraphs), id, g), `Saved over "${entry.name}" in this browser; Save now writes it there`)) return false;
	cleanGraph = g;
	patch({ fileName: null, browserId: id, dirty: false });
	return true;
}

/** Renames a graph saved in this browser (asks for the new name). */
export function renameBrowserGraph(id: string): boolean {
	const entry = browserEntry(id);
	const name = entry ? prompt('New name for the graph saved in this browser:', entry.name) : null;
	if (!entry || name === null || !name.trim() || name.trim() === entry.name) return false;
	const list = renameEntry(get(browserGraphs), id, name);
	return commitBrowserGraphs(list, `Renamed to "${list.find((s) => s.id === id)?.name}"`);
}

/** Deletes a graph saved in this browser (asks first); the open graph stays open, without a
 *  place to save to if it was this one. */
export function deleteBrowserGraph(id: string): boolean {
	const entry = browserEntry(id);
	if (!entry || !confirm(`Delete "${entry.name}" from this browser? Download it first to keep it.`)) return false;
	if (!commitBrowserGraphs(removeBrowserGraph(get(browserGraphs), id), `Deleted "${entry.name}" from this browser`)) return false;
	if (get(workspace).browserId === id) patch({ browserId: null, dirty: true });
	return true;
}

/** Downloads a graph saved in this browser as "<its name>.json", without opening it. */
export function downloadBrowserGraph(id: string): void {
	const entry = browserEntry(id);
	if (!entry) return;
	const name = normalizeFileName(entry.name) ?? 'graph.json';
	downloadBlob(graphFileText(entry.graph), name, 'application/json');
	patch({ status: `Downloaded ${name}` });
}

/**
 * Saves every graph saved in this browser as one folder on the computer, "imge-graphs-<date>"
 * with "<name>.json" files: in Chrome and Edge as a new folder inside one the user picks;
 * elsewhere (no folder writing) downloaded as that folder in a .zip.
 */
export async function saveAllBrowserGraphsAsFolder(): Promise<void> {
	const list = get(browserGraphs);
	if (list.length === 0) return patch({ status: 'No graphs saved in this browser yet' });
	const folderName = exportFolderName();
	const names = folderFileNames(list);
	if (get(workspace).supported) {
		let parent: DirectoryHandle;
		try {
			parent = await (window as any).showDirectoryPicker({ id: 'imge-export', mode: 'readwrite' });
		} catch (error) {
			if ((error as DOMException).name !== 'AbortError') patch({ status: `Could not open the folder: ${(error as Error).message}` });
			return;
		}
		try {
			let target = folderName;
			for (let n = 2; await hasEntry(parent, target); n++) target = `${folderName} (${n})`; // never mixes into an older export
			const folder = await parent.getDirectoryHandle(target, { create: true });
			for (const [i, entry] of list.entries()) await writeFile(folder, names[i], entry.graph);
			patch({ status: `Saved ${list.length} ${list.length === 1 ? 'graph' : 'graphs'} into the folder "${parent.name}/${target}"` });
		} catch (error) {
			patch({ status: `Could not save the graphs as a folder: ${(error as Error).message}` });
		}
		return;
	}
	const encoder = new TextEncoder();
	const zip = makeZip(list.map((entry, i) => ({ path: `${folderName}/${names[i]}`, data: encoder.encode(graphFileText(entry.graph)) })));
	downloadBlob(zip, `${folderName}.zip`, 'application/zip');
	patch({ status: `Downloaded ${folderName}.zip with ${list.length} ${list.length === 1 ? 'graph' : 'graphs'} (this browser can't write folders: unzip it)` });
}

/** Whether a folder already has a file or folder of that name. */
async function hasEntry(folder: DirectoryHandle, name: string): Promise<boolean> {
	for await (const key of folder.keys()) if (key.toLowerCase() === name.toLowerCase()) return true;
	return false;
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
