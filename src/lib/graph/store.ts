// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-16
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.ts -- the open graph, the selection, display settings, and every create/update/
// delete operation on nodes and links (graph format v4, see docs/graph-format.md).
//
// Operations are pure functions (graph in, new graph out) so they are easy to test and
// never half-apply; components call them through `graph.update(g => op(g, ...))`.
// Link rules live in addLink(): output -> input only, no exact duplicates (same output port
// to same input port); otherwise any number of links may meet at a port, links may form
// cycles (1 -> 2 -> 1), and a node may link to itself (self-loop).
// Links are identified by their own id, which never changes when a link is edited.
// Id scheme: nodes n1, n2 ..., links l1, l2 ..., ports per node i1, i2 ... / o1, o2 ...
// Links carry how they are drawn: shape (spline / line / manhattan + bend), arrow
// (forward / both / backward / none) and route (above / below, for links that go around
// their nodes: findBackLinks() finds the links that close a cycle). The graph's direction
// (left-to-right / top-to-bottom) sets the reading order; setDirection() turns the
// layout with it. The display overrides
// draw all links one way without changing the data; setAll* write one value into all.
//
// Used by: routes/+page.svelte, GraphNode, GraphLinks, GraphEditorMenu, UI_GraphEditor,
// file-access.ts. Details: docs/graph-editing.md, docs/graph-format.md
// -----------------------------------------------------------------------------------------

