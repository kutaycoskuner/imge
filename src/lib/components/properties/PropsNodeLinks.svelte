<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section for one selected node: its ports, and the links coming in and
	// going out; clicking a link selects it (and the panel shows that link).
	import { selection } from '$lib/graph/store';
	import type { Link } from '$lib/graph/types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
	$: nameOf = (id: string) => ctx.graph.data.nodes.find((n) => n.id === id)?.name ?? id;
	$: incoming = ctx.graph.data.links.filter((l) => l.target.node === node.id);
	$: outgoing = ctx.graph.data.links.filter((l) => l.source.node === node.id);

	// the two groups, as data for one list template
	let groups: { title: string; links: Link[]; other: (l: Link) => string; arrow: string }[];
	$: groups = [
		{ title: 'In', links: incoming, other: (l) => nameOf(l.source.node), arrow: '←' },
		{ title: 'Out', links: outgoing, other: (l) => nameOf(l.target.node), arrow: '→' }
	];

	const selectLink = (id: string) => selection.set({ nodes: [], link: id });
</script>

<dl class="props">
	<dt>Inputs</dt>
	<dd>{node.inputs.map((p) => p.label).join(', ') || 'none'}</dd>
	<dt>Outputs</dt>
	<dd>{node.outputs.map((p) => p.label).join(', ') || 'none'}</dd>
</dl>

{#each groups as group}
	<h4 class="prop-subtitle">{group.title} ({group.links.length})</h4>
	{#if group.links.length}
		<ul class="prop-list">
			{#each group.links as link (link.id)}
				<li>
					<button class="prop-row" on:click={() => selectLink(link.id)} title="Select this link">
						<span>{group.arrow} {group.other(link)}</span>
						{#if link.name}<span class="prop-faint">{link.name}</span>{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
{/each}
