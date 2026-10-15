// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.ts -- the open graph, the selection, and every create/update/delete operation on
// nodes and links (graph format v3, see docs/graph-format.md).
//
// Operations are pure functions (graph in, new graph out) so they are easy to test and
// never half-apply; components call them through `graph.update(g => op(g, ...))`.
// Link rules live in addLink(): output -> input only, no self-links, no exact duplicates
// (same output port to same input port); otherwise any number of links may meet at a port.
// Links are identified by their own id, which never changes when a link is edited.
// Id scheme: nodes n1, n2 ..., links l1, l2 ..., ports per node i1, i2 ... / o1, o2 ...
// Links carry their drawing shape (spline / line / manhattan + bend); linkShapeOverride can
// draw all links in one shape for display only, setAllLinkShapes writes one shape into all.
//
// Used by: routes/+page.svelte, GraphNode, GraphLinks, UI_GraphEditor, file-access.ts.
// Details: docs/graph-editing.md, docs/graph-format.md
// -----------------------------------------------------------------------------------------

import { writable } from 'svelte/store';
import {
	GRAPH_FORMAT,
	LINK_SHAPES,
	type Graph,
	type GraphNode,
	type Link,
	type LinkEnd,
	type LinkShape
} from './types';

export interface Point {
	x: number;
	y: number;
}

export interface Selection {
	nodes: string[]; // node ids, in selection order
	link: string | null; // link id
}

/** What addLink did: 'added', or why the graph is unchanged. */
export type LinkOutcome = 'added' | 'exists' | 'self-link' | 'unknown-port';

// a new node's top-left is placed this far from the requested point, so the node appears
// roughly centered on it (a default node is about 192 x 80 px at zoom 1)
const NEW_NODE_OFFSET: Point = { x: -96, y: 40 };

export function emptyGraph(): Graph {
	return { metadata: { format: GRAPH_FORMAT, version: 3 }, data: { nodes: [], links: [] } };
}

export const graph = writable<Graph>(emptyGraph());
export const selection = writable<Selection>({ nodes: [], link: null });
export const editingNodeId = writable<string | null>(null); // node whose name is being edited

// display-only override: draws every link in this shape without changing any link's data;
// null = each link is drawn in its own shape. A view setting, never written to the file.
export const linkShapeOverride = writable<LinkShape | null>(null);
const OVERRIDE_KEY = 'imge.graphEditor.linkShapeOverride';

/** Restores the display override from this browser and keeps it there. Call once (onMount). */
export function persistLinkShapeOverride(): () => void {
	try {
		const saved = localStorage.getItem(OVERRIDE_KEY);
		if ((LINK_SHAPES as readonly string[]).includes(saved ?? '')) linkShapeOverride.set(saved as LinkShape);
	} catch {
		// storage blocked: the override just isn't remembered
	}
	return linkShapeOverride.subscribe((shape) => {
		try {
			if (shape) localStorage.setItem(OVERRIDE_KEY, shape);
			else localStorage.removeItem(OVERRIDE_KEY);
		} catch {
			// storage blocked
		}
	});
}

// -----------------------------------------------------------------------------------------
// ids
// -----------------------------------------------------------------------------------------
/** Next free node id: "n" + one above the highest "n<number>" id (n1, n2 ...); never reused. */
export function nextNodeId(g: Graph): string {
	return nextId(g.data.nodes, 'n');
}

/** Next free link id: "l" + one above the highest "l<number>" id (l1, l2 ...); never reused. */
export function nextLinkId(g: Graph): string {
	return nextId(g.data.links, 'l');
}

// "<prefix><n>" with n one above the highest number already used with that prefix;
// ids in another form are ignored
function nextId(items: { id: string }[], prefix: string): string {
	const pattern = new RegExp(`^${prefix}(\\d+)$`);
	const numbers = items
		.map((item) => pattern.exec(item.id))
		.filter((m): m is RegExpExecArray => m !== null)
		.map((m) => Number(m[1]));
	return `${prefix}${Math.max(0, ...numbers) + 1}`;
}

