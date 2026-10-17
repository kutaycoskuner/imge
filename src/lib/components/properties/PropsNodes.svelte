<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section for several selected nodes: how many, their names (a click
	// selects only that one), and deleting them all.
	import { graph, selection, removeNodes } from '$lib/graph/store';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;

	$: linksBetween = ctx.graph.data.links.filter(
		(l) => ctx.selection.nodes.includes(l.source.node) && ctx.selection.nodes.includes(l.target.node)
	).length;

	function remove(): void {
		const ids = ctx.selection.nodes;
		graph.update((g) => removeNodes(g, ids));
		selection.set({ nodes: [], link: null });
	}
</script>

<p class="prop-note">{ctx.nodes.length} nodes selected, {linksBetween} links between them.</p>
<ul class="prop-list">
	{#each ctx.nodes as node (node.id)}
		<li>
			<button class="prop-row" on:click={() => selection.set({ nodes: [node.id], link: null })} title="Select only this node">
				<span>{node.name}</span><span class="prop-faint prop-mono">{node.id}</span>
			</button>
		</li>
	{/each}
</ul>
<div class="prop-actions">
	<button class="prop-button danger" on:click={remove}>Delete {ctx.nodes.length} nodes</button>
</div>
