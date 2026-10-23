<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// One graph node inside the world layer: name (title, from content.name), its ports as
	// points on the start edge (left; in and two-way ports) and the end edge (right; out ports),
	// placed by each port's side (node-types.ts portSide), its colour (border in the colour, fill a dim version of it; see $lib/graph/color.ts),
	// selected highlight, and inline title editing (double-click or F2 via
	// `editingNodeId`; Enter or clicking away saves, Esc cancels).
	// A group (type "group") is drawn as a frame (a <fieldset>) with its name in a gap of the
	// top edge (the <legend>), no ports, drawn at its frame (its stored rect grown to wrap the
	// nodes it holds, store `frames`), with a resize handle in the bottom-right corner;
	// only the name and the handle take the mouse, so clicks inside the
	// frame reach the canvas and the nodes on top of it (styles: .node.group in imge.css).
	// A UML class (type "uml-class") is drawn as three stacked compartments: class name,
	// attributes, methods; every member line is highlighted by its parts (uml.ts) and a line
	// that doesn't follow the notation is underlined in red, its error as a tooltip.
	// Mouse down for select/drag/link is handled by the page through the data-* attributes;
	// ports carry `data-port-key` ("<node id>:<port id>") so GraphLinks can find and measure them,
	// and `data-port-kind` (in / out / any) for the link rules.
	import { graph, editingNodeId, renameNode, isGroup, frames } from '$lib/graph/store';
	import type { GraphNode } from '$lib/graph/types';
	import { nodeName, nodeColor, portSide, umlMembers } from '$lib/graph/node-types';
	import { parseAttribute, parseMethod } from '$lib/graph/uml';
	import { parseHexColor, dimColor } from '$lib/graph/color';

	export let node: GraphNode;
	export let selected = false;

	// only a hex colour is drawn; anything else in the file is kept but shown as the default
	$: name = nodeName(node);
	$: color = nodeColor(node) ? parseHexColor(nodeColor(node)!) : null;
	// the two port columns; ports on the edges across the flow (above / below) aren't drawn yet
	$: startPorts = node.ports.filter((p) => portSide(p) === 'start');
	$: endPorts = node.ports.filter((p) => portSide(p) === 'end');
	$: group = isGroup(node);
	// a group is drawn at its frame: its stored rect grown around its children (groups.ts)
	$: frame = group ? ($frames[node.id] ?? null) : null;
	$: at = frame ? { x: frame.x, y: frame.y } : node.position;
	$: uml = node.type === 'uml-class';
	// the two member compartments, as data for one template: parsed lines (tokens + error)
	$: compartments = uml
		? [
				{ label: 'Attributes', lines: umlMembers(node, 'attributes').map(parseAttribute) },
				{ label: 'Methods', lines: umlMembers(node, 'methods').map(parseMethod) }
			]
		: [];

	let draft = '';
	$: editing = $editingNodeId === node.id;
	$: if (editing) draft = name;

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
	class:uml
	data-id={node.id}
	style="transform: translate({at.x}px, {-at.y}px);{color
		? ` --node-col: ${color}; --node-fill: ${dimColor(color)};`
		: ''}{frame ? ` width: ${frame.w}px; height: ${frame.h}px;` : ''}"
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
					<span class="node-title" role="presentation" on:dblclick={() => editingNodeId.set(node.id)}>{name}</span>
				{/if}
			</legend>
		</fieldset>
		<!-- the page drags this corner to resize the group (never smaller than its children) -->
		<div class="group-resize" data-group-id={node.id} title="Drag to resize"></div>
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
			{name}
		</div>
	{/if}

	{#each compartments as compartment (compartment.label)}
		<ul class="uml-compartment" aria-label={compartment.label}>
			{#each compartment.lines as line}
				<li class="uml-line" class:invalid={!!line.error} title={line.error ?? undefined}>{#each line.tokens as token}<span class="uml-{token.kind}">{token.text}</span>{/each}</li>
			{/each}
		</ul>
	{/each}

	<div class="inputs">
		{#each startPorts as port (port.id)}
			<div
				class="port node-input"
				title={port.label}
				data-port-key="{node.id}:{port.id}"
				data-node-id={node.id}
				data-port-kind={port.kind}
				data-port-id={port.id}
			></div>
		{/each}
	</div>

	<div class="outputs">
		{#each endPorts as port (port.id)}
			<div
				class="port node-output"
				title={port.label}
				data-port-key="{node.id}:{port.id}"
				data-node-id={node.id}
				data-port-kind={port.kind}
				data-port-id={port.id}
			></div>
		{/each}
	</div>

	<div class="content">
		<div class="add-content hover-visible"></div>
	</div>
	{/if}
</div>
