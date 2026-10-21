// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-17
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// sections.ts -- what the Properties panel shows, as data: one entry per collapsible
// section, with the condition (on the current selection) that shows it. The panel renders
// the matching sections top to bottom; it has no knowledge of nodes or links itself.
//
// Adding a section (e.g. for a future node type such as a UML class with its three
// blocks): write a component that takes `ctx: PanelContext`, and add an entry here with
// `show: (ctx) => ctx.nodes.length === 1 && ctx.nodes[0].type === 'uml-class'`.
//
// Used by: GraphPropertiesPanel.svelte. Details: docs/graph-properties-panel.md
// -----------------------------------------------------------------------------------------

import type { Component } from 'svelte';
import type { Graph, GraphNode, Link, LinkArrow } from '$lib/graph/types';
import { isGroup, type Selection } from '$lib/graph/store';
import { hasNamedContent } from '$lib/graph/node-types';
import PropsGraph from './PropsGraph.svelte';
import PropsNode from './PropsNode.svelte';
import PropsContent from './PropsContent.svelte';
import PropsNodeLinks from './PropsNodeLinks.svelte';
import PropsNodes from './PropsNodes.svelte';
import PropsLink from './PropsLink.svelte';
import PropsLinkStyle from './PropsLinkStyle.svelte';

/** What every section gets: the open graph and the selection, resolved to objects. */
export interface PanelContext {
	graph: Graph;
	selection: Selection;
	nodes: GraphNode[]; // selected nodes, in selection order
	link: Link | null; // selected link
}

export interface PanelSection {
	id: string; // also remembers whether the section is folded
	title: string;
	component: Component<{ ctx: PanelContext }>; // gets the context as its only prop
	show: (ctx: PanelContext) => boolean;
}

const nothingSelected = (ctx: PanelContext) => !ctx.link && ctx.nodes.length === 0;
const oneNode = (ctx: PanelContext) => ctx.nodes.length === 1;
const oneNodeWithPorts = (ctx: PanelContext) => oneNode(ctx) && !isGroup(ctx.nodes[0]); // groups have none
// a type that keeps a name and a colour in its content (basic, group); other types add their own
const oneNamedNode = (ctx: PanelContext) => oneNode(ctx) && hasNamedContent(ctx.nodes[0]);
const someNodes = (ctx: PanelContext) => ctx.nodes.length > 1;
const aLink = (ctx: PanelContext) => !!ctx.link;

export const PANEL_SECTIONS: PanelSection[] = [
	{ id: 'graph', title: 'Graph', component: PropsGraph, show: nothingSelected },
	{ id: 'node', title: 'Node', component: PropsNode, show: oneNode },
	{ id: 'node-content', title: 'Content', component: PropsContent, show: oneNamedNode },
	{ id: 'node-links', title: 'Ports and links', component: PropsNodeLinks, show: oneNodeWithPorts },
	{ id: 'nodes', title: 'Selection', component: PropsNodes, show: someNodes },
	{ id: 'link', title: 'Link', component: PropsLink, show: aLink },
	{ id: 'link-style', title: 'Look', component: PropsLinkStyle, show: aLink }
];

/** How the arrow choices read in selects (Properties panel and Esc menu). */
export const LINK_ARROW_LABELS: Record<LinkArrow, string> = {
	forward: '→ forward',
	both: '↔ both',
	backward: '← backward',
	none: 'none'
};
