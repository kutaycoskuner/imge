// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// types.ts -- TypeScript shapes of the graph file format, one set per format version.
//
// Old versions stay here frozen (never edited) because their adapters in migrations.ts
// read them; only the newest version is used by the rest of the app (`Graph`).
// v6 (current): nodes are id, type, typeVersion, position, ports (one list with `kind`) and
// `content` (whatever the node's type defines, e.g. name and color for basic / group).
// Field-by-field description and version history: docs/graph-format.md
// -----------------------------------------------------------------------------------------

export const GRAPH_FORMAT = 'imge-graph';

// -----------------------------------------------------------------------------------------
// v0 -- unversioned files (before 2026-10-14): empty metadata, positions with y DOWN
// -----------------------------------------------------------------------------------------
export interface PortV0 {
	id: string; // unique only within its node
	type: string;
	label: string;
}

export interface NodeV0 {
	_id: number;
	type: string;
	position: { x: number; y: number };
	data: { title: string; inputs: PortV0[]; outputs: PortV0[] };
}

export interface LinkV0 {
	sourceNodeId: number;
	sourceOutputId: string;
	targetNodeId: number;
	targetInputId: string;
}

export interface GraphV0 {
	metadata: Record<string, unknown>;
	data: { nodes: NodeV0[]; links: LinkV0[] };
}

// -----------------------------------------------------------------------------------------
// v1 -- same shape as v0, plus metadata.format/version; positions with y UP
// -----------------------------------------------------------------------------------------
export type PortV1 = PortV0;
export type NodeV1 = NodeV0;
export type LinkV1 = LinkV0;

export interface GraphV1 {
	metadata: { format: typeof GRAPH_FORMAT; version: 1; [key: string]: unknown };
	data: { nodes: NodeV1[]; links: LinkV1[] };
}

// -----------------------------------------------------------------------------------------
// v2 -- ids n1 / l1 / i1 / o1, `name`, ports directly on the node; links have their own id
// and source/target endpoints, and an input may take many links
// -----------------------------------------------------------------------------------------
export interface PortV2 {
	id: string; // unique only within its node: inputs i1, i2 ..., outputs o1, o2 ...
	type: string;
	label: string;
}

export interface NodeV2 {
	id: string; // unique within the graph: n1, n2 ...
	name: string;
	type: string;
	position: { x: number; y: number }; // top-left corner, world coords, y up
	inputs: PortV2[];
	outputs: PortV2[];
}

export interface LinkEndV2 {
	node: string; // node id
	port: string; // port id within that node
}

export interface LinkV2 {
	id: string; // unique within the graph: l1, l2 ...; it stays the same when the link is re-routed
	type: string;
	name?: string;
	source: LinkEndV2; // an output port
	target: LinkEndV2; // an input port
}

export interface GraphV2 {
	metadata: { format: typeof GRAPH_FORMAT; version: 2; [key: string]: unknown };
	data: { nodes: NodeV2[]; links: LinkV2[] };
}

// -----------------------------------------------------------------------------------------
// v3 -- nodes get a color, links get a drawing shape (and a bend for manhattan links)
// -----------------------------------------------------------------------------------------
export const LINK_SHAPES = ['spline', 'line', 'manhattan'] as const;
export type LinkShape = (typeof LINK_SHAPES)[number];

export type PortV3 = PortV2;
export type LinkEndV3 = LinkEndV2;

export interface NodeV3 extends NodeV2 {
	color: string | null; // CSS color, e.g. "#4a90d9"; null = the theme's default
}

export interface LinkV3 extends LinkV2 {
	shape: LinkShape; // how the link is drawn
	// manhattan only: where the vertical segment sits, as a fraction of the horizontal gap
	// between output (0) and input (1); missing = 0.5 (the middle)
	bend?: number;
}

export interface GraphV3 {
	metadata: { format: typeof GRAPH_FORMAT; version: 3; [key: string]: unknown };
	data: { nodes: NodeV3[]; links: LinkV3[] };
}

// -----------------------------------------------------------------------------------------
// v4 -- links get an arrow (direction marks) and a route for links that go around their
// nodes (links closing a cycle, and self-loops); self-loops are allowed
// -----------------------------------------------------------------------------------------
// arrow, relative to the link's own direction (output -> input); this is also the D key order
export const LINK_ARROWS = ['forward', 'both', 'backward', 'none'] as const;
export type LinkArrow = (typeof LINK_ARROWS)[number];
export const LINK_ROUTES = ['above', 'below'] as const;
export type LinkRoute = (typeof LINK_ROUTES)[number];

