// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// browser-graphs.spec.ts -- checks graphs saved in the browser: storing and reading the list
// back in the current format (broken entries dropped), names, and the file names and folder
// name for saving them all as a folder.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { emptyGraph } from './store';
import { CURRENT_GRAPH_VERSION } from './migrations';
import {
	readBrowserGraphs,
	browserGraphsJson,
	addBrowserGraph,
	overwriteBrowserGraph,
	renameBrowserGraph,
	browserGraphByName,
	nodeCount,
	folderFileNames,
	exportFolderName
} from './browser-graphs';

describe('storing the list', () => {
	it('reads back what it stored, in the current format', () => {
		const list = addBrowserGraph([], 'map', emptyGraph(), new Date('2026-11-26T10:00:00Z'));
		const text = browserGraphsJson(list);
		expect(JSON.parse(text)[0].graph.metadata.version).toBe(CURRENT_GRAPH_VERSION);
		const back = readBrowserGraphs(text);
		expect(back).toHaveLength(1);
		expect(back[0]).toMatchObject({ id: list[0].id, name: 'map', savedAt: '2026-11-26T10:00:00.000Z' });
		expect(nodeCount(back[0].graph)).toBe(0);
	});

	it('drops entries that are not graphs and keeps the others', () => {
		const good = JSON.parse(browserGraphsJson(addBrowserGraph([], 'map', emptyGraph())))[0];
		const text = JSON.stringify([good, { id: 'x', name: 'broken', graph: { metadata: { format: 'imge-keymap' } } }, 7]);
		expect(readBrowserGraphs(text).map((s) => s.name)).toEqual(['map']);
		expect(readBrowserGraphs('nonsense')).toEqual([]);
	});
});

describe('names', () => {
	it('numbers a taken name and finds entries by name, any case', () => {
		let list = addBrowserGraph([], 'Map', emptyGraph());
		list = addBrowserGraph(list, 'map', emptyGraph());
		expect(list.map((s) => s.name)).toEqual(['map (2)', 'Map']);
		expect(browserGraphByName(list, ' MAP ')?.name).toBe('Map');
		expect(renameBrowserGraph(list, list[0].id, 'Map')[0].name).toBe('Map (2)');
	});

	it('saves over an entry with a new date, keeping its name', () => {
		const list = addBrowserGraph([], 'map', emptyGraph(), new Date('2026-11-26T10:00:00Z'));
		const later = overwriteBrowserGraph(list, list[0].id, emptyGraph(), new Date('2026-11-26T11:00:00Z'));
		expect(later[0]).toMatchObject({ name: 'map', savedAt: '2026-11-26T11:00:00.000Z' });
	});
});

describe('saving them all as a folder', () => {
	it('gives safe, distinct file names (also by case)', () => {
		let list = addBrowserGraph([], 'a/b: c?', emptyGraph());
		list = addBrowserGraph(list, 'Map', emptyGraph());
		list = [...list, { ...list[1], id: 'x', name: 'map' }];
		expect(folderFileNames(list)).toEqual(['Map.json', 'a-b- c-.json', 'map (2).json']);
	});

	it('names the folder after the date', () => {
		expect(exportFolderName(new Date(2026, 10, 26))).toBe('imge-graphs-20261126');
	});
});
