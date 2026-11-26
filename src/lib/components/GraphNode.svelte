<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-26
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
	// Its shape (content `shape`, types that allow it): square (the default) or circle.
	// A UML class (type "uml-class") is drawn as three stacked compartments: class name,
	// attributes, methods; every member line is highlighted by its parts (uml.ts) and a line
	// that doesn't follow the notation is underlined in red, its error as a tooltip. UML's
	// text styles: an abstract class's name and {abstract} methods in italics, {static}
	// members underlined (the markers themselves aren't drawn).
	// A text node (type "text") is only its text: no box, no ports, its lines as typed, in its
	// colour, bold and alignment, at its scale (font size); double-click or F2 edits it in a
	// field (Enter = new line, Ctrl+Enter or clicking away saves, Esc cancels). An image node
	// (type "image") is only its picture at its stored size times its scale, with its ports on
	// the edges, and its caption under it (beside it in top-to-bottom graphs; outside the node's
	// box, so the ports stay at the picture's middle) when shown (imageCaption, captionOverride). Both show a scale handle in the bottom-right corner that the page drags.
	// While gravity runs (Augment menu, $lib/graph/gravity-run.ts), every node but groups and
	// text nodes is a round dot sized by its number of links, its name inside it, its ports
	// unseen at the dot's centre (links meet there). While arithmetic runs, an operator's or
	// "="'s result is shown beside it ("= 28", or "⚠ no result" with the reason on hover).
	// A table node (type "table") is a box with its table (NodeTable.svelte: name, cells with
	// their row and column styles, cells edited by double-click); a graph node (type "graph")
	// a box with its name, its mode and a preview of the graph it embeds or links to
	// (NodeGraph.svelte; double-click the preview opens it). Both have ports and a scale handle.
	// Mouse down for select/drag/link is handled by the page through the data-* attributes;
	// ports carry `data-port-key` ("<node id>:<port id>") so GraphLinks can find and measure them,
	// and `data-port-kind` (in / out / any) for the link rules.
	import { graph, editingNodeId, renameNode, setNodeContent, isGroup, frames, captionOverride } from '$lib/graph/store';
	import type { GraphNode } from '$lib/graph/types';
	import { nodeLabel, nodeName, nodeColor, portSide, umlMembers, umlAbstract, nodeShape, nodeScale, nodeText, imageOf, imageCaption } from '$lib/graph/node-types';
	import { parseAttribute, parseMethod, drawnTokens } from '$lib/graph/uml';
	import { parseHexColor, dimColor } from '$lib/graph/color';
	import NodeTable from './NodeTable.svelte';
	import NodeGraph from './NodeGraph.svelte';
	import { gravityOn, nodeDegrees } from '$lib/graph/gravity-run';
	import { dotRadius, takesPart } from '$lib/graph/gravity';
	import { arithmeticResults } from '$lib/graph/arithmetic-run';
	import { formatValue } from '$lib/graph/arithmetic';

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
	$: abstract = uml && umlAbstract(node);
	// content shape (basic, group): a circle is drawn round (styles .shape-circle in imge.css)
	$: circle = nodeShape(node) === 'circle';
	// the two member compartments, as data for one template: parsed lines (tokens + error)
	$: compartments = uml
		? [
				{ label: 'Attributes', lines: umlMembers(node, 'attributes').map(parseAttribute) },
				{ label: 'Methods', lines: umlMembers(node, 'methods').map(parseMethod) }
			]
		: [];

	// text and image nodes: no box, drawn at their scale
	$: textNode = node.type === 'text';
	$: imageNode = node.type === 'image';
	$: scale = nodeScale(node);
	$: image = imageNode ? imageOf(node) : null;
	$: caption = imageNode ? imageCaption(node, $captionOverride) : '';
	// table and graph nodes: a box with their own inside (NodeTable, NodeGraph), at their scale
	$: tableNode = node.type === 'table';
	$: graphNode = node.type === 'graph';
	// gravity running (Augment menu): a dot sized by the node's links, its name beside it
	$: dot = $gravityOn && takesPart(node);
	$: radius = dot ? dotRadius($nodeDegrees[node.id] ?? 0) : 0;
	// its name's size inside the dot: as large as fits the dot's width (a bold character is
	// about 0.6 of the size wide), between 7 and 16 px; a name that still doesn't fit is cut with …
	$: dotFont = dot ? Math.max(7, Math.min(16, radius * 0.5, (1.76 * radius) / (0.6 * Math.max(1, nodeLabel(node).length)))) : 0;
	// arithmetic running (Augment menu): an operator's or "="'s result beside the node
	$: calc = $arithmeticResults[node.id];

	let draft = '';
	$: editing = $editingNodeId === node.id;
	$: if (editing) draft = textNode ? nodeText(node) : name;

	function commit(): void {
		// the store, not `editing`: the field's blur can fire after Esc already ended editing
		if ($editingNodeId !== node.id) return;
		const id = node.id;
		const text = draft;
		graph.update((g) => (textNode ? setNodeContent(g, id, { text }) : renameNode(g, id, text)));
		editingNodeId.set(null);
	}

	// the text field: Enter makes a new line, Ctrl+Enter saves, Esc cancels
	function handleTextKey(event: KeyboardEvent): void {
		if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) commit();
		else if (event.key === 'Escape') {
			event.preventDefault();
			cancel();
		}
	}

	function focusText(el: HTMLTextAreaElement) {
		el.focus();
		el.select();
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
	class:uml={uml && !dot}
	class:abstract={abstract && !dot}
	class:text-node={textNode}
	class:image-node={imageNode && !dot}
	class:table-node={tableNode && !dot}
	class:graph-node={graphNode && !dot}
	class:shape-circle={circle && !dot}
	class:dot
	data-id={node.id}
	style="transform: translate({at.x}px, {-at.y}px);{color
		? ` --node-col: ${color}; --node-fill: ${dimColor(color)};`
		: ''}{frame ? ` width: ${frame.w}px; height: ${frame.h}px;` : ''}{dot ? ` width: ${2 * radius}px; height: ${2 * radius}px;` : ''}"
