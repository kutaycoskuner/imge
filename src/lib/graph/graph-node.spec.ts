// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// graph-node.spec.ts -- checks the graph node's data: its mode, its reference (only valid
// ones), the embedded graph (upgraded, or null for something else), its label, and the
// preview (fitted into the box, y flipped, links between box centres, groups behind).
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { emptyGraph } from './store';
import { graphMode, graphRef, embeddedGraph, graphNodeLabel, previewOf } from './graph-node';
import type { Graph, GraphNode } from './types';

const node = (content: Record<string, unknown>): GraphNode =>
	({ id: 'n1', type: 'graph', typeVersion: 1, position: { x: 0, y: 0 }, ports: [], content }) as GraphNode;

describe('mode and reference', () => {
	it('is internal unless it says external', () => {
		expect(graphMode({})).toBe('internal');
		expect(graphMode({ mode: 'external' })).toBe('external');
		expect(graphMode({ mode: 'other' })).toBe('internal');
	});
	it('takes only complete references', () => {
		expect(graphRef({ ref: { source: 'browser', id: 'a1', name: 'map' } })).toEqual({ source: 'browser', id: 'a1', name: 'map' });
		expect(graphRef({ ref: { source: 'folder', path: 'uml/x.json', name: 'x' } })).toEqual({ source: 'folder', path: 'uml/x.json', name: 'x' });
		expect(graphRef({ ref: { source: 'folder', name: 'x' } })).toBeNull();
		expect(graphRef({ ref: null })).toBeNull();
	});
	it('reads the embedded graph, upgrading it; something else is null', () => {
		expect(embeddedGraph({ graph: emptyGraph() })?.data.nodes).toEqual([]);
		expect(embeddedGraph({ graph: { metadata: { format: 'imge-keymap' } } })).toBeNull();
		expect(embeddedGraph({})).toBeNull();
	});
	it('labels by name, then by its target', () => {
		expect(graphNodeLabel(node({ name: 'Billing' }))).toBe('Billing');
		expect(graphNodeLabel(node({ name: '', ref: { source: 'browser', id: 'a', name: 'map' } }))).toBe('map');
		expect(graphNodeLabel(node({}))).toBe('Graph');
	});
});

describe('preview', () => {
	const g: Graph = emptyGraph();
	const withNodes: Graph = {
		...g,
		data: {
			nodes: [
				{ id: 'n1', type: 'basic', typeVersion: 2, position: { x: 0, y: 0 }, ports: [], content: {} },
				{ id: 'n2', type: 'basic', typeVersion: 2, position: { x: 400, y: -200 }, ports: [], content: {} },
				{ id: 'n3', type: 'group', typeVersion: 3, position: { x: -50, y: 50 }, ports: [], content: { width: 600, height: 400 } }
			] as GraphNode[],
			links: [{ id: 'l1', source: { node: 'n1', port: 'o1' }, target: { node: 'n2', port: 'i1' } }] as Graph['data']['links']
		}
	};

	it('is empty for an empty graph', () => {
		expect(previewOf(g)).toEqual({ boxes: [], lines: [] });
	});
	it('fits every box into the preview, groups first', () => {
		const { boxes, lines } = previewOf(withNodes, 220, 140, 8);
		expect(boxes[0].kind).toBe('group');
		for (const b of boxes) {
			expect(b.x).toBeGreaterThanOrEqual(7.99);
			expect(b.y).toBeGreaterThanOrEqual(7.99);
			expect(b.x + b.w).toBeLessThanOrEqual(212.01);
			expect(b.y + b.h).toBeLessThanOrEqual(132.01);
		}
		expect(lines).toHaveLength(1);
		// n2 is lower in the world (y up), so lower in the preview (y down)
		expect(lines[0].y2).toBeGreaterThan(lines[0].y1);
	});
});
