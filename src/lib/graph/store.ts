// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// store.ts -- the open graph, the selection, display settings, and every create/update/
// delete operation on nodes and links (graph format v6, see docs/graph-format.md).
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
// Nodes (v6): id, type, typeVersion, position, ports (one list, each port with a kind) and
// content (whatever the type defines; basic / group: name, color). Node types (node-types.ts)
// give a node its ports and content: addNode / setNodeType build and reshape nodes from them.
// Links: which port kinds may connect is decided in one place, CAN_LINK; a stored link always
// runs from the giving end (out / any) to the taking end (in / any). Groups (type "group")
// are frames drawn behind other nodes, with no ports; links never start or end at a group.
//
// Copy / paste: copyNodes() takes the selected nodes and the links between them into
// `nodeClipboard`, pasteNodes() adds them again with new ids at another place.
//
// Used by: routes/+page.svelte, GraphNode, GraphLinks, GraphEditorMenu, UI_GraphEditor,
// file-access.ts. Details: docs/graph-editing.md, docs/graph-format.md
// -----------------------------------------------------------------------------------------

import { writable, derived, get, type Writable } from 'svelte/store';
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
	type Direction,
	type Port,
	type PortKind,
	type NodeContent,
	PORT_KINDS
} from './types';
import { nodeType } from './node-types';
import {
	groupFrames,
	pruneChildren,
	withDescendants,
	groupChildren,
	parentOf,
	setGroupMembership,
	groupAt,
	type Rect,
	type Sizes
} from './groups';
import { GROUP_MIN } from './node-types';

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
		metadata: { format: GRAPH_FORMAT, version: 6, direction: 'left-to-right' },
		data: { nodes: [], links: [] }
	};
}

export const graph = writable<Graph>(emptyGraph());
export const selection = writable<Selection>({ nodes: [], link: null });
export const editingNodeId = writable<string | null>(null); // node whose name is being edited
export const editingLinkId = writable<string | null>(null); // link whose name is being edited

/** Rendered size of every node (world units), measured by GraphLinks after each graph change. */
export const nodeSizes = writable<Sizes>({});
/** Every group's frame: its stored rect grown around its children (groups.ts). */
export const frames = derived([graph, nodeSizes], ([$graph, $sizes]): Record<string, Rect> => groupFrames($graph, $sizes));

/** Copied nodes (Ctrl+C) and the links between them, kept in memory for this tab. */
export interface NodeClipboard {
	nodes: GraphNode[];
	links: Link[];
}
export const nodeClipboard = writable<NodeClipboard | null>(null);

// -----------------------------------------------------------------------------------------
// display settings: change only how links are drawn, never the graph; kept in this browser
// -----------------------------------------------------------------------------------------
export const linkShapeOverride = writable<LinkShape | null>(null); // null = each link's own
export const linkArrowOverride = writable<LinkArrow | null>(null); // null = each link's own
export const showChevrons = writable<boolean>(false); // direction chevrons in the middle of links
export const showDotGrid = writable<boolean>(true); // the background dot grid
export const snapToGrid = writable<boolean>(true); // dragged nodes snap to half grid squares
export const showPropertiesPanel = writable<boolean>(true); // the docked Properties panel (N)

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
		persistHidden(snapToGrid, 'imge.graphEditor.noSnap'),
		persistHidden(showPropertiesPanel, 'imge.graphEditor.hidePropertiesPanel')
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
/**
 * Adds a basic node built from the basic type's template (ports, content), roughly centered on
 * `at` (world coords); `name` replaces the template's default name.
 */
export function addNode(g: Graph, at: Point, name?: string): { graph: Graph; node: GraphNode } {
	const basic = nodeType('basic')!;
	const node: GraphNode = {
		id: nextNodeId(g),
		type: 'basic',
		typeVersion: basic.version!,
		position: { x: Math.round(at.x + NEW_NODE_OFFSET.x), y: Math.round(at.y + NEW_NODE_OFFSET.y) },
		ports: structuredClone(basic.ports!),
		content: { ...structuredClone(basic.content!), ...(name !== undefined ? { name } : {}) }
	};
	return { graph: withNodes(g, [...g.data.nodes, node]), node };
}

/**
 * Sets a node's name (`content.name`, for types whose content has one); an empty or blank
 * name keeps the old one. A node whose content has no name is left as it is.
 */
export function renameNode(g: Graph, nodeId: string, name: string): Graph {
	const trimmed = name.trim();
	const node = g.data.nodes.find((n) => n.id === nodeId);
	if (!trimmed || !node || !('name' in node.content)) return g;
	return withNodes(
		g,
		g.data.nodes.map((n) => (n.id === nodeId ? { ...n, content: { ...n.content, name: trimmed } } : n))
	);
}

