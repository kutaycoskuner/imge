<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-02
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Text" for a text node (type "text"): the text (several lines;
	// leaving the field saves it, Esc puts it back), its colour, scale (also the node's corner
	// handle), bold and alignment. All in the node's content via setNodeContent / setNodeColor
	// / setNodeScale.
	import PropText from './PropText.svelte';
	import PropColor from './PropColor.svelte';
	import { graph, setNodeContent, setNodeColor, setNodeScale } from '$lib/graph/store';
	import { nodeText, nodeColor, nodeScale, SCALE_MIN, SCALE_MAX } from '$lib/graph/node-types';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];

	// the alignments, as data for one dropdown
	const ALIGNS = [
		{ id: 'left', title: 'Left' },
		{ id: 'center', title: 'Centre' },
		{ id: 'right', title: 'Right' }
	];
	// computed here: a function call as a <select> value doesn't compile in this Svelte mode
	$: align = typeof node.content.align === 'string' ? node.content.align : 'left';

	// the text field keeps its own draft while focused, so typing isn't reset by the graph
	let draft = '';
	let focused = false;
	$: if (!focused) draft = nodeText(node);

	function save(): void {
		focused = false;
		const id = node.id;
		const text = draft;
		graph.update((g) => setNodeContent(g, id, { text }));
	}

	function key(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault();
			draft = nodeText(node);
			(event.currentTarget as HTMLTextAreaElement).blur();
		}
	}

	const set = (patch: Record<string, unknown>) => {
		const id = node.id;
		graph.update((g) => setNodeContent(g, id, patch));
	};
</script>

<dl class="props">
	<dt class="prop-top"><label for="prop-text-text">Text</label></dt>
	<dd>
		<textarea
			id="prop-text-text"
			class="prop-input prop-textarea"
			rows={Math.min(8, Math.max(2, draft.split('\n').length))}
			bind:value={draft}
			on:focus={() => (focused = true)}
			on:blur={save}
			on:keydown={key}
		></textarea>
	</dd>

	<dt class="prop-top">Color</dt>
	<dd>
		<PropColor value={nodeColor(node)} onCommit={(color) => graph.update((g) => setNodeColor(g, [node.id], color))} />
	</dd>

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
		<div class="prop-faint">1 = normal size; also the corner handle</div>
	</dd>

	<dt><label for="prop-text-align">Align</label></dt>
	<dd>
		<select id="prop-text-align" class="prop-input" value={align} on:change={(e) => set({ align: e.currentTarget.value })}>
			{#each ALIGNS as option (option.id)}<option value={option.id}>{option.title}</option>{/each}
		</select>
	</dd>
</dl>
<label class="prop-check">
	<input type="checkbox" checked={node.content.bold === true} on:change={(e) => set({ bold: e.currentTarget.checked })} />
	Bold
</label>
