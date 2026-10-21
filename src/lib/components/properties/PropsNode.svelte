<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section for one selected node: name (editable), id, type (dropdown from
	// $lib/graph/node-types.ts; planned types are listed but not choosable yet; a change reshapes
	// the node's ports and asks first when links would go), colour (hex
	// with a preview, PropColor), position
	// of its top-left corner in world coordinates (editable, y up) and a delete button.
	import PropText from './PropText.svelte';
	import PropColor from './PropColor.svelte';
	import {
		graph,
		selection,
		renameNode,
		setNodePosition,
		setNodeType,
		setNodeColor,
		removeNodes
	} from '$lib/graph/store';
	import { NODE_TYPES } from '$lib/graph/node-types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];

	function setPosition(axis: 'x' | 'y', typed: string): void {
		const value = Number(typed);
		if (typed.trim() === '' || !Number.isFinite(value)) return; // field shows the old value again
		const id = node.id;
		graph.update((g) => setNodePosition(g, id, { ...node.position, [axis]: value }));
	}

	// a type the list doesn't know (e.g. from a newer file) is still shown, as its own option
	$: knownType = NODE_TYPES.some((t) => t.id === node.type);

	function chooseType(event: Event): void {
		const select = event.currentTarget as HTMLSelectElement;
		const type = select.value;
		const id = node.id;
		// the new type may have no inputs / outputs (e.g. a group): its links on them go too,
		// counted from what setNodeType itself would do; asked first
		const n = ctx.graph.data.links.length - setNodeType(ctx.graph, id, type).data.links.length;
		const label = NODE_TYPES.find((t) => t.id === type)?.label ?? type;
		if (n > 0 && !confirm(`${label} has no ports for this node's ${n} link${n === 1 ? '' : 's'}: ${n === 1 ? 'it' : 'they'} will be removed (Ctrl+Z brings ${n === 1 ? 'it' : 'them'} back). Change the type?`)) {
			select.value = node.type; // kept: show the old type again
			return;
		}
		graph.update((g) => setNodeType(g, id, type));
	}

	function remove(): void {
		const id = node.id;
		graph.update((g) => removeNodes(g, [id]));
		selection.set({ nodes: [], link: null });
	}
</script>

<dl class="props">
	<dt>Name</dt>
	<dd>
		<PropText label="Node name" value={node.name} onCommit={(name) => graph.update((g) => renameNode(g, node.id, name))} />
	</dd>

	<dt>Id</dt>
	<dd class="prop-mono">{node.id}</dd>

	<dt><label for="prop-node-type">Type</label></dt>
	<dd>
		<select id="prop-node-type" class="prop-input" value={node.type} on:change={chooseType}>
			{#each NODE_TYPES as type (type.id)}
				<option value={type.id} disabled={!type.ready} title={type.description}>
					{type.label}{type.ready ? '' : ' (later)'}
				</option>
			{/each}
			{#if !knownType}<option value={node.type}>{node.type}</option>{/if}
		</select>
	</dd>

	<dt class="prop-top">Color</dt>
	<dd>
		<PropColor value={node.color} onCommit={(color) => graph.update((g) => setNodeColor(g, [node.id], color))} />
	</dd>

	<dt>X</dt>
	<dd><PropText type="number" step={20} label="Position x" value={node.position.x} onCommit={(v) => setPosition('x', v)} /></dd>

	<dt>Y (up)</dt>
	<dd><PropText type="number" step={20} label="Position y" value={node.position.y} onCommit={(v) => setPosition('y', v)} /></dd>
</dl>
<div class="prop-actions">
	<button class="prop-button danger" on:click={remove}>Delete node</button>
</div>
