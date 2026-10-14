// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.ts -- the open graph, the selection, and every create/update/delete operation on
// nodes and links.
//
// Operations are pure functions (graph in, new graph out) so they are easy to test and
// never half-apply; components call them through `graph.update(g => op(g, ...))`.
// Link rules live in addLink(): output -> input only, no self-links, one link per input
// (a new one replaces the old), outputs may feed many inputs. Because of the one-per-input
// rule, a link is identified by its target node + target input (`LinkKey`).
//
// Used by: routes/+page.svelte, GraphNode, GraphLinks, UI_GraphEditor.
// Details: docs/graph-editor-canvas.md ("Editing nodes and links"), docs/graph-format.md
// -----------------------------------------------------------------------------------------

import { writable } from 'svelte/store';
import { GRAPH_FORMAT, type Graph, type GraphNode, type Link } from './types';

export interface Point {
	x: number;
	y: number;
}

export interface LinkKey {
	targetNodeId: number;
	targetInputId: string;
}

export interface Selection {
	nodes: number[]; // in selection order
	link: LinkKey | null;
}

export type LinkOutcome = 'added' | 'replaced' | 'exists' | 'self-link' | 'unknown-port';

// a new node's top-left is placed this far from the requested point, so the node appears
// roughly centered on it (a default node is about 192 x 80 px at zoom 1)
const NEW_NODE_OFFSET: Point = { x: -96, y: 40 };

export function emptyGraph(): Graph {
	return { metadata: { format: GRAPH_FORMAT, version: 1 }, data: { nodes: [], links: [] } };
}

export const graph = writable<Graph>(emptyGraph());
export const selection = writable<Selection>({ nodes: [], link: null });
export const editingNodeId = writable<number | null>(null); // node whose title is being edited

// -----------------------------------------------------------------------------------------
// nodes
// -----------------------------------------------------------------------------------------
export function nextNodeId(g: Graph): number {
	return g.data.nodes.reduce((max, n) => Math.max(max, n._id), -1) + 1;
}

/** Adds a node with one input and one output, roughly centered on `at` (world coords). */
export function addNode(g: Graph, at: Point, title = 'Node'): { graph: Graph; node: GraphNode } {
	const node: GraphNode = {
		_id: nextNodeId(g),
		type: 'basic',
		position: { x: Math.round(at.x + NEW_NODE_OFFSET.x), y: Math.round(at.y + NEW_NODE_OFFSET.y) },
		data: {
			title,
			inputs: [{ id: 'input_0', type: 'basic', label: 'Input' }],
			outputs: [{ id: 'output_0', type: 'basic', label: 'Output' }]
		}
	};
	return { graph: withNodes(g, [...g.data.nodes, node]), node };
}

/** Sets a node's title; an empty or blank title keeps the old one. */
export function renameNode(g: Graph, nodeId: number, title: string): Graph {
	const trimmed = title.trim();
	if (!trimmed) return g;
	return withNodes(
		g,
		g.data.nodes.map((n) => (n._id === nodeId ? { ...n, data: { ...n.data, title: trimmed } } : n))
	);
}