export type PortV4 = PortV3;
export type LinkEndV4 = LinkEndV3;
export type NodeV4 = NodeV3;

export interface LinkV4 extends LinkV3 {
	arrow: LinkArrow; // forward = arrow at the input, backward = at the output, both, none
	route: LinkRoute; // side a cycle-closing link or self-loop goes around its nodes
}

export interface GraphV4 {
	metadata: { format: typeof GRAPH_FORMAT; version: 4; [key: string]: unknown };
	data: { nodes: NodeV4[]; links: LinkV4[] };
}

// -----------------------------------------------------------------------------------------
// v5 -- the graph gets a direction (left-to-right or top-to-bottom)
// -----------------------------------------------------------------------------------------
// reading direction of the whole graph: where links leave (outputs) and enter (inputs);
// links going around their nodes use route above = left, below = right in top-to-bottom
export const DIRECTIONS = ['left-to-right', 'top-to-bottom'] as const;
export type Direction = (typeof DIRECTIONS)[number];

export type PortV5 = PortV4;
export type LinkEndV5 = LinkEndV4;
export type NodeV5 = NodeV4;
export type LinkV5 = LinkV4;

export interface GraphV5 {
	metadata: {
		format: typeof GRAPH_FORMAT;
		version: 5;
		direction: Direction; // left-to-right: ports on the left / right edges; top-to-bottom: top / bottom
		[key: string]: unknown;
	};
	data: { nodes: NodeV5[]; links: LinkV5[] };
}

// -----------------------------------------------------------------------------------------
// v6 -- node model for many node types (UML, circuits, notes ...): every node has the same
// top level (what generic editor code reads), and everything its type defines is in `content`
// -----------------------------------------------------------------------------------------
// what a port may connect to: in (takes links), out (gives links), any (two-way, e.g. a
// resistor terminal); which pairs may link is decided in one place (CAN_LINK, store.ts)
export const PORT_KINDS = ['in', 'out', 'any'] as const;
export type PortKind = (typeof PORT_KINDS)[number];

// where a port is drawn, relative to the graph's direction so it stays put when the graph is
// transposed: start / end = the edges links enter / leave along the reading direction
// (left / right in left-to-right), above / below = the edges across it
export const PORT_SIDES = ['start', 'end', 'above', 'below'] as const;
export type PortSide = (typeof PORT_SIDES)[number];

export interface PortV6 {
	id: string; // unique only within its node; v5 ports keep their ids (i1 ..., o1 ...)
	kind: PortKind; // direction / what may connect (≠ `type`)
	type: string; // what flows through it: "basic" for now (later number, vector, bit ...)
	label: string;
	// set by the type's template; missing = from `kind`: in -> start, out -> end, any -> start
	side?: PortSide;
}

export type LinkEndV6 = LinkEndV5;

// unchanged fields; `source` is the giving end (a port of kind out or any), `target` the taking
// end (in or any): CAN_LINK (store.ts) decides which kinds may link, and addLink stores a link in
// this order whichever end a drag started at; the arrowheads come only from `arrow`
export type LinkV6 = LinkV5;

/**
 * A node's type-defined part. Each type decides its keys (see node-types.ts); `{}` when the
 * type has none (e.g. a gate whose symbol comes from the type). Generic editor code never
 * reads it: it asks the type (e.g. for a label).
 */
export type NodeContentV6 = { [key: string]: unknown };

/** `content` of the basic and group types (v5's top-level name and color, moved here). */
export interface NamedContentV6 {
	name: string;
	color: string | null; // "#rrggbb", or null for the theme's default look
}

export interface NodeV6 {
	id: string; // unique within the graph: n1, n2 ...
	type: string; // node type id: "basic", "group" ... (node-types.ts)
	typeVersion: number; // version of the type's template this node follows (its samples: <type>-v<n>.json)
	position: { x: number; y: number }; // top-left corner, world coords, y up
	ports: PortV6[]; // in, out and two-way ports in one list; [] for types without ports (group)
	content: NodeContentV6;
}

export interface GraphV6 {
	metadata: {
		format: typeof GRAPH_FORMAT;
		version: 6;
		direction: Direction;
		[key: string]: unknown;
	};
	data: { nodes: NodeV6[]; links: LinkV6[] };
}

// -----------------------------------------------------------------------------------------
// current version -- the app only works with these
// -----------------------------------------------------------------------------------------
export type Port = PortV6;
export type GraphNode = NodeV6;
export type NodeContent = NodeContentV6;
export type NamedContent = NamedContentV6;
export type LinkEnd = LinkEndV6;
export type Link = LinkV6;
export type Graph = GraphV6;