/** Places one node's top-left corner at a world point (Properties panel); same graph if unchanged. */
export function setNodePosition(g: Graph, nodeId: string, at: Point): Graph {
	const node = g.data.nodes.find((n) => n.id === nodeId);
	if (!node || (node.position.x === at.x && node.position.y === at.y)) return g;
	return withNodes(
		g,
		g.data.nodes.map((n) => (n.id === nodeId ? { ...n, position: { x: at.x, y: at.y } } : n))
	);
}

/** A group: a frame around other nodes, drawn behind them, without ports or links. */
export const isGroup = (node: GraphNode): boolean => node.type === 'group';

/** Whether any link starts or ends at the node. */
export const hasLinks = (g: Graph, nodeId: string): boolean =>
	g.data.links.some((l) => l.source.node === nodeId || l.target.node === nodeId);

/**
 * Sets a node's `type` (Properties panel) and reshapes it to that type's template
 * (node-types.ts), port kind by port kind: a kind the type has no ports of is removed from
 * the node (with the links on those ports); a kind it has keeps the node's own ports, or gets
 * the template's when the node has none. `content` gets the template's keys it lacks (what it
 * has is kept, so a name survives basic -> group -> basic); `typeVersion` follows the type.
 * An unknown type keeps ports and content. All in one step, so one undo restores everything.
 * Same graph if the type is unchanged.
 */
export function setNodeType(g: Graph, nodeId: string, type: string): Graph {
	const node = g.data.nodes.find((n) => n.id === nodeId);
	if (!node || node.type === type) return g;
	const template = nodeType(type);
	const reshape = (wanted: Port[]): Port[] =>
		PORT_KINDS.flatMap((kind) => {
			const own = node.ports.filter((p) => p.kind === kind);
			const theirs = wanted.filter((p) => p.kind === kind);
			return theirs.length === 0 ? [] : own.length ? own : structuredClone(theirs);
		});
	const shaped: GraphNode = {
		...node,
		type,
		typeVersion: template?.version ?? node.typeVersion,
		ports: template?.ports ? reshape(template.ports) : node.ports,
		content: template?.content ? { ...structuredClone(template.content), ...node.content } : node.content
	};
	const has = (port: string) => shaped.ports.some((p) => p.id === port);
	const keeps = (l: Link) => (l.source.node !== nodeId || has(l.source.port)) && (l.target.node !== nodeId || has(l.target.port));
	return {
		...g,
		data: { ...g.data, nodes: g.data.nodes.map((n) => (n.id === nodeId ? shaped : n)), links: g.data.links.filter(keeps) }
	};
}

/**
 * Sets the colour of the given nodes (Properties panel): "#rrggbb", or null for the theme's
 * default look. Returns the same graph when every node already has it (no undo step).
 */
export function setNodeColor(g: Graph, nodeIds: string[], color: string | null): Graph {
	// only nodes whose type keeps a colour (content has `color`) are coloured
	const ids = new Set(g.data.nodes.filter((n) => nodeIds.includes(n.id) && 'color' in n.content).map((n) => n.id));
	if (!g.data.nodes.some((n) => ids.has(n.id) && n.content.color !== color)) return g;
	return withNodes(g, g.data.nodes.map((n) => (ids.has(n.id) ? { ...n, content: { ...n.content, color } } : n)));
}

/**
 * Sets keys of a node's `content` (a type's own Properties section, e.g. a UML class's
 * attributes and methods); other keys stay. Returns the same graph when every given value is
 * already there (compared as JSON, so lists count as equal by their items), so no undo step.
 */
