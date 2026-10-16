// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// types.ts -- TypeScript shapes of the graph file format, one set per format version.
//
// Old versions stay here frozen (never edited) because their adapters in migrations.ts
// read them; only the newest version is used by the rest of the app (`Graph`).
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
// current version -- the app only works with these
// -----------------------------------------------------------------------------------------
export type Port = PortV4;
export type GraphNode = NodeV4;
export type LinkEnd = LinkEndV4;
export type Link = LinkV4;
export type Graph = GraphV4;