import { writable, type Writable } from 'svelte/store';
import {
	GRAPH_FORMAT,
	LINK_ARROWS,
	LINK_SHAPES,
	type Graph,
	type GraphNode,
	type Link,
	type LinkArrow,
	type LinkEnd,
	type LinkRoute,
	type LinkShape,
	type Direction
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
export type LinkOutcome = 'added' | 'exists' | 'unknown-port';

// a new node's top-left is placed this far from the requested point, so the node appears
// roughly centered on it (a default node is about 192 x 80 px at zoom 1)
const NEW_NODE_OFFSET: Point = { x: -96, y: 40 };

export function emptyGraph(): Graph {
	return {
		metadata: { format: GRAPH_FORMAT, version: 5, direction: 'left-to-right' },
		data: { nodes: [], links: [] }
	};
}

export const graph = writable<Graph>(emptyGraph());
export const selection = writable<Selection>({ nodes: [], link: null });
export const editingNodeId = writable<string | null>(null); // node whose name is being edited
export const editingLinkId = writable<string | null>(null); // link whose name is being edited

// -----------------------------------------------------------------------------------------
// display settings: change only how links are drawn, never the graph; kept in this browser
// -----------------------------------------------------------------------------------------
export const linkShapeOverride = writable<LinkShape | null>(null); // null = each link's own
export const linkArrowOverride = writable<LinkArrow | null>(null); // null = each link's own
export const showChevrons = writable<boolean>(false); // direction chevrons in the middle of links
export const showDotGrid = writable<boolean>(true); // the background dot grid
export const snapToGrid = writable<boolean>(true); // dragged nodes snap to half grid squares

/** Restores the display settings from this browser and keeps them there. Call once (onMount). */
export function persistViewSettings(): () => void {
	const stops = [
		persist(linkShapeOverride, 'imge.graphEditor.linkShapeOverride', (v) =>
			(LINK_SHAPES as readonly string[]).includes(v) ? (v as LinkShape) : null
		),
		persist(linkArrowOverride, 'imge.graphEditor.linkArrowOverride', (v) =>
			(LINK_ARROWS as readonly string[]).includes(v) ? (v as LinkArrow) : null
		),
		persist(showChevrons, 'imge.graphEditor.showChevrons', (v) => v === 'true'),
		// stored only when hidden ("false"); the default (shown) leaves nothing behind
		persistHidden(showDotGrid, 'imge.graphEditor.hideDotGrid'),
		persistHidden(snapToGrid, 'imge.graphEditor.noSnap')
	];
	return () => stops.forEach((stop) => stop());
}

// reads a setting (when stored) and writes every change back; storage may be blocked
// (private window), then the setting just isn't remembered
function persist<T>(store: Writable<T>, key: string, parse: (stored: string) => T): () => void {
	try {
		const stored = localStorage.getItem(key);
		if (stored !== null) store.set(parse(stored));
	} catch {
		// storage blocked
	}
	return store.subscribe((value) => {
		try {
			if (value === null || value === false) localStorage.removeItem(key);
			else localStorage.setItem(key, String(value));
		} catch {
			// storage blocked
		}
	});
}

// for a setting that is on by default: remembers only that it was turned off
function persistHidden(store: Writable<boolean>, key: string): () => void {
	try {
		if (localStorage.getItem(key) === 'true') store.set(false);
	} catch {
		// storage blocked
	}
	return store.subscribe((shown) => {
		try {
			if (shown) localStorage.removeItem(key);
			else localStorage.setItem(key, 'true');
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
 * Source and target may be the same node (a self-loop).
 *
 * Args:
 *     link: the two ends, plus optional `type`, `name`, `shape` (default spline), `bend`,
 *         `arrow` (default forward), `route` (default above) and `id` -- pass the old values
 *         when re-routing a link so it keeps its identity and look (the id is ignored if
 *         another link uses it).
 *
 * Returns:
 *     The new graph, what happened, and the new link when one was added. With any outcome
 *     other than 'added' the graph is unchanged: 'exists' (this exact link is there) or
 *     'unknown-port' (missing node/port, or an input used as source).
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
		arrow?: LinkArrow;
		route?: LinkRoute;
	}
): { graph: Graph; outcome: LinkOutcome; link?: Link } {
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
		arrow: link.arrow ?? 'forward',
		route: link.route ?? 'above',
		source: { ...link.source },
		target: { ...link.target }
	};
	return {
		graph: { ...g, data: { ...g.data, links: [...g.data.links, created] } },
		outcome: 'added',
		link: created
	};
}

/** Sets a link's name (shown in the middle of the link); an empty name removes it. */
export function renameLink(g: Graph, linkId: string, name: string): Graph {
	const trimmed = name.trim();
	return withLinks(g, (l) => {
		if (l.id !== linkId) return l;
		const { name: _old, ...rest } = l;
		return trimmed ? { ...rest, name: trimmed } : rest;
	});
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

/** Switches one link to the next arrow: forward -> both -> backward -> none -> forward. */
export function cycleLinkArrow(g: Graph, linkId: string): Graph {
	return withLinks(g, (l) =>
		l.id === linkId
			? { ...l, arrow: LINK_ARROWS[(LINK_ARROWS.indexOf(l.arrow) + 1) % LINK_ARROWS.length] }
			: l
	);
}

/** Sets every link's arrow ("apply to all links"). */
export function setAllLinkArrows(g: Graph, arrow: LinkArrow): Graph {
	return withLinks(g, (l) => ({ ...l, arrow }));
}

/** Flips the side a cycle-closing link or self-loop goes around: above <-> below. */
export function toggleLinkRoute(g: Graph, linkId: string): Graph {
	return withLinks(g, (l) =>
		l.id === linkId ? { ...l, route: l.route === 'above' ? 'below' : 'above' } : l
	);
}

/**
 * Sets a link's `bend`, clamped to 0..1: for a manhattan link the position of its vertical
 * segment (0 = at the output, 1 = at the input); for a link going around its nodes, how far
 * from the nodes it runs (0 = close, 1 = far).
 */
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
 * Finds the links that close a cycle (1 -> 2 -> 1: the link 2 -> 1). These are drawn going
 * around their nodes instead of across them. Self-loops are not included (they are always
 * drawn around their node).
 *
 * Walks the graph depth-first, starting from the first node in reading order (leftmost in a
 * left-to-right graph, topmost in a top-to-bottom one) and following each node's links in
 * reading order of their targets; a link to a node that is on the current walk path closes
 * a cycle. So "earlier in reading order" is the direction, and the link pointing back is
 * the one that goes around.
 *
 * Returns:
 *     The ids of the cycle-closing links.
 */
export function findBackLinks(g: Graph): Set<string> {
	const x = new Map(g.data.nodes.map((n) => [n.id, along(g, n)]));
	const byX = (a: string, b: string) => (x.get(a) ?? 0) - (x.get(b) ?? 0);
	const outgoing = new Map<string, Link[]>();
	for (const link of g.data.links) {
		if (link.source.node === link.target.node) continue; // self-loop
		const list = outgoing.get(link.source.node) ?? [];
		list.push(link);
		outgoing.set(link.source.node, list);
	}
	for (const list of outgoing.values()) list.sort((a, b) => byX(a.target.node, b.target.node));

	const back = new Set<string>();
	const state = new Map<string, 'on-path' | 'done'>();
	const visit = (nodeId: string): void => {
		state.set(nodeId, 'on-path');
		for (const link of outgoing.get(nodeId) ?? []) {
			const next = state.get(link.target.node);
			if (next === 'on-path') back.add(link.id);
			else if (next === undefined) visit(link.target.node);
		}
		state.set(nodeId, 'done');
	};
	for (const nodeId of g.data.nodes.map((n) => n.id).sort(byX)) {
		if (!state.has(nodeId)) visit(nodeId);
	}
	return back;
}

/**
 * Picks the link the F shortcut makes between two nodes: the first output of one into the
 * first input of the other. Left to right is tried first (the usual reading direction of
 * a graph); if that isn't possible or already exists, right to left.
 *
 * Returns:
 *     The link's ends, or null when either node is missing, both are the same node, or
 *     neither direction works.
 */
export function quickLink(
	g: Graph,
	nodeIdA: string,
	nodeIdB: string
): { source: LinkEnd; target: LinkEnd } | null {
	const a = g.data.nodes.find((n) => n.id === nodeIdA);
	const b = g.data.nodes.find((n) => n.id === nodeIdB);
	if (!a || !b || a === b) return null;
	const [first, second] = along(g, a) <= along(g, b) ? [a, b] : [b, a];
	return linkBetween(g, first, second) ?? linkBetween(g, second, first);
}

/** A node's position along the graph's reading direction (x, or downwards for top-to-bottom). */
function along(g: Graph, n: GraphNode): number {
	return g.metadata.direction === 'top-to-bottom' ? -n.position.y : n.position.x;
}

// -----------------------------------------------------------------------------------------
// direction
// -----------------------------------------------------------------------------------------
/**
 * Turns the layout between the two directions: every node's centre (x, y) moves to
 * (-y * k, -x / k), so a left-to-right chain becomes a top-to-bottom one and nodes stacked
 * from top to bottom end up side by side from left to right, in the same order.
 *
 * k is the nodes' average (width + 30) / height: nodes are much wider than tall, so siblings that
 * sat close above each other need more room side by side (and a chain needs less room
 * downwards than sideways); without it they would overlap. The same k applies both ways,
 * which makes the turn its own inverse: doing it twice gives the original positions back.
 * Only positions change, without rounding, so nothing drifts.
 *
 * Args:
 *     sizes: each node's rendered width / height (world units), for its centre and for k;
 *         a node without a size is turned around its top-left corner.
 */
export function transposeGraph(g: Graph, sizes: Record<string, { w: number; h: number }>): Graph {
	// side by side, nodes need their width plus a gap where they had their height before
	const GAP = 30;
	const measured = g.data.nodes.map((n) => sizes[n.id]).filter((s) => s && s.w > 0 && s.h > 0);
	const avg = (pick: (s: { w: number; h: number }) => number) =>
		measured.reduce((sum, s) => sum + pick(s), 0) / measured.length;
	const k = measured.length ? (avg((s) => s.w) + GAP) / avg((s) => s.h) : 1;
	return withNodes(
		g,
		g.data.nodes.map((n) => {
			const { w, h } = sizes[n.id] ?? { w: 0, h: 0 };
			const cx = n.position.x + w / 2;
			const cy = n.position.y - h / 2; // y up: the top-left corner is the centre plus h/2
			return { ...n, position: { x: 0 - cy * k - w / 2, y: 0 - cx / k + h / 2 } };
		})
	);
}

/** Switches the graph's direction and turns the layout with it (see transposeGraph). */
export function setDirection(
	g: Graph,
	direction: Direction,
	sizes: Record<string, { w: number; h: number }>
): Graph {
	if (g.metadata.direction === direction) return g;
	const turned = transposeGraph(g, sizes);
	return { ...turned, metadata: { ...turned.metadata, direction } };
}

/** Rendered size of every node in world units (offsetWidth/Height ignore the zoom). */
export function measureNodeSizes(): Record<string, { w: number; h: number }> {
	const sizes: Record<string, { w: number; h: number }> = {};
	document.querySelectorAll<HTMLElement>('.world .node[data-id]').forEach((el) => {
		sizes[el.dataset.id!] = { w: el.offsetWidth, h: el.offsetHeight };
	});
	return sizes;
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
