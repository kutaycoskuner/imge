<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-15
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Examples tab of the keyboard layout page's Esc menu (registered by
	// routes/keyboard_layout/+page.svelte): the example layouts listed in
	// static/data/keymaps/index.json; a click opens one (asks first when the open layout has
	// bindings) and closes the menu.
	import { onMount } from 'svelte';
	import { menuOpen } from '../../stores/imge_main';
	import { status, listKeymapExamples, openExample, type KeymapExample } from './store';

	let examples: KeymapExample[] = [];
	onMount(async () => (examples = await listKeymapExamples()));

	async function open(example: KeymapExample): Promise<void> {
		if (await openExample(example)) menuOpen.set(false);
	}
</script>

<div class="keymap-menu">
	<ul class="examples">
		{#each examples as example (example.file)}
			<li>
				<button class="example" on:click={() => open(example)}>{example.name}</button>
				<span class="note">{example.description}</span>
			</li>
		{/each}
	</ul>
	<p class="note">An example replaces the open layout; download yours first to keep it (Config tab or the toolbar).</p>
	{#if $status}<p class="status">{$status}</p>{/if}
</div>

<style>
	.keymap-menu {
		display: flex;
		flex-direction: column;
		gap: 1em;
		text-align: left;
		min-width: min(36em, 100%);
	}

	.examples {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6em;
	}

	.examples li {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15em;
	}

	/* buttons are reset globally (settings_overlay.css), so their look is set here */
	.example {
		--col-example: #2a9fd6;
		font: inherit;
		font-size: 0.85em;
		color: var(--col-example);
		border: 1px solid color-mix(in srgb, var(--col-example) 45%, transparent);
		background: color-mix(in srgb, var(--col-example) 12%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.6em;
		cursor: pointer;
	}

	.example:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	.note,
	.status {
		margin: 0;
		font-size: 0.75em;
		opacity: 0.6;
	}

	.status {
		opacity: 1;
	}
</style>