// -----------------------------------------------------------------------------------------
// nodes
// -----------------------------------------------------------------------------------------
/** Adds a node with one input and one output, roughly centered on `at` (world coords). */
export function addNode(g: Graph, at: Point, name = 'Node'): { graph: Graph; node: GraphNode } {
	const node: GraphNode = {
		id: nextNodeId(g),
		name,
		type: 'basic',
		color: null,
		position: { x: Math.round(at.x + NEW_NODE_OFFSET.x), y: Math.round(at.y + NEW_NODE_OFFSET.y) },
		inputs: [{ id: 'i1', type: 'basic', label: 'Input' }],
		outputs: [{ id: 'o1', type: 'basic', label: 'Output' }]
	};
	return { graph: withNodes(g, [...g.data.nodes, node]), node };
}

/** Sets a node's name; an empty or blank name keeps the old one. */
export function renameNode(g: Graph, nodeId: string, name: string): Graph {
	const trimmed = name.trim();
	if (!trimmed) return g;
	return withNodes(
		g,
		g.data.nodes.map((n) => (n.id === nodeId ? { ...n, name: trimmed } : n))
	);
}

/** Moves the given nodes by a world-space delta. */
export function moveNodes(g: Graph, nodeIds: string[], dx: number, dy: number): Graph {
	const ids = new Set(nodeIds);
	return withNodes(
		g,
		g.data.nodes.map((n) =>
			ids.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n
		)
	);
}

/** Removes nodes and every link attached to them. */
export function removeNodes(g: Graph, nodeIds: string[]): Graph {
	const ids = new Set(nodeIds);
	return {
		...g,
		data: {
			...g.data,
			nodes: g.data.nodes.filter((n) => !ids.has(n.id)),
			links: g.data.links.filter((l) => !ids.has(l.source.node) && !ids.has(l.target.node))
		}
	};
}

// -----------------------------------------------------------------------------------------
// links
// -----------------------------------------------------------------------------------------
const hasPort = (g: Graph, end: LinkEnd, kind: 'inputs' | 'outputs') =>
	g.data.nodes.some((n) => n.id === end.node && n[kind].some((p) => p.id === end.port));

const sameEnd = (a: LinkEnd, b: LinkEnd) => a.node === b.node && a.port === b.port;

/**
 * Connects an output port (`source`) to an input port (`target`), following the link rules.
 *
 * Args:
 *     link: the two ends, plus optional `type`, `name`, `shape` (default spline), `bend`
 *         and `id` -- pass the old id, shape and bend when re-routing a link so it keeps
 *         its identity and look (the id is ignored if another link uses it).
 *
 * Returns:
 *     The new graph, what happened, and the new link when one was added. With any outcome
 *     other than 'added' the graph is unchanged: 'exists' (this exact link is there),
 *     'self-link', or 'unknown-port' (missing node/port, or an input used as source).
 */
export function addLink(
	g: Graph,
	link: {
		source: LinkEnd;
		target: LinkEnd;
		type?: string;
		name?: string;
		id?: string;
		shape?: LinkShape;
		bend?: number;
	}
): { graph: Graph; outcome: LinkOutcome; link?: Link } {
	if (link.source.node === link.target.node) return { graph: g, outcome: 'self-link' };
	if (!hasPort(g, link.source, 'outputs') || !hasPort(g, link.target, 'inputs')) {
		return { graph: g, outcome: 'unknown-port' };
	}
	if (findLink(g, link.source, link.target)) return { graph: g, outcome: 'exists' };

	const idFree = link.id && !g.data.links.some((l) => l.id === link.id);
	const created: Link = {
		id: idFree ? link.id! : nextLinkId(g),
		type: link.type ?? 'basic',
		...(link.name ? { name: link.name } : {}),
		shape: link.shape ?? 'spline',
		...(link.bend !== undefined ? { bend: link.bend } : {}),
		source: { ...link.source },
		target: { ...link.target }
	};
	return {
		graph: { ...g, data: { ...g.data, links: [...g.data.links, created] } },
		outcome: 'added',
		link: created
	};
}

