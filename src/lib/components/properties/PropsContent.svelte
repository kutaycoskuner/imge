<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Content" for one node whose type keeps a name and a colour in
	// its content (basic, group; see hasNamedContent in $lib/graph/node-types.ts): the name
	// (editable, also F2 / double-click on the canvas) and the colour (hex with a preview and
	// the colour picker, PropColor), the shape (square / circle) for types that allow one; for a
	// group also its frame's width and height (world units,
	// steps of 20 = half grid squares; never smaller than what it holds, like the corner handle).
	// Other node types bring their own content sections.
	import PropText from './PropText.svelte';
	import PropColor from './PropColor.svelte';
	import { graph, renameNode, setNodeColor, setNodeContent, isGroup, frames, nodeSizes } from '$lib/graph/store';
	import { nodeName, nodeColor, nodeShape, nodeType, NODE_SHAPES, GROUP_MIN } from '$lib/graph/node-types';
	import { resizeGroup } from '$lib/graph/groups';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
	// the shapes this node's type allows (none: its shape is fixed, e.g. a UML class)
	$: shapes = NODE_SHAPES.filter((s) => nodeType(node.type)?.shapes?.includes(s.id));
	// computed here, not in the markup: Svelte 5 compiles a function call as a <select> value
	// into code that throws ("$0 is not defined")
	$: shape = nodeShape(node);

	function chooseShape(event: Event): void {
		const shape = (event.currentTarget as HTMLSelectElement).value;
		const id = node.id;
		graph.update((g) => setNodeContent(g, id, { shape }));
	}

	// a group's frame as drawn (grown around its children)
	$: size = isGroup(node) ? ($frames[node.id] ?? null) : null;

	// a group's frame size, as data for one template
	const SIZE_FIELDS = [
		{ key: 'width', title: 'Width', axis: 'w' },
		{ key: 'height', title: 'Height', axis: 'h' }
	] as const;

	function setSize(key: 'width' | 'height', typed: string): void {
		const value = Math.round(Number(typed));
		if (typed.trim() === '' || !Number.isFinite(value)) return; // field shows the old value again
		const id = node.id;
		const current = $frames[id];
		if (!current) return;
		const next = { w: current.w, h: current.h, [key === 'width' ? 'w' : 'h']: value };
		const sizes = $nodeSizes;
		graph.update((g) => resizeGroup(g, id, next, sizes)); // clamped to the children
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

	{#if shapes.length}
		<dt><label for="prop-node-shape">Shape</label></dt>
		<dd>
			<select id="prop-node-shape" class="prop-input" value={shape} on:change={chooseShape}>
				{#each shapes as option (option.id)}
					<option value={option.id}>{option.title}</option>
				{/each}
			</select>
		</dd>
	{/if}

	{#if size}
		{#each SIZE_FIELDS as field (field.key)}
			<dt>{field.title}</dt>
			<dd>
				<PropText type="number" step={20} min={GROUP_MIN} label="Group {field.key}" value={size[field.axis]} onCommit={(v) => setSize(field.key, v)} />
			</dd>
		{/each}
	{/if}
</dl>
