// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// browser-saving.spec.ts -- checks saving graphs in the browser through file-access.ts: Save
// in browser makes the browser the graph's place (Save then writes there), a name already
// saved asks to save over it, opening asks before dropping unsaved changes, deleting the
// open one leaves it without a place, and "save all as a folder" downloads a .zip with every
// graph when the browser can't write folders. The browser's storage, dialogs and download
// are stand-ins (vi.stubGlobal).
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';
import { graph, emptyGraph } from './store';
import {
	workspace,
	browserGraphs,
	initWorkspace,
	trackChanges,
	loadGraph,
	save,
	saveToBrowser,
	openBrowserGraph,
	deleteBrowserGraph,
	saveAllBrowserGraphsAsFolder
} from './file-access';

function memoryStorage() {
	const data = new Map<string, string>();
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, String(v)),
		removeItem: (k: string) => void data.delete(k),
		data
	};
}

/** A change to the open graph, as an edit makes one (a new object with one more node). */
function edit(): void {
	graph.update((g) => ({
		...g,
		data: { ...g.data, nodes: [...g.data.nodes, { ...(g.data.nodes[0] ?? {}), id: `n${g.data.nodes.length + 100}` } as any] }
	}));
}

let storage: ReturnType<typeof memoryStorage>;
let confirmSpy: ReturnType<typeof vi.fn>;
let downloads: { name: string; blob: Blob }[];
let stop: () => void;

beforeEach(async () => {
	storage = memoryStorage();
	confirmSpy = vi.fn(() => true);
	downloads = [];
	let lastBlob: Blob | null = null;
	vi.stubGlobal('localStorage', storage);
	vi.stubGlobal('confirm', confirmSpy);
	vi.stubGlobal('window', {}); // no showDirectoryPicker: like Firefox / Safari
	vi.stubGlobal('URL', { createObjectURL: (b: Blob) => ((lastBlob = b), 'blob:x'), revokeObjectURL: () => {} });
	vi.stubGlobal('document', {
		createElement: () => ({ click() {}, set download(name: string) { downloads.push({ name, blob: lastBlob! }); } }),
		body: { appendChild() {}, removeChild() {} }
	});
	browserGraphs.set([]);
	await initWorkspace();
	// a graph with one node, opened without a place to save to
	const g = emptyGraph();
	loadGraph({ ...g, data: { ...g.data, nodes: [{ id: 'n1', type: 'basic', name: 'a', x: 0, y: 0, inputs: [], outputs: [] }] } }, null);
	stop = trackChanges();
});

afterEach(() => {
	stop();
	vi.unstubAllGlobals();
});

describe('saving graphs in the browser', () => {
	it('Save in browser makes the browser its place; Save then writes there', async () => {
		expect(saveToBrowser('map')).toBe(true);
		expect(get(workspace)).toMatchObject({ fileName: null, dirty: false });
		const id = get(workspace).browserId!;
		expect(get(browserGraphs).find((s) => s.id === id)?.name).toBe('map');

		edit();
		expect(get(workspace).dirty).toBe(true);
		await save();
		expect(get(workspace).dirty).toBe(false);
		expect(get(browserGraphs)[0].graph.data.nodes).toHaveLength(2);
		expect(JSON.parse(storage.data.get('imge.graphEditor.browserGraphs')!)[0].graph.data.nodes).toHaveLength(2);
	});

	it('a name already saved asks to save over it, except for the open one', () => {
		saveToBrowser('map');
		confirmSpy.mockClear();
		saveToBrowser('MAP'); // the open one: no question
		expect(confirmSpy).not.toHaveBeenCalled();

		loadGraph(emptyGraph(), null); // another graph, not in the browser
		confirmSpy.mockReturnValue(false);
		expect(saveToBrowser('map')).toBe(false);
		expect(confirmSpy).toHaveBeenCalledTimes(1);
		expect(get(browserGraphs)[0].graph.data.nodes).toHaveLength(1); // kept
	});

	it('opening one asks before dropping unsaved changes', () => {
		saveToBrowser('map');
		loadGraph(emptyGraph(), null);
		edit();
		confirmSpy.mockReturnValue(false);
		expect(openBrowserGraph(get(browserGraphs)[0].id)).toBe(false);
		confirmSpy.mockReturnValue(true);
		expect(openBrowserGraph(get(browserGraphs)[0].id)).toBe(true);
		expect(get(graph).data.nodes).toHaveLength(1);
		expect(get(workspace)).toMatchObject({ browserId: get(browserGraphs)[0].id, dirty: false });
	});

	it('deleting the open one leaves it open, without a place to save to', () => {
		saveToBrowser('map');
		expect(deleteBrowserGraph(get(workspace).browserId!)).toBe(true);
		expect(get(browserGraphs)).toHaveLength(0);
		expect(get(workspace)).toMatchObject({ browserId: null, dirty: true });
	});

	it('save all as a folder downloads a .zip when the browser cannot write folders', async () => {
		saveToBrowser('map');
		loadGraph(emptyGraph(), null);
		saveToBrowser('other');
		await saveAllBrowserGraphsAsFolder();
		expect(downloads).toHaveLength(1);
		expect(downloads[0].name).toMatch(/^imge-graphs-\d{8}\.zip$/);
		const bytes = new Uint8Array(await downloads[0].blob.arrayBuffer());
		const text = new TextDecoder().decode(bytes);
		expect(text).toContain('/map.json');
		expect(text).toContain('/other.json');
		expect(text).toContain('"imge-graph"'); // the graphs in their file format
	});
});
