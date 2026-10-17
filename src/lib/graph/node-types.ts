// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-17
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// node-types.ts -- the kinds of node the editor knows, as data: what the Properties panel's
// Type dropdown lists. A node's `type` in the file is this list's `id`.
//
// Placeholder for now: only `basic` is drawn, so only it is `ready` (choosable). The others
// show what is planned and appear greyed out with "(later)"; a type becomes choosable when
// its drawing and its Properties panel section exist (see docs/graph-properties-panel.md).
// Change, add or remove planned entries freely -- no file uses them yet.
//
// Used by: components/properties/PropsNode.svelte.
// -----------------------------------------------------------------------------------------

export interface NodeType {
	id: string; // stored in the node's `type`
	label: string; // shown in the dropdown
	description: string; // hover text
	ready: boolean; // drawn by the editor, so it can be chosen
}

export const NODE_TYPES: NodeType[] = [
	{ id: 'basic', label: 'Basic', description: 'A name with input and output points', ready: true },
	{ id: 'note', label: 'Note', description: 'A block of text without ports (planned)', ready: false },
	{ id: 'uml-class', label: 'UML class', description: 'Three blocks: name, attributes, operations (planned)', ready: false },
	{ id: 'decision', label: 'Decision', description: 'A flowchart branch with yes / no outputs (planned)', ready: false }
];