>
	{#if dot}
		<!-- gravity: the dot is the node's box itself (round, sized by its links); its name inside,
		     sized with the dot, cut with … when it doesn't fit (the whole name on hover) -->
		<div class="dot-label" style="font-size: {dotFont}px;" title={nodeLabel(node)}>{nodeLabel(node)}</div>
	{:else if group}
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
	{:else if textNode}
		{#if editing}
			<textarea
				class="text-input"
				style="font-size: {scale}em; text-align: {node.content.align ?? 'left'};"
				rows={Math.max(1, draft.split('\n').length)}
				bind:value={draft}
				use:focusText
				on:keydown|stopPropagation={handleTextKey}
				on:blur={commit}
			></textarea>
		{:else}
			<div
				class="text-body"
				class:bold={node.content.bold === true}
				style="font-size: {scale}em; text-align: {node.content.align ?? 'left'};"
				role="presentation"
				on:dblclick={() => editingNodeId.set(node.id)}
			>{nodeText(node) || ' '}</div>
		{/if}
		<!-- the page drags this corner to scale the node -->
		<div class="node-scale" data-node-id={node.id} title="Drag to scale"></div>
	{:else if image}
		<img class="image-body" src={image.src} alt={name} width={image.w} height={image.h} draggable="false" />
		{#if caption}<div class="image-caption">{caption}</div>{/if}
		<div class="node-scale" data-node-id={node.id} title="Drag to scale"></div>
	{:else if tableNode}
		<div class="table-body" style="font-size: {scale}em;">
			{#if editing}
				<input class="node-title-input" bind:value={draft} use:focusSelect on:keydown|stopPropagation={handleKey} on:blur={commit} />
				<NodeTable {node} name="" />
			{:else}
				<NodeTable {node} {name} />
			{/if}
		</div>
		<div class="node-scale" data-node-id={node.id} title="Drag to scale"></div>
	{:else if graphNode}
		{#if editing}
			<input class="node-title-input" bind:value={draft} use:focusSelect on:keydown|stopPropagation={handleKey} on:blur={commit} />
		{:else}
			<!-- without a name of its own it shows what it links to -->
			<div class="node-title" role="presentation" on:dblclick={() => editingNodeId.set(node.id)}>{name || nodeLabel(node)}</div>
		{/if}
		<NodeGraph {node} />
		<div class="node-scale" data-node-id={node.id} title="Drag to scale"></div>
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
				<li class="uml-line" class:invalid={!!line.error} class:static={line.static} class:abstract={line.abstract} title={line.error ?? undefined}>{#each line.error ? line.tokens : drawnTokens(line) as token}<span class="uml-{token.kind}">{token.text}</span>{/each}</li>
			{/each}
		</ul>
	{/each}
	{/if}

	{#if !group && !textNode}
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

	{#if calc}
		<!-- arithmetic: the result (or why there is none, the reason on hover) -->
		<div class="calc-result" class:error={!calc.ok} title={calc.ok ? undefined : calc.error}>
			{calc.ok ? `= ${formatValue(calc.value)}` : '⚠ no result'}
		</div>
	{/if}
</div>
