<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// One graph node inside the world layer: title, input points (left), output points
	// (right), selected highlight, and inline title editing (double-click or F2 via
	// `editingNodeId`; Enter or clicking away saves, Esc cancels).
	// Mouse down for select/drag/link is handled by the page through the data-* attributes;
	// ports carry `data-port-key` so GraphLinks can find and measure them.
	import { graph, editingNodeId, renameNode } from '$lib/graph/store';
	import type { GraphNode } from '$lib/graph/types';

	export let node: GraphNode;
	export let selected = false;

	let draft = '';
	$: editing = $editingNodeId === node._id;
	$: if (editing) draft = node.data.title;

	function commit(): void {
		// the store, not `editing`: the field's blur can fire after Esc already ended editing
		if ($editingNodeId !== node._id) return;
		graph.update((g) => renameNode(g, node._id, draft));
		editingNodeId.set(null);
	}

	function cancel(): void {
		editingNodeId.set(null);
	}

	function handleKey(event: KeyboardEvent): void {
		if (event.key === 'Enter') commit();
		else if (event.key === 'Escape') {
			// this Esc only cancels the edit; preventDefault keeps the Esc menu closed
			event.preventDefault();
			cancel();
		}
	}

	// focus and select the whole title when the field appears
	function focusSelect(el: HTMLInputElement) {
		el.focus();
		el.select();
	}
</script>

<div
	class="node"
	class:selected
	data-id={node._id}
	style="transform: translate({node.position.x}px, {-node.position.y}px);"
>
	{#if editing}
		<input
			class="node-title-input"
			bind:value={draft}
			use:focusSelect
			on:keydown|stopPropagation={handleKey}
			on:blur={commit}
		/>
	{:else}
		<div class="node-title" role="presentation" on:dblclick={() => editingNodeId.set(node._id)}>
			{node.data.title}
		</div>
	{/if}

	<div class="inputs">
		{#each node.data.inputs ?? [] as input}
			<div
				class="port node-input"
				title={input.label}
				data-port-key="{node._id}:input:{input.id}"
				data-node-id={node._id}
				data-port-kind="input"
				data-port-id={input.id}
			></div>
		{/each}
	</div>

	<div class="outputs">
		{#each node.data.outputs ?? [] as output}
			<div
				class="port node-output"
				title={output.label}
				data-port-key="{node._id}:output:{output.id}"
				data-node-id={node._id}
				data-port-kind="output"
				data-port-id={output.id}
			></div>
		{/each}
	</div>

	<div class="content">
		<div class="add-content hover-visible"></div>
	</div>
</div>
