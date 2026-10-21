// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// node-types.ts -- the kinds of node the editor knows, as data: what the Properties panel's
// Type dropdown lists, and what a node of each type is made of (graph format v6): its ports
// (one list with `kind`), its `content` (the keys the type defines, with default values) and
// a readable label for generic UI. A node's `type` in the file is this list's `id`, its
// `typeVersion` the template version it follows.
//
// Every ready type has a version and a sample node per version in
// static/data/node-types/<type>/<type>-v<version>.json (like the graph format samples; a
// sample may be written in an older graph format, its header says which, and is upgraded
// before it is compared). Changing a type's template means a new version and a new sample
// (node-types.spec.ts checks that the newest sample matches the template). setNodeType
// (store.ts) reshapes a node to its new type; addNode builds new nodes from the basic template.
//
// Generic editor code never reads a node's `content`: it asks the type, e.g. nodeLabel(node).
//
// `basic` and `group` are drawn, so they are `ready` (choosable). The others
// show what is planned and appear greyed out with "(later)"; a type becomes choosable when
// its drawing and its Properties panel section exist (see docs/graph-properties-panel.md).
// Change, add or remove planned entries freely -- no file uses them yet.
//
// Used by: store.ts (addNode, setNodeType), components/properties (Type dropdown, labels),
// GraphNode / GraphLinks via store helpers. Details: docs/graph-format.md#why-nodes-look-like-this
// -----------------------------------------------------------------------------------------

import type { GraphNode, NodeContent, Port, PortSide } from './types';

export interface NodeType {
	id: string; // stored in the node's `type`
	title: string; // the type's name in the dropdown
	description: string; // hover text
	ready: boolean; // drawn by the editor, so it can be chosen
	// ready types only:
	version?: number; // the template's version (its samples are named by it; nodes store it as typeVersion)
	ports?: Port[]; // the ports a new node gets; [] = the type has no ports
	content?: NodeContent; // the content keys a new node gets, with their default values
	label?: (node: GraphNode) => string; // readable text for the node in generic UI (lists, link ends)
}

// the name a basic / group node shows, or the fallback when it has none
const named = (fallback: string) => (node: GraphNode): string =>
	typeof node.content.name === 'string' && node.content.name.trim() ? node.content.name : fallback;

export const NODE_TYPES: NodeType[] = [
	{
		id: 'basic',
		title: 'Basic',
		description: 'A name with input and output points',
		ready: true,
		version: 1,
		ports: [
			{ id: 'i1', kind: 'in', type: 'basic', label: 'Input' },
			{ id: 'o1', kind: 'out', type: 'basic', label: 'Output' }
		],
		content: { name: 'Node', color: null },
		label: named('Basic')
	},
	{
		id: 'group',
		title: 'Group',
		description: 'A frame drawn behind other nodes, its name on the top edge; no ports',
		ready: true,
		version: 1,
		ports: [],
		content: { name: 'Group', color: null },
		label: named('Group')
	},
	{ id: 'note', title: 'Note', description: 'A block of text without ports (planned)', ready: false },
	{ id: 'uml-class', title: 'UML class', description: 'Three blocks: name, attributes, operations (planned)', ready: false },
	{ id: 'decision', title: 'Decision', description: 'A flowchart branch with yes / no outputs (planned)', ready: false }
];

/** The entry for a type id, or undefined for a type the editor doesn't know. */
export const nodeType = (id: string): NodeType | undefined => NODE_TYPES.find((t) => t.id === id);

/**
 * Readable text for a node in generic UI (Properties lists, link ends): its type's label, or
 * for a type without one (unknown or planned) a name it carries, else "<type> (<id>)".
 */
export function nodeLabel(node: GraphNode): string {
	const label = nodeType(node.type)?.label;
	if (label) return label(node);
	return typeof node.content.name === 'string' && node.content.name.trim() ? node.content.name : `${node.type} (${node.id})`;
}

/** Whether the node's type keeps a name and a colour in its content (basic, group). */
export const hasNamedContent = (node: GraphNode): boolean => 'name' in node.content && 'color' in node.content;

/** The node's name, or '' when its content has none. */
export const nodeName = (node: GraphNode): string => (typeof node.content.name === 'string' ? node.content.name : '');

/** Where a port is drawn: its own `side`, or from its kind: in / any -> start, out -> end. */
export const portSide = (port: Port): PortSide => port.side ?? (port.kind === 'out' ? 'end' : 'start');

/** The node's colour ("#rrggbb" text as stored, or null). */
export const nodeColor = (node: GraphNode): string | null => (typeof node.content.color === 'string' ? node.content.color : null);
