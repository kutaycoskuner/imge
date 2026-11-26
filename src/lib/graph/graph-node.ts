// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-26
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// graph-node.ts -- the graph node's data (node type "graph", node-types.ts): another graph,
// shown small inside this one. Two explicit modes:
//   internal  the graph is embedded in the node (content `graph`, in the current file
//             format), so it travels with this graph's file; edited by opening it
//   external  the node refers to a graph kept elsewhere (content `ref`): saved in this
//             browser (by id) or a file in the open folder (by path); the preview always
//             shows its current state; a missing target shows as "not found"
// Pure rules only: reading the mode, reference and embedded graph from a node's content, and
// the preview drawing (boxes and lines fitted into the node). Resolving references, opening
// and converting between the modes need the browser and the folder: file-access.ts.
//
// Used by: node-types.ts (template, label), GraphNode.svelte / GraphPreview.svelte (preview),
// properties/PropsGraphNode.svelte, file-access.ts (open, back, convert), ascii.ts.
// Details: docs/graph-table-and-graph-nodes.md
// -----------------------------------------------------------------------------------------

import { migrateGraph } from './migrations';
import type { Graph, GraphNode, NodeContent } from './types';

export const GRAPH_MODES = ['internal', 'external'] as const;
export type GraphMode = (typeof GRAPH_MODES)[number];

/** Where an external graph is: saved in this browser (its id) or a file in the open folder (its path). */
export type GraphRef = { source: 'browser'; id: string; name: string } | { source: 'folder'; path: string; name: string };

/** The node's mode: content `mode`, internal unless it says external. */
export const graphMode = (content: NodeContent): GraphMode => (content.mode === 'external' ? 'external' : 'internal');

/** The node's reference when it is a valid one, else null. */
export function graphRef(content: NodeContent): GraphRef | null {
	const r = content.ref as Record<string, unknown> | null | undefined;
	if (!r || typeof r !== 'object' || typeof r.name !== 'string') return null;
	if (r.source === 'browser' && typeof r.id === 'string') return { source: 'browser', id: r.id, name: r.name };
	if (r.source === 'folder' && typeof r.path === 'string') return { source: 'folder', path: r.path, name: r.name };
	return null;
}

/** The embedded graph (upgraded to the current format), or null when there is none or it isn't a graph. */
export function embeddedGraph(content: NodeContent): Graph | null {
	if (!content.graph || typeof content.graph !== 'object') return null;
	try {
		return migrateGraph(content.graph).graph;
	} catch {
		return null;
	}
}

/** Where the reference points, in words: "in this browser" / "in the folder". */
export const refPlace = (ref: GraphRef): string => (ref.source === 'browser' ? 'in this browser' : 'in the folder');

/** A graph node's label in lists: its name, else its target's name, else "Graph". */
export function graphNodeLabel(node: GraphNode): string {
	if (typeof node.content.name === 'string' && node.content.name.trim()) return node.content.name;
	return graphRef(node.content)?.name ?? 'Graph';
}

/** The preview box's size at scale 1 (world units). */
export const PREVIEW_SIZE = { w: 220, h: 140 };

/** One shape of the preview, in the preview's own units (0..w, 0..h, y down). */
export interface PreviewBox {
	x: number;
	y: number;
	w: number;
	h: number;
	kind: 'node' | 'group' | 'text';
}
export interface PreviewLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

// a node's rough size in the preview: the real sizes need the drawn page, which a small
// overview doesn't; groups use their stored frame, other nodes a typical box
const ROUGH = { w: 120, h: 44 };

/**
 * A graph as a small schematic: every node a box (groups as frames, behind), every link a
 * straight line between box centres, fitted into w × h with a margin, keeping proportions.
 * World y points up, the preview's y down.
 */
export function previewOf(g: Graph, w: number = PREVIEW_SIZE.w, h: number = PREVIEW_SIZE.h, margin = 8): { boxes: PreviewBox[]; lines: PreviewLine[] } {
	const nodes = g.data.nodes;
	if (nodes.length === 0) return { boxes: [], lines: [] };
	const size = (n: GraphNode) => {
		const num = (v: unknown, f: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : f);
		return n.type === 'group' ? { w: num(n.content.width, 320), h: num(n.content.height, 192) } : ROUGH;
	};
	const world = nodes.map((n) => ({ n, x: n.position.x, top: n.position.y, ...size(n) }));
	const minX = Math.min(...world.map((b) => b.x));
	const maxX = Math.max(...world.map((b) => b.x + b.w));
	const maxY = Math.max(...world.map((b) => b.top));
	const minY = Math.min(...world.map((b) => b.top - b.h));
	const scale = Math.min((w - 2 * margin) / Math.max(1, maxX - minX), (h - 2 * margin) / Math.max(1, maxY - minY));
	// centred in the box
	const ox = (w - (maxX - minX) * scale) / 2;
	const oy = (h - (maxY - minY) * scale) / 2;
	const at = new Map<string, PreviewBox>();
	const boxes = world
		.map(({ n, x, top, w: bw, h: bh }) => {
			const box: PreviewBox = {
				x: ox + (x - minX) * scale,
				y: oy + (maxY - top) * scale,
				w: bw * scale,
				h: bh * scale,
				kind: n.type === 'group' ? 'group' : n.type === 'text' ? 'text' : 'node'
			};
			at.set(n.id, box);
			return box;
		})
		.sort((a, b) => Number(b.kind === 'group') - Number(a.kind === 'group')); // frames first, behind
	const centre = (b: PreviewBox) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
	const lines = g.data.links.flatMap((l) => {
		const a = at.get(l.source.node);
		const b = at.get(l.target.node);
		if (!a || !b) return [];
		const p = centre(a);
		const q = centre(b);
		return [{ x1: p.x, y1: p.y, x2: q.x, y2: q.y }];
	});
	return { boxes, lines };
}
