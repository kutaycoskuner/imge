// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// migrations.spec.ts -- checks that graph files of every older version upgrade correctly.
// Every new format version adds a fixture of the version it replaces and a test here.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import {
	CURRENT_GRAPH_VERSION,
	GraphFormatError,
	migrateGraph,
	readGraphVersion,
	stampCurrentVersion
} from './migrations';
import { GRAPH_FORMAT } from './types';

// v0 fixture: static/data/test-node-graph.json before versioning (y down); the second
// node sits at y 0 here (was 40) so the test also covers that flipping 0 gives 0, not -0
const v0 = () => ({
	metadata: {},
	data: {
		nodes: [
			{
				_id: 0,
				type: 'basic',
				position: { x: 0, y: 140 },
				data: {
					title: 'First Node',
					inputs: [],
					outputs: [{ id: 'output_0', type: 'basic', label: 'Output A' }]
				}
			},
			{
				_id: 1,
				type: 'basic',
				position: { x: 400, y: 0 },
				data: {
					title: 'Second Node',
					inputs: [{ id: 'input_0', type: 'basic', label: 'Input A' }],
					outputs: []
				}
			}
		],
		links: [
			{ sourceNodeId: 0, sourceOutputId: 'output_0', targetNodeId: 1, targetInputId: 'input_0' }
		]
	}
});

describe('readGraphVersion', () => {
	it('reads unversioned files as version 0', () => {
		expect(readGraphVersion(v0())).toBe(0);
	});

	it('refuses files that are not graphs', () => {
		expect(() => readGraphVersion({ foo: 1 })).toThrow(GraphFormatError);
		expect(() => readGraphVersion(null)).toThrow(GraphFormatError);
	});

	it('refuses another format name', () => {
		const doc = { ...v0(), metadata: { format: 'other', version: 1 } };
		expect(() => readGraphVersion(doc)).toThrow(/unknown format/);
	});

	it('refuses an invalid version value', () => {
		const doc = { ...v0(), metadata: { format: GRAPH_FORMAT, version: '1' } };
		expect(() => readGraphVersion(doc)).toThrow(/invalid format version/);
	});
});

describe('migrateGraph', () => {
	it('upgrades v0 to the current version: metadata added, y flipped', () => {
		const { graph, fromVersion, applied } = migrateGraph(v0());

		expect(fromVersion).toBe(0);
		expect(applied).toHaveLength(CURRENT_GRAPH_VERSION);
		expect(graph.metadata).toEqual({ format: GRAPH_FORMAT, version: CURRENT_GRAPH_VERSION });
		expect(graph.data.nodes.map((n) => n.position)).toEqual([
			{ x: 0, y: -140 },
			{ x: 400, y: 0 }
		]);
		expect(Object.is(graph.data.nodes[1].position.y, -0)).toBe(false);
		// everything else is carried over unchanged
		expect(graph.data.links).toEqual(v0().data.links);
		expect(graph.data.nodes[0].data).toEqual(v0().data.nodes[0].data);
	});

	it('does not change its input', () => {
		const input = v0();
		migrateGraph(input);
		expect(input).toEqual(v0());
	});

	it('passes a current-version file through unchanged', () => {
		const current = migrateGraph(v0()).graph;
		const again = migrateGraph(current);

		expect(again.fromVersion).toBe(CURRENT_GRAPH_VERSION);
		expect(again.applied).toEqual([]);
		expect(again.graph).toEqual(current);
	});

	it('refuses files from a newer app version', () => {
		const doc = { ...v0(), metadata: { format: GRAPH_FORMAT, version: CURRENT_GRAPH_VERSION + 1 } };
		expect(() => migrateGraph(doc)).toThrow(/newer than this app/);
	});
});

describe('stampCurrentVersion', () => {
	it('sets format and current version, keeping other metadata', () => {
		const graph = migrateGraph(v0()).graph;
		const stamped = stampCurrentVersion({
			...graph,
			metadata: { ...graph.metadata, author: 'x' }
		});
		expect(stamped.metadata).toEqual({
			format: GRAPH_FORMAT,
			version: CURRENT_GRAPH_VERSION,
			author: 'x'
		});
	});
});
