// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// node-types.ts -- the kinds of node the editor knows, as data: what the Properties panel's
// Type dropdown lists, and the shape a node of each type has (its ports template). A node's
// `type` in the file is this list's `id`.
//
// Every ready type has a version and a sample node per version in
// static/data/node-types/<type>/<type>-v<version>.json (like the graph format samples);
// changing a type's template means a new version and a new sample (node-types.spec.ts checks
// that the newest sample matches the template). setNodeType (store.ts) reshapes a node to its
// new type's ports; addNode builds new nodes from the basic template.
//
// `basic` and `group` are drawn, so they are `ready` (choosable). The others
// show what is planned and appear greyed out with "(later)"; a type becomes choosable when
// its drawing and its Properties panel section exist (see docs/graph-properties-panel.md).
// Change, add or remove planned entries freely -- no file uses them yet.
//
// Used by: components/properties/PropsNode.svelte. Groups: see isGroup in store.ts.
// -----------------------------------------------------------------------------------------

import type { Port } from './types';

export interface NodeType {
	id: string; // stored in the node's `type`
	label: string; // shown in the dropdown
	description: string; // hover text
	ready: boolean; // drawn by the editor, so it can be chosen
	// ready types only: the template's version (its samples are named by it), the name a new
	// node of this type gets, and its ports (an empty list: the type has no inputs / outputs)
	version?: number;
	defaultName?: string;
	ports?: { inputs: Port[]; outputs: Port[] };
}

export const NODE_TYPES: NodeType[] = [
	{
		id: 'basic',
		label: 'Basic',
		description: 'A name with input and output points',
		ready: true,
		version: 1,
		defaultName: 'Node',
		ports: {
			inputs: [{ id: 'i1', type: 'basic', label: 'Input' }],
			outputs: [{ id: 'o1', type: 'basic', label: 'Output' }]
		}
	},
	{
		id: 'group',
		label: 'Group',
		description: 'A frame drawn behind other nodes, its name on the top edge; no ports',
		ready: true,
		version: 1,
		defaultName: 'Group',
		ports: { inputs: [], outputs: [] }
	},
	{ id: 'note', label: 'Note', description: 'A block of text without ports (planned)', ready: false },
	{ id: 'uml-class', label: 'UML class', description: 'Three blocks: name, attributes, operations (planned)', ready: false },
	{ id: 'decision', label: 'Decision', description: 'A flowchart branch with yes / no outputs (planned)', ready: false }
];

/** The entry for a type id, or undefined for a type the editor doesn't know. */
export const nodeType = (id: string): NodeType | undefined => NODE_TYPES.find((t) => t.id === id);
