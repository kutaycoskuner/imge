// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-02
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
// `basic`, `group`, `uml-class`, `text` and `image` are drawn, so they are `ready` (choosable). The others
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
	// shapes a node of this type may take (content `shape`, chosen in the Properties panel);
	// missing: the type's shape is fixed (e.g. a UML class)
	shapes?: string[];
	// content taken over from the node's previous type when it becomes this one (setNodeType),
	// e.g. a basic node's name becomes a text node's text
	adopt?: (old: NodeContent) => NodeContent;
}

/** The node shapes, as data: id (stored in content `shape`) and the name shown in the dropdown. */
export const NODE_SHAPES: { id: string; title: string }[] = [
	{ id: 'square', title: 'Square' }, // a rectangle with rounded corners (the default look)
	{ id: 'circle', title: 'Circle' }
];

// the name a basic / group node shows, or the fallback when it has none
const named = (fallback: string) => (node: GraphNode): string =>
	typeof node.content.name === 'string' && node.content.name.trim() ? node.content.name : fallback;

export const NODE_TYPES: NodeType[] = [
	{
		id: 'basic',
		title: 'Basic',
		description: 'A name with input and output points',
		ready: true,
		// v2: content `shape` (square / circle); a v1 node without it is a square
		version: 2,
		ports: [
			{ id: 'i1', kind: 'in', type: 'basic', label: 'Input' },
			{ id: 'o1', kind: 'out', type: 'basic', label: 'Output' }
		],
		content: { name: 'Node', color: null, shape: 'square' },
		label: named('Basic'),
		shapes: ['square', 'circle']
	},
	{
		id: 'group',
		title: 'Group',
		description: 'A frame around the nodes it holds, drawn behind them, its name on the top edge; no ports',
		ready: true,
		// v2: `children` (the ids it holds, see groups.ts); a v1 group without it holds nothing
		// v3: `shape` (square / circle); a group without it is a square
		version: 3,
		ports: [],
		content: { name: 'Group', color: null, children: [], shape: 'square' },
		label: named('Group'),
		shapes: ['square', 'circle']
	},
	{
		id: 'uml-class',
		title: 'UML class',
		description: 'Three blocks: class name, attributes, methods (UML notation, checked and highlighted)',
		ready: true,
		// v2: `abstract` (the class name in italics); a v1 class without it isn't abstract
		version: 2,
		// relations (inheritance, association ...) are links (graph format v7: line, mark; see
		// link-relations.ts), so a class keeps an input and an output
		ports: [
			{ id: 'i1', kind: 'in', type: 'basic', label: 'Input' },
			{ id: 'o1', kind: 'out', type: 'basic', label: 'Output' }
		],
		// one member per line, in UML notation (uml.ts): "- count: int = 0", "+ area(): double",
		// "{static} + count: int", "+ {abstract} area(): double"
		content: { name: 'Class', color: null, abstract: false, attributes: [], methods: [] },
		label: named('UML class')
	},
	{
		id: 'text',
		title: 'Text',
		description: 'Only text, no box and no ports: titles, captions, notes; scalable',
		ready: true,
		version: 1,
		ports: [],
		// several lines as typed; colour of the text; scale 1 = the normal size; bold; alignment
		content: { text: 'Text', color: null, scale: 1, bold: false, align: 'left' },
		label: (node) => textLabel(node),
		adopt: (old) => (typeof old.name === 'string' && old.name.trim() && !('text' in old) ? { text: old.name } : {})
	},
	{
		id: 'image',
		title: 'Image',
		description: 'Only a picture (a part from the library or an uploaded image), scalable; an input and an output (circuit parts later)',
		ready: true,
		version: 1,
		ports: [
			{ id: 'i1', kind: 'in', type: 'basic', label: 'Input' },
			{ id: 'o1', kind: 'out', type: 'basic', label: 'Output' }
		],
		// src: a path below static/ (library parts: images/parts/*.svg) or a data: URL (uploaded);
		// width / height: its size at scale 1 (world units), so links and exports know it before
		// the picture has loaded
		content: { name: 'Image', src: 'images/parts/resistor.svg', width: 96, height: 32, scale: 1 },
		label: named('Image')
	},
	{ id: 'note', title: 'Note', description: 'A block of text without ports (planned)', ready: false },
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

// the content keys the node's type defines: its template's, or for a type the editor doesn't
// know, the node's own (a node keeps keys of an earlier type, e.g. a text node made from a
// basic one still carries its name, so the node's keys alone don't say what it is now)
const typeKeys = (node: GraphNode): object => nodeType(node.type)?.content ?? node.content;

/** Whether the node's type keeps a name and a colour in its content (basic, group, UML class). */
export const hasNamedContent = (node: GraphNode): boolean => 'name' in typeKeys(node) && 'color' in typeKeys(node);

/** Whether the node's type has a colour (content `color`): basic, group, UML class, text. */
export const hasColor = (node: GraphNode): boolean => 'color' in typeKeys(node);

/** The node's name, or '' when its content has none. */
export const nodeName = (node: GraphNode): string => (typeof node.content.name === 'string' ? node.content.name : '');

/** Where a port is drawn: its own `side`, or from its kind: in / any -> start, out -> end. */
export const portSide = (port: Port): PortSide => port.side ?? (port.kind === 'out' ? 'end' : 'start');

/** A UML class node's member lines (attributes or methods); [] when the content has none. */
export const umlMembers = (node: GraphNode, key: 'attributes' | 'methods'): string[] => {
	const lines = node.content[key];
	return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === 'string') : [];
};

