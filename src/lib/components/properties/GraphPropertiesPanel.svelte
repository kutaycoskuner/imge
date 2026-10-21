<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The graph editor's Properties panel, docked on the right like Blender's sidebar (N; the
	// title says "Properties (N)"):
	// shows and edits whatever is selected, so nodes on the canvas can stay small and the
	// graph readable as a whole. Which sections appear is data (sections.ts); each section
	// is folded / unfolded by its header (remembered in this browser). Hidden with the
	// header's chevron, the N key or the toolbar button (showPropertiesPanel, remembered);
	// while hidden a small tab on the right edge brings it back.
	// Every edit goes through the graph store, so it is undoable like any other edit.
	// Requires: the page's graph and selection stores. Used by: routes/+page.svelte.
	// Details: docs/graph-properties-panel.md
	import { onMount } from 'svelte';
	import { graph, selection, showPropertiesPanel } from '$lib/graph/store';
	import { PANEL_SECTIONS, type PanelContext } from './sections';
	import IconChevronRight from '$lib/icons/icon-chevron-right.svelte';
	import IconChevronLeft from '$lib/icons/icon-chevron-left.svelte';
	import IconChevronDown from '$lib/icons/icon-chevron-down.svelte';

	const FOLDED_KEY = 'imge.graphEditor.foldedSections';

	// the selection resolved to objects; ids that no longer exist are left out
	let ctx: PanelContext;
	$: ctx = {
		graph: $graph,
		selection: $selection,
		nodes: $selection.nodes
			.map((id) => $graph.data.nodes.find((n) => n.id === id))
			.filter((n): n is NonNullable<typeof n> => !!n),
		link: $graph.data.links.find((l) => l.id === $selection.link) ?? null
	};
	$: sections = PANEL_SECTIONS.filter((section) => section.show(ctx));

	// folded sections (by id), a per-browser convenience; storage may be blocked
	let folded: Record<string, boolean> = {};
	onMount(() => {
		try {
			folded = JSON.parse(localStorage.getItem(FOLDED_KEY) ?? '{}');
		} catch {
			folded = {};
		}
	});
	function toggleFold(id: string): void {
		folded = { ...folded, [id]: !folded[id] };
		try {
			localStorage.setItem(FOLDED_KEY, JSON.stringify(folded));
		} catch {
			// storage blocked: folding still works for this visit
		}
	}
</script>

{#if $showPropertiesPanel}
	<aside class="properties-panel" aria-label="Properties">
		<header class="panel-header">
			<span class="panel-title">Properties (N)</span>
			<button class="panel-icon" title="Hide the panel [N]" on:click={() => showPropertiesPanel.set(false)}>
				<IconChevronRight />
			</button>
		</header>

		{#each sections as section (section.id)}
			<section class="panel-section">
				<button
					class="section-header"
					aria-expanded={!folded[section.id]}
					on:click={() => toggleFold(section.id)}
				>
					<span class="fold" class:folded={folded[section.id]}><IconChevronDown /></span>
					{section.title}
				</button>
				{#if !folded[section.id]}
					<div class="section-body">
						<svelte:component this={section.component} {ctx} />
					</div>
				{/if}
			</section>
		{/each}
	</aside>
{:else}
	<button class="panel-tab" title="Show the Properties panel [N]" on:click={() => showPropertiesPanel.set(true)}>
		<IconChevronLeft />
	</button>
{/if}

<style>
	/* the dock: floats over the canvas on the right below the theme button, as tall as its
	   sections, and scrolls when they are taller than the space above the coordinates */
	.properties-panel {
		position: fixed;
		top: 3.2em;
		right: 1em;
		max-height: calc(100vh - 6.8em);
		width: min(17em, calc(100vw - 2em));
		overflow-y: auto;
		overflow-x: hidden; /* never sideways: content wraps or shrinks instead (below) */
		scrollbar-width: thin;
		z-index: 25;
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		padding: 0.4em;
		box-sizing: border-box;
		background: var(--bg);
		color: var(--col);
		border: 1px solid color-mix(in srgb, var(--col) 18%, transparent);
		border-radius: 6px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		font-size: 0.78em;
		text-align: left;
	}

	/* widths include padding and borders, so full-width rows and fields fit exactly */
	.properties-panel :global(*) {
		box-sizing: border-box;
	}

	.panel-header {
		display: flex;
		align-items: center;
		gap: 0.5em;
		padding: 0.1em 0.2em 0.3em;
	}

	.panel-title {
		flex: 1;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	/* buttons are reset globally (settings_overlay.css), so they get their look here */
	button {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		cursor: pointer;
	}

	.panel-icon,
	.panel-tab {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		opacity: 0.7;
	}

	.panel-icon:hover,
	.panel-tab:hover {
		opacity: 1;
	}

	.panel-icon :global(svg) {
		width: 1.3em;
		height: 1.3em;
	}

	/* hidden panel: a small tab on the right edge, like Blender's sidebar arrow */
	.panel-tab {
		position: fixed;
		top: 3.2em;
		right: 0;
		z-index: 25;
		width: 1.1em;
		height: 2.4em;
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 18%, transparent);
		border-right: none;
		border-radius: 4px 0 0 4px;
	}

	.panel-tab :global(svg) {
		width: 0.9em;
		height: 0.9em;
	}

	/* one section: a header bar that folds it, like Blender's panels */
	.panel-section {
		border-radius: 4px;
		background: color-mix(in srgb, var(--col) 5%, transparent);
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 0.35em;
		width: 100%;
		padding: 0.35em 0.4em;
		font-weight: 600;
		text-align: left;
		user-select: none;
	}

	.fold {
		display: flex;
		transition: transform 0.12s;
	}

	.fold :global(svg) {
		width: 1em;
		height: 1em;
		opacity: 0.7;
	}

	.fold.folded {
		transform: rotate(-90deg);
	}

	.section-body {
		padding: 0.1em 0.6em 0.6em;
	}

	/* shared look of the sections' content (the section components use these classes) */
	.properties-panel :global(.props) {
		display: grid;
		/* minmax(0, …): the value column may shrink below its content's minimum width
		   (Firefox gives inputs about 20 characters), so it never overflows the panel */
		grid-template-columns: 4.6em minmax(0, 1fr);
		gap: 0.35em 0.6em;
		align-items: center;
		margin: 0;
	}

	.properties-panel :global(.props dt) {
		opacity: 0.65;
		text-align: right;
	}

	/* a label next to a tall value (e.g. the open colour picker) stays at the top of its row */
	.properties-panel :global(.props dt.prop-top) {
		align-self: start;
		padding-top: 0.3em;
	}

	.properties-panel :global(.props dd) {
		margin: 0;
		min-width: 0;
		overflow-wrap: anywhere;
	}

	.properties-panel :global(.prop-input) {
		width: 100%;
		min-width: 0;
		box-sizing: border-box;
		font: inherit;
		color: var(--col);
		background: color-mix(in srgb, var(--col) 7%, var(--bg));
		border: 1px solid color-mix(in srgb, var(--col) 15%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.4em;
		outline: none;
	}

	.properties-panel :global(.prop-input:focus) {
		border-color: var(--col-selected);
	}

	.properties-panel :global(.prop-mono) {
		font-family: monospace;
	}

	.properties-panel :global(.prop-note),
	.properties-panel :global(.prop-faint) {
		margin: 0.2em 0 0;
		opacity: 0.6;
		font-size: 0.92em;
	}

	.properties-panel :global(.prop-dirty) {
		color: var(--col-selected);
	}

	.properties-panel :global(.prop-subtitle) {
		margin: 0.8em 0 0.3em;
		font-size: 0.9em;
		font-weight: 600;
		opacity: 0.7;
	}

	.properties-panel :global(.prop-list) {
		list-style: none;
		margin: 0.3em 0 0;
		padding: 0;
	}

	/* a clickable row (selects what it names) */
	.properties-panel :global(.prop-row) {
		display: flex;
		flex-wrap: wrap; /* a long name wraps instead of widening the panel */
		justify-content: space-between;
		gap: 0 0.6em;
		width: 100%;
		min-width: 0;
		overflow-wrap: anywhere;
		padding: 0.15em 0.3em;
		border-radius: 3px;
		text-align: left;
	}

	.properties-panel :global(.prop-row:hover) {
		background: color-mix(in srgb, var(--col-selected) 15%, transparent);
	}

	.properties-panel :global(.prop-actions) {
		display: flex;
		justify-content: flex-end;
		margin-top: 0.6em;
	}

	.properties-panel :global(.prop-button) {
		padding: 0.25em 0.7em;
		border: 1px solid color-mix(in srgb, var(--col) 20%, transparent);
		border-radius: 3px;
	}

	.properties-panel :global(.prop-button:hover) {
		border-color: var(--col);
	}

	.properties-panel :global(.prop-button.danger:hover) {
		border-color: #d9534f;
		color: #d9534f;
	}
</style>
