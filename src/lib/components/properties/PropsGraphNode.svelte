<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-26
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Graph" for a graph node (type "graph"): its mode, chosen
	// explicitly, and what goes with it.
	//   Embedded (internal): the graph is stored in this node; its size, Open to edit it, and
	//     Save as separate graph (in this browser or as a file in the open folder), after which
	//     the node links to it.
	//   Linked (external): the graph it points to, chosen from the graphs saved in this browser
	//     and the graphs in the open folder; whether it is found; Open; and Embed a copy, which
	//     copies it into the node as it is now.
	// Switching the mode only switches what the node shows; the conversions carry the graph
	// over. The preview's size is the node's scale. Name and colour: the Content section.
	// Actions: $lib/graph/file-access.ts, rules: $lib/graph/graph-node.ts.
	import PropText from './PropText.svelte';
	import { graph, setNodeContent, setNodeScale } from '$lib/graph/store';
	import { nodeScale, SCALE_MIN, SCALE_MAX } from '$lib/graph/node-types';
	import { graphMode, graphRef, embeddedGraph, refPlace, graphNodeLabel, type GraphRef } from '$lib/graph/graph-node';
	import {
		workspace,
		browserGraphs,
		folderGraphCache,
		enterGraphNode,
		linkGraphNode,
		embedGraphCopy,
		saveEmbeddedGraphSeparately
	} from '$lib/graph/file-access';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
	$: mode = graphMode(node.content);
	$: ref = graphRef(node.content);
	$: embedded = embeddedGraph(node.content);
	$: w = $workspace;
	$: hasFolder = !!w.folder || w.readOnly;

	// the target list's value for a reference: "browser:<id>" / "folder:<path>"
	const refKey = (r: GraphRef | null) => (!r ? '' : r.source === 'browser' ? `browser:${r.id}` : `folder:${r.path}`);
	// computed here: a function call as a <select> value doesn't compile in this Svelte mode
	$: currentKey = refKey(ref);
	$: found = !ref
		? false
		: ref.source === 'browser'
			? $browserGraphs.some((s) => s.id === ref.id)
			: $folderGraphCache[ref.path] != null || w.files.some((f) => f.fileName === ref.path);

	function pick(value: string): void {
		const id = node.id;
		if (value.startsWith('browser:')) {
			const entry = $browserGraphs.find((s) => s.id === value.slice(8));
			if (entry) linkGraphNode(id, { source: 'browser', id: entry.id, name: entry.name });
		} else if (value.startsWith('folder:')) {
			const file = w.files.find((f) => f.fileName === value.slice(7));
			if (file) linkGraphNode(id, { source: 'folder', path: file.fileName, name: file.name });
		}
	}

	function setMode(next: string): void {
		const id = node.id;
		graph.update((g) => setNodeContent(g, id, { mode: next }));
	}

	// "Save as separate graph": where and under which name
	let saveWhere: 'browser' | 'folder' = 'browser';
	let saveName = '';
	$: if (!w.folder && saveWhere === 'folder') saveWhere = 'browser';
</script>

<dl class="props">
	<dt class="prop-top">Mode</dt>
	<dd>
		<label class="prop-check"><input type="radio" name="graph-mode-{node.id}" checked={mode === 'internal'} on:change={() => setMode('internal')} /> Embedded (internal)</label>
		<label class="prop-check"><input type="radio" name="graph-mode-{node.id}" checked={mode === 'external'} on:change={() => setMode('external')} /> Linked (external)</label>
		<div class="prop-faint">
			{mode === 'internal' ? 'Stored inside this graph; travels with its file.' : 'Points to a graph kept elsewhere; shows its current state.'}
		</div>
	</dd>

	{#if mode === 'external'}
		<dt class="prop-top"><label for="prop-graph-target">Graph</label></dt>
		<dd>
			<select id="prop-graph-target" class="prop-input" value={currentKey} on:change={(e) => pick(e.currentTarget.value)}>
				{#if !ref}<option value="">— choose a graph —</option>{/if}
				{#if ref && !found}<option value={currentKey}>{ref.name} (not found)</option>{/if}
				<optgroup label="In this browser">
					{#each $browserGraphs as entry (entry.id)}<option value="browser:{entry.id}">{entry.name}</option>{/each}
				</optgroup>
				{#if hasFolder}
					<optgroup label="In the folder {w.folderName ?? ''}">
						{#each w.files as file (file.fileName)}<option value="folder:{file.fileName}">{file.dir}{file.name}</option>{/each}
					</optgroup>
				{/if}
			</select>
			<div class="prop-faint">
				{#if !ref}
					Save graphs in this browser (Esc menu, Saved) or open a folder (Config) to choose them here.
				{:else if found}
					{ref.name}, {refPlace(ref)}
				{:else}
					"{ref.name}" isn't {refPlace(ref)}{ref.source === 'folder' && !hasFolder ? ' (no folder open)' : ''}
				{/if}
			</div>
		</dd>
	{:else}
		<dt>Holds</dt>
		<dd>{embedded ? `${embedded.data.nodes.length} nodes, ${embedded.data.links.length} links` : 'nothing yet'}</dd>
	{/if}

	<dt>Scale</dt>
	<dd>
		<PropText
			type="number"
			step={0.25}
			min={SCALE_MIN}
			max={SCALE_MAX}
			label="Scale"
			value={nodeScale(node)}
			onCommit={(typed) => graph.update((g) => setNodeScale(g, node.id, Number(typed)))}
		/>
		<div class="prop-faint">the preview's size; also the corner handle</div>
	</dd>
</dl>

<div class="prop-actions">
	<button type="button" class="prop-button" disabled={mode === 'external' && !ref} on:click={() => enterGraphNode(node.id)}>
		{mode === 'internal' ? 'Open to edit' : 'Open'}
	</button>
	{#if mode === 'external'}
		<button type="button" class="prop-button" disabled={!ref || !found} on:click={() => embedGraphCopy(node.id)} title="Copy the linked graph into this node as it is now">
			Embed a copy
		</button>
	{/if}
</div>

{#if mode === 'internal'}
	<div class="prop-subtitle">Save as separate graph</div>
	<form class="prop-actions" on:submit|preventDefault={async () => (await saveEmbeddedGraphSeparately(node.id, saveWhere, saveName)) && (saveName = '')}>
		<input class="prop-input" aria-label="Name" placeholder={graphNodeLabel(node)} bind:value={saveName} />
		<select class="prop-input" aria-label="Where" bind:value={saveWhere}>
			<option value="browser">in this browser</option>
			<option value="folder" disabled={!w.folder}>in the folder{w.folder ? '' : ' (choose one in Config)'}</option>
		</select>
		<button type="submit" class="prop-button">Save and link</button>
	</form>
	<div class="prop-faint">The node then links to it (external); edits there show up here.</div>
{/if}

{#if w.status}<div class="prop-faint">{w.status}</div>{/if}
