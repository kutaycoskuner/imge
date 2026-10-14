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
// current version -- the app only works with these
// -----------------------------------------------------------------------------------------
export type Port = PortV2;
export type GraphNode = NodeV2;
export type LinkEnd = LinkEndV2;
export type Link = LinkV2;
export type Graph = GraphV2;
