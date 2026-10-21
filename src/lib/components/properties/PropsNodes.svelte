<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section for several selected nodes: how many, their names (a click
	// selects only that one), one colour for all of them, and deleting them all.
	import PropColor from './PropColor.svelte';
	import { graph, selection, removeNodes, setNodeColor } from '$lib/graph/store';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;

	$: linksBetween = ctx.graph.data.links.filter(
		(l) => ctx.selection.nodes.includes(l.source.node) && ctx.selection.nodes.includes(l.target.node)
	).length;

	// the colour they share, or null with "mixed" shown when they differ
	$: colors = new Set(ctx.nodes.map((n) => n.color));
	$: shared = colors.size === 1 ? [...colors][0] : null;

	function colorAll(color: string | null): void {
		const ids = ctx.nodes.map((n) => n.id);
		graph.update((g) => setNodeColor(g, ids, color));
	}

	function remove(): void {
		const ids = ctx.selection.nodes;
		graph.update((g) => removeNodes(g, ids));
		selection.set({ nodes: [], link: null });
	}
</script>

<p class="prop-note">{ctx.nodes.length} nodes selected, {linksBetween} links between them.</p>
<dl class="props">
	<dt class="prop-top">Color</dt>
	<dd><PropColor value={shared} mixed={colors.size > 1} onCommit={colorAll} /></dd>
</dl>
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
