<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-06
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The keyboard layout page's Esc menu (registered by routes/keyboard_layout/+page.svelte):
	// the layout file (new, open a file, download), the example layouts, and the keyboard: its
	// shape (ANSI / ISO, stored in the layout), numpad shown, labels from the user's own layout
	// (view settings, kept in this browser). The menu closes when a layout opens.
	import { onMount } from 'svelte';
	import { menuOpen } from '../../stores/imge_main';
	import { keymap, view, layoutMap, status, newKeymap, pickKeymapFile, downloadKeymap, listKeymapExamples, openExample, type KeymapExample } from './store';
	import { setMetadata, PHYSICAL, type Physical } from './keymap';

	let examples: KeymapExample[] = [];
	onMount(async () => (examples = await listKeymapExamples()));

	const SHAPES: Record<Physical, string> = {
		ansi: 'ANSI (US): wide left Shift, \\ above Enter',
		iso: 'ISO (Europe, e.g. Turkish Q, German): extra key left of Z, tall Enter'
	};
	const close = (opened: boolean) => opened && menuOpen.set(false);
</script>

<div class="keymap-menu">
	<section>
		<h3>Layout</h3>
		<div class="row">
			<button class="action" on:click={() => close(newKeymap())}>New layout</button>
			<button class="action" on:click={async () => close(await pickKeymapFile())}>Open a file…</button>
			<button class="action" on:click={downloadKeymap}>Download .json</button>
		</div>
		<p class="note">
			A layout file (.json) can also be dropped on the page. The open layout is kept in this browser between visits;
			download it to keep or share it.
		</p>
	</section>

	<section>
		<h3>Examples</h3>
		<ul class="examples">
			{#each examples as example (example.file)}
				<li>
					<button class="example" on:click={async () => close(await openExample(example))}>{example.name}</button>
					<span class="note">{example.description}</span>
				</li>
			{/each}
		</ul>
	</section>

	<section>
		<h3>Keyboard</h3>
		<div class="row">
			<span>Shape</span>
			<select class="choice" value={$keymap.metadata.physical} on:change={(e) => keymap.update((m) => setMetadata(m, { physical: e.currentTarget.value as Physical }))}>
				{#each PHYSICAL as shape}<option value={shape}>{SHAPES[shape]}</option>{/each}
			</select>
		</div>
		<label class="row toggle"><input type="checkbox" bind:checked={$view.numpad} /> Numpad</label>
		<label class="row toggle">
			<input type="checkbox" bind:checked={$view.ownLabels} disabled={!$layoutMap} />
			Key labels from my keyboard layout
			<span class="note">{$layoutMap ? '' : '(this browser doesn’t tell it: US labels; Chrome and Edge do)'}</span>
		</label>
	</section>

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

	h3 {
		margin: 0 0 0.4em;
		font-size: 0.8em;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5em;
		margin: 0.3em 0;
		font-size: 0.85em;
	}

	/* buttons are reset globally (settings_overlay.css), so their look is set here */
	.action,
	.example {
		font: inherit;
		color: var(--col);
		background: none;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.6em;
		cursor: pointer;
	}

	.action:hover,
	.example:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	.example {
		--col-example: #2a9fd6;
		color: var(--col-example);
		border-color: color-mix(in srgb, var(--col-example) 45%, transparent);
		background: color-mix(in srgb, var(--col-example) 12%, transparent);
		font-size: 0.85em;
	}

	.examples {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4em;
	}

	.examples li {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.15em;
	}

	.choice {
		font: inherit;
		color: var(--col);
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		max-width: 100%;
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
