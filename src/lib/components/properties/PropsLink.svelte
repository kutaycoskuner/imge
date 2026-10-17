<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section for the selected link: name (editable), id, the two ends
	// (a click selects that node) and a delete button.
	import PropText from './PropText.svelte';
	import { graph, selection, renameLink, removeLink } from '$lib/graph/store';
	import type { LinkEnd } from '$lib/graph/types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: link = ctx.link!;

	// "Node name · port label" for one end of the link
	function describe(end: LinkEnd, kind: 'inputs' | 'outputs'): string {
		const node = ctx.graph.data.nodes.find((n) => n.id === end.node);
		const port = node?.[kind].find((p) => p.id === end.port);
		return `${node?.name ?? end.node} · ${port?.label ?? end.port}`;
	}

	// the two ends, as data for one template
	$: ends = [
		{ title: 'From', end: link.source, text: describe(link.source, 'outputs') },
		{ title: 'To', end: link.target, text: describe(link.target, 'inputs') }
	];

	function remove(): void {
		const id = link.id;
		graph.update((g) => removeLink(g, id));
		selection.set({ nodes: [], link: null });
	}
</script>

<dl class="props">
	<dt>Name</dt>
	<dd>
		<PropText
			label="Link name"
			placeholder="no name"
			value={link.name ?? ''}
			onCommit={(name) => graph.update((g) => renameLink(g, link.id, name))}
		/>
	</dd>

	<dt>Id</dt>
	<dd class="prop-mono">{link.id}</dd>

	{#each ends as { title, end, text }}
		<dt>{title}</dt>
		<dd>
			<button class="prop-row" on:click={() => selection.set({ nodes: [end.node], link: null })} title="Select this node">
				<span>{text}</span>
			</button>
		</dd>
	{/each}
</dl>
<div class="prop-actions">
	<button class="prop-button danger" on:click={remove}>Delete link</button>
</div>
