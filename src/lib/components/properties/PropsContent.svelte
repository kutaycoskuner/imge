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
	// the colour picker, PropColor); for a group also its frame's width and height (world units,
	// steps of 20 = half grid squares; no drag handle yet). Other node types bring their own
	// content sections.
	import PropText from './PropText.svelte';
	import PropColor from './PropColor.svelte';
	import { graph, renameNode, setNodeColor, setNodeContent, isGroup } from '$lib/graph/store';
	import { nodeName, nodeColor, groupSize, GROUP_MIN } from '$lib/graph/node-types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
	$: size = isGroup(node) ? groupSize(node) : null;

	// a group's frame size, as data for one template
	const SIZE_FIELDS = [
		{ key: 'width', title: 'Width', axis: 'w' },
		{ key: 'height', title: 'Height', axis: 'h' }
	] as const;

	function setSize(key: 'width' | 'height', typed: string): void {
		const value = Math.round(Number(typed));
		if (typed.trim() === '' || !Number.isFinite(value)) return; // field shows the old value again
		const id = node.id;
		graph.update((g) => setNodeContent(g, id, { [key]: Math.max(GROUP_MIN, value) }));
	}
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

	{#if size}
		{#each SIZE_FIELDS as field (field.key)}
			<dt>{field.title}</dt>
			<dd>
				<PropText type="number" step={20} min={GROUP_MIN} label="Group {field.key}" value={size[field.axis]} onCommit={(v) => setSize(field.key, v)} />
			</dd>
		{/each}
	{/if}
</dl>
