<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Content" for one node whose type keeps a name and a colour in
	// its content (basic, group; see hasNamedContent in $lib/graph/node-types.ts): the name
	// (editable, also F2 / double-click on the canvas) and the colour (hex with a preview and
	// the colour picker, PropColor). Other node types bring their own content sections.
	import PropText from './PropText.svelte';
	import PropColor from './PropColor.svelte';
	import { graph, renameNode, setNodeColor } from '$lib/graph/store';
	import { nodeName, nodeColor } from '$lib/graph/node-types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
</script>

<dl class="props">
	<dt>Name</dt>
	<dd>
		<PropText label="Node name" value={nodeName(node)} onCommit={(name) => graph.update((g) => renameNode(g, node.id, name))} />
	</dd>

	<dt class="prop-top">Color</dt>
	<dd>
		<PropColor value={nodeColor(node)} onCommit={(color) => graph.update((g) => setNodeColor(g, [node.id], color))} />
	</dd>
</dl>