export function setNodeContent(g: Graph, nodeId: string, patch: NodeContent): Graph {
	const node = g.data.nodes.find((n) => n.id === nodeId);
	if (!node || Object.entries(patch).every(([k, v]) => JSON.stringify(node.content[k]) === JSON.stringify(v))) return g;
	return withNodes(g, g.data.nodes.map((n) => (n.id === nodeId ? { ...n, content: { ...n.content, ...structuredClone(patch) } } : n)));
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

/**
 * Removes nodes and every link attached to them. A removed group's children stay (no longer in
 * a group); removed nodes leave the group they were in.
 */
export function removeNodes(g: Graph, nodeIds: string[]): Graph {
	const ids = new Set(nodeIds);
	return pruneChildren({
		...g,
		data: {
			...g.data,
			nodes: g.data.nodes.filter((n) => !ids.has(n.id)),
			links: g.data.links.filter((l) => !ids.has(l.source.node) && !ids.has(l.target.node))
		}
	});
}

// -----------------------------------------------------------------------------------------
// group / ungroup (Ctrl+G, Ctrl+Shift+G)
// -----------------------------------------------------------------------------------------
/**
 * Ctrl+G. With exactly one group among several selected nodes, the other nodes join that group
 * (`added` true). Otherwise the nodes go into a new group, which starts at their top-left
 * corner with the smallest size, so its frame is just its children plus the margin
 * (groups.ts); when all the nodes were in the same group, the new group goes into that one.
 *
 * Returns:
 *     The new graph, the group's id (the existing or the new one; null when there is nothing
 *     to group) and whether the nodes were added to an existing group.
 */
export function groupNodes(g: Graph, nodeIds: string[]): { graph: Graph; groupId: string | null; added: boolean } {
	const nodes = g.data.nodes.filter((n) => nodeIds.includes(n.id));
	if (!nodes.length) return { graph: g, groupId: null, added: false };
	const selectedGroups = nodes.filter(isGroup);
	if (selectedGroups.length === 1 && nodes.length > 1) {
		const target = selectedGroups[0];
		const others = nodes.filter((n) => n.id !== target.id).map((n) => n.id);
		return { graph: setGroupMembership(g, others, target.id), groupId: target.id, added: true };
	}
	const parents = new Set(nodes.map((n) => parentOf(g, n.id)?.id ?? null));
	const shared = parents.size === 1 ? [...parents][0] : null;
	const left = Math.min(...nodes.map((n) => n.position.x));
	const top = Math.max(...nodes.map((n) => n.position.y));
	const template = nodeType('group')!;
	const group: GraphNode = {
		id: nextNodeId(g),
		type: 'group',
		typeVersion: template.version!,
		position: { x: left, y: top },
		ports: [],
		content: { ...structuredClone(template.content!), width: GROUP_MIN, height: GROUP_MIN }
	};
	let next = withNodes(g, [...g.data.nodes, group]);
	next = setGroupMembership(next, nodes.map((n) => n.id), group.id);
	if (shared) next = setGroupMembership(next, [group.id], shared);
	return { graph: next, groupId: group.id, added: false };
}

/**
 * Ungroups (Ctrl+Shift+G): a selected group is dissolved (removed; what it held goes to the
 * group it was in, or out of groups); a selected node in a group leaves it for that group's
 * own parent. Returns the new graph and the ids that were affected (the freed children and
 * the nodes taken out), or the same graph when nothing changes.
 */
export function ungroupNodes(g: Graph, nodeIds: string[]): { graph: Graph; freed: string[] } {
	let next = g;
	const freed: string[] = [];
	for (const id of nodeIds) {
		const node = next.data.nodes.find((n) => n.id === id);
		if (!node) continue;
		if (node.type === 'group') {
			const children = groupChildren(next, node);
			const outer = parentOf(next, id)?.id ?? null;
			next = setGroupMembership(next, children, outer);
			next = removeNodes(next, [id]);
			freed.push(...children);
		} else {
			const parent = parentOf(next, id);
			if (!parent) continue;
			next = setGroupMembership(next, [id], parentOf(next, parent.id)?.id ?? null);
			freed.push(id);
		}
	}
	return { graph: next, freed };
}

// -----------------------------------------------------------------------------------------
// copy / paste
// -----------------------------------------------------------------------------------------
/**
 * Copies nodes (Ctrl+C): deep copies of them, in graph order, plus the links whose both
 * ends are among them (links to nodes left out are not copied). Doesn't change the graph.
 */
export function copyNodes(g: Graph, nodeIds: string[]): NodeClipboard {
	// a copied group takes what it holds along
	const ids = new Set(withDescendants(g, nodeIds));
	return structuredClone({
		nodes: g.data.nodes.filter((n) => ids.has(n.id)),
		links: g.data.links.filter((l) => ids.has(l.source.node) && ids.has(l.target.node))
	});
}

/**
 * Pastes copied nodes (Ctrl+V) as new nodes with new ids, keeping their layout and the links
 * between them (also with new ids; names, ports and looks are kept).
 *
 * Args:
 *     clip: what copyNodes returned; it may come from an earlier version of the graph.
 *     at: world point for the top-left corner of the pasted group (the box around the nodes'
 *         top-left corners).
 *
 * Returns:
 *     The new graph and the new node ids, in the clipboard's order.
 */
export function pasteNodes(g: Graph, clip: NodeClipboard, at: Point): { graph: Graph; nodeIds: string[] } {
	if (clip.nodes.length === 0) return { graph: g, nodeIds: [] };
	const dx = at.x - Math.min(...clip.nodes.map((n) => n.position.x));
	const dy = at.y - Math.max(...clip.nodes.map((n) => n.position.y)); // y up: top = highest
	const newId = new Map<string, string>();
	const nodes: GraphNode[] = [];
	for (const node of structuredClone(clip.nodes)) {
		const id = nextId([...g.data.nodes, ...nodes], 'n');
		newId.set(node.id, id);
		nodes.push({ ...node, id, position: { x: node.position.x + dx, y: node.position.y + dy } });
	}
	// a pasted group holds the pasted copies of its children (children not copied are dropped)
	for (const node of nodes) {
		if (Array.isArray(node.content.children)) {
			node.content.children = (node.content.children as string[]).map((id) => newId.get(id)).filter((id): id is string => !!id);
		}
	}
	const links: Link[] = [];
	for (const link of structuredClone(clip.links)) {
		links.push({
			...link,
			id: nextId([...g.data.links, ...links], 'l'),
			source: { ...link.source, node: newId.get(link.source.node)! },
			target: { ...link.target, node: newId.get(link.target.node)! }
		});
	}
	return {
		graph: { ...g, data: { ...g.data, nodes: [...g.data.nodes, ...nodes], links: [...g.data.links, ...links] } },
		nodeIds: nodes.map((n) => n.id)
	};
}

// -----------------------------------------------------------------------------------------
// links
// -----------------------------------------------------------------------------------------
/**
 * Which port kinds may be linked, the only place this is decided: an output links to an
 * input, an input to an output, a two-way port (any) to everything.
 */
export const CAN_LINK: Record<PortKind, PortKind[]> = {
	out: ['in', 'any'],
	in: ['out', 'any'],
	any: ['in', 'out', 'any']
};

/** The port a link end points at; undefined for a missing node / port, or a group's. */
export function portOf(g: Graph, end: LinkEnd): Port | undefined {
	const node = g.data.nodes.find((n) => n.id === end.node);
	return node && !isGroup(node) ? node.ports.find((p) => p.id === end.port) : undefined;
}

const sameEnd = (a: LinkEnd, b: LinkEnd) => a.node === b.node && a.port === b.port;

/**
 * Connects two ports, following the link rules: the two ends' kinds must be allowed by
 * CAN_LINK. The ends may come in either order (e.g. a drag that started at an input): the
 * stored link always runs from the giving end (out, or any) to the taking end (in, or any).
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
 *     'unknown-port' (missing node / port, a group's port, or kinds CAN_LINK doesn't allow).
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
	const from = portOf(g, link.source);
	const to = portOf(g, link.target);
	if (!from || !to || !CAN_LINK[from.kind].includes(to.kind)) return { graph: g, outcome: 'unknown-port' };
	// stored from the giving to the taking end, so arrows and drawing read it one way
	if (from.kind === 'in' || (from.kind === 'any' && to.kind === 'out')) {
		link = { ...link, source: link.target, target: link.source };
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

/**
 * Sets how one link is drawn (Properties panel): any of shape, arrow and route. Returns the
 * same graph when nothing changes, so it doesn't make an undo step.
 */
export function setLinkStyle(
	g: Graph,
	linkId: string,
	style: Partial<Pick<Link, 'shape' | 'arrow' | 'route'>>
): Graph {
	const link = g.data.links.find((l) => l.id === linkId);
	if (!link || Object.entries(style).every(([key, value]) => link[key as keyof Link] === value)) return g;
	return withLinks(g, (l) => (l.id === linkId ? { ...l, ...style } : l));
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
	if (!a || !b || a === b || isGroup(a) || isGroup(b)) return null;
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
	// the first port that gives links on one node, the first that takes them on the other
	const output = from.ports.find((p) => p.kind === 'out' || p.kind === 'any');
	const input = to.ports.find((p) => p.kind === 'in' || p.kind === 'any');
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

/**
 * Box selection (Shift+drag on empty space): the nodes that were selected when the drag
 * began, plus the nodes the box touches now, in that order. Recomputed from `base` on
 * every mouse move, so nodes the box leaves again drop out. Always clears a selected link.
 */
export function selectBox(base: Selection, hitIds: string[]): Selection {
	return { nodes: [...base.nodes, ...hitIds.filter((id) => !base.nodes.includes(id))], link: null };
}

// -----------------------------------------------------------------------------------------
// store actions (used by the page and the toolbar)
// -----------------------------------------------------------------------------------------
/** Adds a node centered on a world point to the open graph (it joins the group it is made in) and selects only it. */
export function createNodeAt(at: Point): GraphNode {
	let created!: GraphNode;
	// made inside a group's frame: it joins that group (the innermost one), in the same step
	const into = groupAt(get(graph), get(frames), at, []);
	graph.update((g) => {
		const result = addNode(g, at);
		created = result.node;
		return into ? setGroupMembership(result.graph, [created.id], into.id) : result.graph;
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