/** Switches one link to the next shape: spline -> line -> manhattan -> spline. */
export function cycleLinkShape(g: Graph, linkId: string): Graph {
	return withLinks(g, (l) =>
		l.id === linkId
			? { ...l, shape: LINK_SHAPES[(LINK_SHAPES.indexOf(l.shape) + 1) % LINK_SHAPES.length] }
			: l
	);
}

/** Sets every link's shape ("apply to all links"); bends are kept for when they are manhattan again. */
export function setAllLinkShapes(g: Graph, shape: LinkShape): Graph {
	return withLinks(g, (l) => ({ ...l, shape }));
}

/** Moves a manhattan link's vertical segment: 0 = at the output, 1 = at the input. */
export function setLinkBend(g: Graph, linkId: string, bend: number): Graph {
	const clamped = Math.min(1, Math.max(0, bend));
	return withLinks(g, (l) => (l.id === linkId ? { ...l, bend: clamped } : l));
}

export function removeLink(g: Graph, linkId: string): Graph {
	return { ...g, data: { ...g.data, links: g.data.links.filter((l) => l.id !== linkId) } };
}

/** The link from this output to this input, if there is one. */
export function findLink(g: Graph, source: LinkEnd, target: LinkEnd): Link | undefined {
	return g.data.links.find((l) => sameEnd(l.source, source) && sameEnd(l.target, target));
}

/** All links going into an input port, oldest first. */
export function linksInto(g: Graph, target: LinkEnd): Link[] {
	return g.data.links.filter((l) => sameEnd(l.target, target));
}

/**
 * Picks the link the F shortcut makes between two nodes: the first output of one into the
 * first input of the other. Left to right is tried first (the usual reading direction of
 * a graph); if that isn't possible or already exists, right to left.
 *
 * Returns:
 *     The link's ends, or null when either node is missing or neither direction works.
 */
export function quickLink(
	g: Graph,
	nodeIdA: string,
	nodeIdB: string
): { source: LinkEnd; target: LinkEnd } | null {
	const a = g.data.nodes.find((n) => n.id === nodeIdA);
	const b = g.data.nodes.find((n) => n.id === nodeIdB);
	if (!a || !b || a === b) return null;
	const [left, right] = a.position.x <= b.position.x ? [a, b] : [b, a];
	return linkBetween(g, left, right) ?? linkBetween(g, right, left);
}

function linkBetween(
	g: Graph,
	from: GraphNode,
	to: GraphNode
): { source: LinkEnd; target: LinkEnd } | null {
	const output = from.outputs[0];
	const input = to.inputs[0];
	if (!output || !input) return null;
	const ends = { source: { node: from.id, port: output.id }, target: { node: to.id, port: input.id } };
	return findLink(g, ends.source, ends.target) ? null : ends;
}

// -----------------------------------------------------------------------------------------
// selection
// -----------------------------------------------------------------------------------------
/**
 * Selects a node. With `additive` (Shift+click) it toggles the node in the selection;
 * without, a node that is already selected keeps the selection so a group can be dragged.
 */
export function selectNode(sel: Selection, nodeId: string, additive: boolean): Selection {
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
	selection.set({ nodes: [created.id], link: null });
	return created;
}

// -----------------------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------------------
function withNodes(g: Graph, nodes: GraphNode[]): Graph {
	return { ...g, data: { ...g.data, nodes } };
}

function withLinks(g: Graph, change: (link: Link) => Link): Graph {
	return { ...g, data: { ...g.data, links: g.data.links.map(change) } };
}
