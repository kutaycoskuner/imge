<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-23
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Contents" for one group: the nodes it holds (a click selects
	// one, × takes it out of the group, to the group the group is in), how to add nodes, and an
	// Ungroup button (dissolves the group; what it held stays, in the group's own parent).
	// Membership lives in the group's content `children` ($lib/graph/groups.ts).
	import { graph, selection, ungroupNodes } from '$lib/graph/store';
	import { groupChildren, parentOf, setGroupMembership } from '$lib/graph/groups';
	import { nodeLabel } from '$lib/graph/node-types';
	import Kbd from '../Kbd.svelte';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: group = ctx.nodes[0];
	$: children = groupChildren(ctx.graph, group)
		.map((id) => ctx.graph.data.nodes.find((n) => n.id === id)!)
		.filter(Boolean);

	function takeOut(id: string): void {
		const outer = parentOf(ctx.graph, group.id)?.id ?? null;
		graph.update((g) => setGroupMembership(g, [id], outer));
	}

	function ungroup(): void {
		let freed: string[] = [];
		const ids = [group.id];
		graph.update((g) => {
			const result = ungroupNodes(g, ids);
			freed = result.freed;
			return result.graph;
		});
		selection.set({ nodes: freed, link: null });
	}
</script>

<p class="prop-note">{children.length ? `Holds ${children.length} node${children.length === 1 ? '' : 's'}:` : 'Holds no nodes yet.'}</p>
{#if children.length}
	<ul class="prop-list">
		{#each children as child (child.id)}
			<li class="member">
				<button class="prop-row" title="Select this node" on:click={() => selection.set({ nodes: [child.id], link: null })}>
					<span>{nodeLabel(child)}</span><span class="prop-faint prop-mono">{child.id}{child.type === 'group' ? ' · group' : ''}</span>
				</button>
				<button class="take-out" title="Take it out of this group" aria-label="Take {nodeLabel(child)} out of the group" on:click={() => takeOut(child.id)}>×</button>
			</li>
		{/each}
	</ul>
{/if}
<p class="prop-note">
	Add nodes: drop them inside the frame, make them there (<Kbd keys="Shift+A" />, <Kbd keys="Ctrl+V" />), or select them
	with this group and press <Kbd keys="Ctrl+G" />. <Kbd keys="Ctrl" />+drag takes a node out.
</p>
<div class="prop-actions">
	<button class="prop-button" on:click={ungroup} title="Remove the group; what it holds stays [Ctrl+Shift+G]">Ungroup</button>
</div>

<style>
	.member {
		display: flex;
		align-items: center;
		gap: 0.2em;
	}

	.member :global(.prop-row) {
		flex: 1;
	}

	/* buttons are reset globally (settings_overlay.css), so the look is set here */
	.take-out {
		flex: none;
		padding: 0 0.35em;
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		opacity: 0.5;
		cursor: pointer;
	}

	.take-out:hover {
		opacity: 1;
		color: #d9534f;
	}
</style>
