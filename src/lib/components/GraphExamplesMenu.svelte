<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-16
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Examples tab of the graph editor's Esc menu: one example graph per kind of graph
	// (static/data/examples/index.json, see docs/graph-types.md) as cerulean chips,
	// each with its description. A click opens the example without a file name.
	import { onMount } from 'svelte';
	import { workspace, listExamples, openExample, type ExampleGraph } from '$lib/graph/file-access';
	import { menuOpen } from '../../stores/imge_main';

	let examples: ExampleGraph[] = [];
	onMount(async () => {
		examples = await listExamples();
	});

	async function pickExample(example: ExampleGraph): Promise<void> {
		if (await openExample(example)) menuOpen.set(false);
	}
</script>

<div class="examples-menu">
	<ul class="examples">
		{#each examples as example (example.file)}
			<li>
				<button class="example" title={example.description} on:click={() => pickExample(example)}>
					{example.name}<span class="example-kind">{example.kind}</span>
				</button>
				<span class="example-description">{example.description}</span>
			</li>
		{/each}
	</ul>
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
		gap: 0.8em;
		min-width: min(32em, 80vw);
		max-width: 40em;
		text-align: left;
	}

	.examples {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3em;
	}

	.examples li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.2em 0.6em;
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
		white-space: nowrap;
		user-select: none;
	}

	.example:hover {
		border-color: var(--col-example);
		background: color-mix(in srgb, var(--col-example) 22%, transparent);
	}

	.example-kind {
		margin-left: 0.45em;
		opacity: 0.65;
		font-size: 0.85em;
	}

	.example-description,
	.note,
	.status {
		margin: 0;
		padding: 0;
		font-size: 0.75em;
		opacity: 0.6;
	}

	.status {
		opacity: 1;
	}
</style>
