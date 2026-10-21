<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// One graph node inside the world layer: name (title), input points (left), output points
	// (right), its colour (border in the colour, fill a dim version of it; see $lib/graph/color.ts),
	// selected highlight, and inline title editing (double-click or F2 via
	// `editingNodeId`; Enter or clicking away saves, Esc cancels).
	// A group (type "group") is drawn as a frame (a <fieldset>) with its name in a gap of the
	// top edge (the <legend>), no ports; only the name takes the mouse, so clicks inside the
	// frame reach the canvas and the nodes on top of it (styles: .node.group in imge.css).
	// Mouse down for select/drag/link is handled by the page through the data-* attributes;
	// ports carry `data-port-key` so GraphLinks can find and measure them.
	import { graph, editingNodeId, renameNode, isGroup } from '$lib/graph/store';
	import type { GraphNode } from '$lib/graph/types';
	import { parseHexColor, dimColor } from '$lib/graph/color';

	export let node: GraphNode;
	export let selected = false;

	// only a hex colour is drawn; anything else in the file is kept but shown as the default
	$: color = node.color ? parseHexColor(node.color) : null;
	$: group = isGroup(node);

	let draft = '';
	$: editing = $editingNodeId === node.id;
	$: if (editing) draft = node.name;

	function commit(): void {
		// the store, not `editing`: the field's blur can fire after Esc already ended editing
		if ($editingNodeId !== node.id) return;
		graph.update((g) => renameNode(g, node.id, draft));
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
	class:colored={!!color}
	class:group
	data-id={node.id}
	style="transform: translate({node.position.x}px, {-node.position.y}px);{color
		? ` --node-col: ${color}; --node-fill: ${dimColor(color)};`
		: ''}"
>
	{#if group}
		<fieldset class="group-frame">
			<legend class="group-title">
				{#if editing}
					<input
						class="node-title-input"
						bind:value={draft}
						use:focusSelect
						on:keydown|stopPropagation={handleKey}
						on:blur={commit}
					/>
				{:else}
					<span class="node-title" role="presentation" on:dblclick={() => editingNodeId.set(node.id)}>{node.name}</span>
				{/if}
			</legend>
		</fieldset>
	{:else}
	{#if editing}
		<input
			class="node-title-input"
			bind:value={draft}
			use:focusSelect
			on:keydown|stopPropagation={handleKey}
			on:blur={commit}
		/>
	{:else}
		<div class="node-title" role="presentation" on:dblclick={() => editingNodeId.set(node.id)}>
			{node.name}
		</div>
	{/if}

	<div class="inputs">
		{#each node.inputs ?? [] as input}
			<div
				class="port node-input"
				title={input.label}
				data-port-key="{node.id}:input:{input.id}"
				data-node-id={node.id}
				data-port-kind="input"
				data-port-id={input.id}
			></div>
		{/each}
	</div>

	<div class="outputs">
		{#each node.outputs ?? [] as output}
			<div
				class="port node-output"
				title={output.label}
				data-port-key="{node.id}:output:{output.id}"
				data-node-id={node.id}
				data-port-kind="output"
				data-port-id={output.id}
			></div>
		{/each}
	</div>

	<div class="content">
		<div class="add-content hover-visible"></div>
	</div>
	{/if}
</div>