/** Whether a UML class node is abstract (content `abstract`; missing = no). */
export const umlAbstract = (node: GraphNode): boolean => node.content.abstract === true;

/** Smallest and largest scale of text and image nodes (content `scale`). */
export const SCALE_MIN = 0.25;
export const SCALE_MAX = 8;

/** A text or image node's scale: content `scale` within SCALE_MIN .. SCALE_MAX, else 1. */
export function nodeScale(node: GraphNode): number {
	const s = node.content.scale;
	return typeof s === 'number' && Number.isFinite(s) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, s)) : 1;
}

/** A text node's text ('' when its content has none). */
export const nodeText = (node: GraphNode): string => (typeof node.content.text === 'string' ? node.content.text : '');

// a text node in lists: its first line (shortened), or "Text"
function textLabel(node: GraphNode): string {
	const first = nodeText(node).split('\n').find((l) => l.trim())?.trim() ?? '';
	return first ? (first.length > 40 ? `${first.slice(0, 39)}…` : first) : 'Text';
}

/** An image node's picture source and its drawn size (width / height times scale). */
export function imageOf(node: GraphNode): { src: string; w: number; h: number } {
	const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback);
	const scale = nodeScale(node);
	return {
		src: typeof node.content.src === 'string' ? node.content.src : '',
		w: num(node.content.width, 96) * scale,
		h: num(node.content.height, 32) * scale
	};
}

/** A group's frame size when its content has none (world units; 20 x 12 em at zoom 1). */
export const GROUP_SIZE = { w: 320, h: 192 };
/** Smallest frame size the Properties panel accepts, so the name still fits. */
export const GROUP_MIN = 100;

/**
 * A group's frame size: its content's optional `width` / `height` (world units), or GROUP_SIZE.
 * Optional keys with a default: groups without them look as before, so the template version
 * stays 1.
 */
export function groupSize(node: GraphNode): { w: number; h: number } {
	const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= GROUP_MIN ? v : fallback);
	return { w: num(node.content.width, GROUP_SIZE.w), h: num(node.content.height, GROUP_SIZE.h) };
}

/**
 * The node's shape: its content's `shape` when its type allows it, else the type's first
 * shape, else "square" (types with a fixed shape, e.g. UML classes, are drawn their own way).
 */
export function nodeShape(node: GraphNode): string {
	const allowed = nodeType(node.type)?.shapes ?? [];
	const own = node.content.shape;
	return typeof own === 'string' && allowed.includes(own) ? own : (allowed[0] ?? 'square');
}

/** The node's colour ("#rrggbb" text as stored, or null). */
export const nodeColor = (node: GraphNode): string | null => (typeof node.content.color === 'string' ? node.content.color : null);
