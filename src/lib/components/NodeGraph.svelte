<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-26
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The inside of a graph node (type "graph", drawn by GraphNode.svelte): its name with a
	// badge for its mode (embedded / linked, and where), then a small preview of the graph it
	// holds or links to: its nodes as boxes, groups as frames behind, links as lines
	// (graph-node.ts previewOf), at the node's scale. An external target is looked up live:
	// a graph saved in this browser from the list, a folder file read once and cached
	// (file-access.ts readFolderGraph); a target that isn't there shows "not found".
	// Double-click the preview to open the graph (file-access.ts enterGraphNode); the name
	// is renamed by double-click as on other nodes (handled by GraphNode).
	import { browserGraphs, folderGraphCache, readFolderGraph, workspace, enterGraphNode } from '$lib/graph/file-access';
	import { graphMode, graphRef, embeddedGraph, refPlace, previewOf, PREVIEW_SIZE } from '$lib/graph/graph-node';
	import { nodeScale } from '$lib/graph/node-types';
	import type { Graph, GraphNode } from '$lib/graph/types';
	import { get } from 'svelte/store';
	import { assistanceMsg } from '../../stores/imge_main';

	export let node: GraphNode;

	// opens the graph; what happened (opened, or why not) shows in the hint line for a moment
	let hintTimer: ReturnType<typeof setTimeout>;
	async function open(): Promise<void> {
		await enterGraphNode(node.id);
		assistanceMsg.set(get(workspace).status);
		clearTimeout(hintTimer);
		hintTimer = setTimeout(() => assistanceMsg.set(''), 4000);
	}

	$: mode = graphMode(node.content);
	$: ref = mode === 'external' ? graphRef(node.content) : null;
	$: scale = nodeScale(node);
	$: w = PREVIEW_SIZE.w * scale;
	$: h = PREVIEW_SIZE.h * scale;

	// the folder file is read when the node needs it (and again after the folder changed)
	$: if (ref?.source === 'folder' && ($workspace.folder || $workspace.readOnly) && !(ref.path in $folderGraphCache)) readFolderGraph(ref.path);

	let shown: Graph | null;
	$: shown =
		mode === 'internal'
			? embeddedGraph(node.content)
			: !ref
				? null
				: ref.source === 'browser'
					? ($browserGraphs.find((s) => s.id === ref.id)?.graph ?? null)
					: ($folderGraphCache[ref.path] ?? null);
	$: preview = shown ? previewOf(shown, w, h) : null;

	// what the badge and the empty preview say (the note in up to two short lines, so it fits
	// a small preview)
	$: targetName = ref?.source === 'browser' ? ($browserGraphs.find((s) => s.id === ref.id)?.name ?? ref.name) : ref?.name;
	$: badge = mode === 'internal' ? 'embedded' : ref ? `linked · ${refPlace(ref)}` : 'linked · nothing yet';
	let note: string[];
	$: note =
		mode === 'internal'
			? shown && shown.data.nodes.length
				? []
				: ['empty:', 'double-click to draw it']
			: !ref
				? ['choose a graph in', 'the Properties panel']
				: shown
					? shown.data.nodes.length
						? []
						: ['empty graph']
					: ref.source === 'folder' && !$workspace.folder && !$workspace.readOnly
						? [`"${ref.name}"`, 'open its folder to see it']
						: [`"${ref.name}"`, `not found ${refPlace(ref)}`];
</script>

<div class="graph-head">
	<span class="graph-mode" title={mode === 'external' && targetName ? `Linked to "${targetName}" ${ref ? refPlace(ref) : ''}` : 'Embedded in this graph'}>
		{mode === 'internal' ? '▣' : '↗'} {badge}
	</span>
</div>
<!-- double-click opens the graph; svg so it scales and exports as shapes -->
<svg
	class="graph-preview"
	class:missing={mode === 'external' && !!ref && !shown}
	width={w}
	height={h}
	viewBox="0 0 {w} {h}"
	role="img"
	aria-label="Preview of {targetName ?? 'the embedded graph'}; double-click to open"
	on:dblclick|stopPropagation={open}
>
	<title>Double-click to open</title>
	<rect class="graph-preview-bg" x="0.5" y="0.5" width={w - 1} height={h - 1} rx="4" />
	{#if preview}
		{#each preview.lines as l}<line class="graph-preview-link" x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />{/each}
		{#each preview.boxes as b}<rect class="graph-preview-{b.kind}" x={b.x} y={b.y} width={b.w} height={b.h} rx={b.kind === 'group' ? 3 : 2} />{/each}
	{/if}
	{#each note as line, i}
		<text class="graph-preview-note" x={w / 2} y={h / 2 + (i - (note.length - 1) / 2) * 14} text-anchor="middle" dominant-baseline="middle">{line}</text>
	{/each}
</svg>
