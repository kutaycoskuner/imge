<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section shown when nothing is selected: the open graph's file (and
	// unsaved marker), its direction, and how many nodes and links it has.
	import { graph, setDirection, measureNodeSizes } from '$lib/graph/store';
	import { workspace } from '$lib/graph/file-access';
	import { DIRECTIONS, type Direction } from '$lib/graph/types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;

	// same as the Esc menu: node sizes come from the rendered nodes, so the layout turns
	// around node centres
	function changeDirection(event: Event): void {
		const direction = (event.currentTarget as HTMLSelectElement).value as Direction;
		const sizes = measureNodeSizes();
		graph.update((g) => setDirection(g, direction, sizes));
	}
</script>

<dl class="props">
	<dt>File</dt>
	<dd>
		{$workspace.fileName ?? 'not saved yet'}
		{#if $workspace.dirty}<span class="prop-dirty" title="unsaved changes">•</span>{/if}
	</dd>

	<dt><label for="prop-direction">Direction</label></dt>
	<dd>
		<select id="prop-direction" class="prop-input" value={ctx.graph.metadata.direction} on:change={changeDirection}>
			{#each DIRECTIONS as direction}
				<option value={direction}>{direction}</option>
			{/each}
		</select>
	</dd>

	<dt>Nodes</dt>
	<dd>{ctx.graph.data.nodes.length}</dd>

	<dt>Links</dt>
	<dd>{ctx.graph.data.links.length}</dd>
</dl>
<p class="prop-note">Select a node or link to see and edit it here.</p>