/** Moves the given nodes by a world-space delta. */
export function moveNodes(g: Graph, nodeIds: number[], dx: number, dy: number): Graph {
	const ids = new Set(nodeIds);
	return withNodes(
		g,
		g.data.nodes.map((n) =>
			ids.has(n._id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n
		)
	);
}

/** Removes nodes and every link attached to them. */
export function removeNodes(g: Graph, nodeIds: number[]): Graph {
	const ids = new Set(nodeIds);
	return {
		...g,
		data: {
			...g.data,
			nodes: g.data.nodes.filter((n) => !ids.has(n._id)),
			links: g.data.links.filter((l) => !ids.has(l.sourceNodeId) && !ids.has(l.targetNodeId))
		}
	};
}

// -----------------------------------------------------------------------------------------
// links
// -----------------------------------------------------------------------------------------
const hasPort = (g: Graph, nodeId: number, kind: 'inputs' | 'outputs', portId: string) =>
	g.data.nodes.some((n) => n._id === nodeId && n.data[kind].some((p) => p.id === portId));

/**
 * Connects an output to an input, following the link rules.
 *
 * Returns:
 *     The new graph and what happened: 'added', 'replaced' (the input had another link),
 *     or, with the graph unchanged, 'exists', 'self-link' or 'unknown-port'.
 */
export function addLink(g: Graph, link: Link): { graph: Graph; outcome: LinkOutcome } {
	if (link.sourceNodeId === link.targetNodeId) return { graph: g, outcome: 'self-link' };
	if (
		!hasPort(g, link.sourceNodeId, 'outputs', link.sourceOutputId) ||
		!hasPort(g, link.targetNodeId, 'inputs', link.targetInputId)
	) {
		return { graph: g, outcome: 'unknown-port' };
	}

	const current = findLinkInto(g, link);
	if (
		current &&
		current.sourceNodeId === link.sourceNodeId &&
		current.sourceOutputId === link.sourceOutputId
	) {
		return { graph: g, outcome: 'exists' };
	}
	const links = g.data.links.filter((l) => !isLinkKey(l, link));
	return {
		graph: { ...g, data: { ...g.data, links: [...links, { ...link }] } },
		outcome: current ? 'replaced' : 'added'
	};
}

export function removeLink(g: Graph, key: LinkKey): Graph {
	return { ...g, data: { ...g.data, links: g.data.links.filter((l) => !isLinkKey(l, key)) } };
}

/** The link going into the given input, if any. */
export function findLinkInto(g: Graph, key: LinkKey): Link | undefined {
	return g.data.links.find((l) => isLinkKey(l, key));
}

export function isLinkKey(link: LinkKey, key: LinkKey | null): boolean {
	return (
		!!key && link.targetNodeId === key.targetNodeId && link.targetInputId === key.targetInputId
	);
}

/**
 * Picks the link the F shortcut makes between two nodes: the first output of one into the
 * first input of the other that has no link yet. Left to right is tried first (the usual
 * reading direction of a graph); if that isn't possible, right to left.
 *
 * Returns:
 *     The link, or null when either node is missing or no direction has an output and a
 *     free input.
 */
export function quickLink(g: Graph, nodeIdA: number, nodeIdB: number): Link | null {
	const a = g.data.nodes.find((n) => n._id === nodeIdA);
	const b = g.data.nodes.find((n) => n._id === nodeIdB);
	if (!a || !b || a === b) return null;
	const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
	return linkBetween(g, left, right) ?? linkBetween(g, right, left);
}

function linkBetween(g: Graph, source: GraphNode, target: GraphNode): Link | null {
	const output = source.data.outputs[0];
	const input = target.data.inputs.find(
		(p) => !findLinkInto(g, { targetNodeId: target._id, targetInputId: p.id })
	);
	if (!output || !input) return null;
	return {
		sourceNodeId: source._id,
		sourceOutputId: output.id,
		targetNodeId: target._id,
		targetInputId: input.id
	};
}

// -----------------------------------------------------------------------------------------
// selection
// -----------------------------------------------------------------------------------------
/**
 * Selects a node. With `additive` (Shift+click) it toggles the node in the selection;
 * without, a node that is already selected keeps the selection so a group can be dragged.
 */
export function selectNode(sel: Selection, nodeId: number, additive: boolean): Selection {
	const selected = sel.nodes.includes(nodeId);
	if (additive) {
		return {
			nodes: selected ? sel.nodes.filter((id) => id !== nodeId) : [...sel.nodes, nodeId],
			link: null
		};
	}
	return selected ? { ...sel, link: null } : { nodes: [nodeId], link: null };
}

// -----------------------------------------------------------------------------------------
// store actions (used by the page and the toolbar)
// -----------------------------------------------------------------------------------------
/** Adds a node centered on a world point to the open graph and selects only it. */
export function createNodeAt(at: Point): GraphNode {
	let created!: GraphNode;
	graph.update((g) => {
		const result = addNode(g, at);
		created = result.node;
		return result.graph;
	});
	selection.set({ nodes: [created._id], link: null });
	return created;
}

// -----------------------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------------------
function withNodes(g: Graph, nodes: GraphNode[]): Graph {
	return { ...g, data: { ...g.data, nodes } };
}
