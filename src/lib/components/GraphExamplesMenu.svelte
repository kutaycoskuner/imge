<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Examples tab of the graph editor's Esc menu: one example graph per kind of graph
	// (static/data/examples/index.json, see docs/graph-types.md) as cerulean chips in columns
	// (as many as fit in 60% of the window; one in narrow windows) under category headings
	// (Mind mapping, Math, Circuits, Software architecture, Other; `category` in the index),
	// each with its description under it; a sketch (a type
	// the editor can't draw yet, shown with basic nodes) gets a small "sketch" tag. A click
	// opens the example without a file name.
	import { onMount } from 'svelte';
	import { workspace, listExamples, openExample, type ExampleGraph } from '$lib/graph/file-access';
	import { menuOpen } from '../../stores/imge_main';

	let examples: ExampleGraph[] = [];
	// the examples under their category headings, in the index's order; no category: "Other"
	$: categories = examples.reduce<{ title: string; items: ExampleGraph[] }[]>((list, example) => {
		const title = example.category ?? 'Other';
		const found = list.find((c) => c.title === title);
		if (found) found.items.push(example);
		else list.push({ title, items: [example] });
		return list;
	}, []);
	onMount(async () => {
		examples = await listExamples();
	});

	async function pickExample(example: ExampleGraph): Promise<void> {
		if (await openExample(example)) menuOpen.set(false);
	}
</script>

<div class="examples-menu">
	{#each categories as category (category.title)}
	<section class="category">
	<h4 class="category-title">{category.title}</h4>
	<ul class="examples">
		{#each category.items as example (example.file)}
			<li>
				<!-- the kind of graph is in the hover text: the category heading already groups them,
				     and a chip on one line keeps the whole tab without scrolling -->
				<button class="example" title="{example.kind}: {example.description}" on:click={() => pickExample(example)}>
					{example.name}{#if example.sketch}<span
							class="example-sketch"
							title="This type isn't drawn by the editor yet: shown with basic nodes (see docs/graph-types.md)">sketch</span
						>{/if}
				</button>
				<span class="example-description">{example.description}</span>
			</li>
		{/each}
	</ul>
	</section>
	{/each}
	<p class="note">Opens without a file name: save it under a name of your own (Config tab).</p>

	{#if $workspace.status}
		<p class="status">{$workspace.status}</p>
	{/if}
</div>

<style>
	.examples-menu {
		--col-example: #2a9fd6; /* cerulean, like the menu's open tab */
		display: flex;
		flex-direction: column;
		gap: 0.6em;
		/* 60% of the window on wide screens, so every example fits without scrolling; up to
		   1024 px the menu already takes the window's width (SettingsOverlay) */
		width: 60vw;
		max-width: 100%;
		text-align: left;
	}

	@media (max-width: 1024px) {
		.examples-menu {
			width: auto;
		}
	}

	/* one block per category: a small heading, then its examples */
	.category {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
	}

	.category-title {
		margin: 0;
		font-size: 0.72em;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.6;
	}

	/* as many columns as fit (at least about 13em each), each entry a chip with its
	   description under it */
	.examples {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13em, 1fr));
		gap: 0.35em 1.4em;
	}

	.examples li {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.2em;
		min-width: 0;
	}

	@media (max-width: 640px) {
		.examples {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	/* buttons are reset globally (settings_overlay.css), so the chip look is set here */
	.example {
		cursor: pointer;
		padding: 0.15em 0.55em;
		border: 1px solid color-mix(in srgb, var(--col-example) 45%, transparent);
		border-radius: 4px;
		background: color-mix(in srgb, var(--col-example) 12%, transparent);
		color: var(--col-example);
		font-size: 0.8em;
		text-align: left;
		max-width: 100%; /* a long name wraps inside its column */
		user-select: none;
	}

	.example:hover {
		border-color: var(--col-example);
		background: color-mix(in srgb, var(--col-example) 22%, transparent);
	}

	/* types the editor can't draw yet: a small outlined tag on the chip */
	.example-sketch {
		margin-left: 0.45em;
		padding: 0 0.3em;
		border: 1px dashed currentColor;
		border-radius: 3px;
		font-size: 0.75em;
		opacity: 0.8;
	}

	.example-description,
	.note,
	.status {
		margin: 0;
		padding: 0;
		font-size: 0.75em;
		line-height: 1.35;
		opacity: 0.6;
	}

	.status {
		opacity: 1;
	}
</style>
