<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-06
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Keyboard layout page: what the keys of a keyboard do (for a game, a program ...), with and
	// without modifiers. A keyboard ($lib/keymap/KeyboardView) shows one layer at a time (the
	// chips: no modifier, Shift, Ctrl, Alt, Ctrl+Shift ...; holding the real modifier keys shows
	// theirs), each key coloured by its category with what it does. Clicking a key, or pressing
	// it (with modifiers), selects it: the editor lists it in every layer, and the pressed
	// layer's field takes the typing. Categories have a name and a colour; the list below shows
	// every binding by category, with a search.
	// Layout files: the Esc menu (new, open, download, examples, keyboard shape), or drop a
	// .json on the page. The open layout is kept in this browser. Data and rules:
	// $lib/keymap/keymap.ts, state and files: $lib/keymap/store.ts. Details: docs/keyboard-layout.md
	import { onMount, tick } from 'svelte';
	import { menuOpen, pageMenu } from '../../stores/imge_main';
	import KeyboardView from '$lib/keymap/KeyboardView.svelte';
	import KeyEditor from '$lib/keymap/KeyEditor.svelte';
	import CategoryList from '$lib/keymap/CategoryList.svelte';
	import BindingList from '$lib/keymap/BindingList.svelte';
	import KeymapMenu from '$lib/keymap/KeymapMenu.svelte';
	import { keymap, chosenLayer, heldLayer, selectedKey, view, layoutMap, status, startKeymapPage, openKeymapFile } from '$lib/keymap/store';
	import { LAYERS, layerId, layerTitle, layerCounts, eventLayer, setMetadata } from '$lib/keymap/keymap';
	import { isKnownKey } from '$lib/keymap/keyboards';

	$: layer = $heldLayer ?? $chosenLayer; // the layer shown
	$: counts = layerCounts($keymap);
	$: labels = $view.ownLabels ? $layoutMap : null;

	onMount(() => {
		let stop = () => {};
		startKeymapPage().then((s) => (stop = s));
		pageMenu.set({ title: 'Keyboard layout', component: KeymapMenu });
		return () => {
			stop();
			pageMenu.set(null);
			menuOpen.set(false);
		};
	});

	// keys that change the layer while held, not keys to select
	const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'AltGraph']);

	async function select(code: string): Promise<void> {
		selectedKey.set(code);
		await tick();
		// the shown layer's field takes the typing
		document.querySelector<HTMLInputElement>('.key-editor tr.shown input')?.focus();
	}

	function handleKeydown(event: KeyboardEvent): void {
		if ($menuOpen) return;
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
		if (MODIFIER_KEYS.has(event.key)) {
			heldLayer.set(eventLayer(event) || null);
			if (event.key === 'Alt') event.preventDefault(); // Firefox would open its menu bar
			return;
		}
		// Esc opens the menu (click the key to bind it); unknown keys (media, OS keys) aren't drawn
		if (event.code === 'Escape' || !isKnownKey(event.code)) return;
		event.preventDefault(); // Space, Tab, F-keys ... are being mapped, not used
		chosenLayer.set(eventLayer(event));
		heldLayer.set(null);
		select(event.code);
	}

	function handleKeyup(event: KeyboardEvent): void {
		if (MODIFIER_KEYS.has(event.key)) heldLayer.set(eventLayer(event) || null);
	}

	// a layout file dropped on the page opens (asks first when the open one has bindings)
	let dropping = false;
	const carriesFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
	function handleDragOver(event: DragEvent): void {
		if (!carriesFiles(event)) return;
		event.preventDefault();
		dropping = true;
	}
	async function handleDrop(event: DragEvent): Promise<void> {
		if (!carriesFiles(event)) return;
		event.preventDefault();
		dropping = false;
		const file = Array.from(event.dataTransfer!.files).find((f) => f.name.toLowerCase().endsWith('.json'));
		if (!file) return status.set('Drop a keyboard layout file (.json)');
		if (await openKeymapFile(file)) menuOpen.set(false);
	}
</script>

<svelte:head><title>Keyboard layout · imge</title></svelte:head>

<svelte:window
	on:keydown={handleKeydown}
	on:keyup={handleKeyup}
	on:blur={() => heldLayer.set(null)}
	on:dragover={handleDragOver}
	on:dragleave={(e) => !e.relatedTarget && (dropping = false)}
	on:drop={handleDrop}
/>

<main class="keyboard-page">
	<header class="page-header">
		<input
			class="name"
			aria-label="Layout name"
			value={$keymap.metadata.name}
			on:change={(e) => keymap.update((m) => setMetadata(m, { name: e.currentTarget.value.trim() || m.metadata.name }))}
			on:keydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
		/>
		<span class="hint">Click or press a key to bind it · hold Shift / Ctrl / Alt to see their layer · <kbd>Esc</kbd> menu</span>
	</header>

	<nav class="layers" aria-label="Modifier layers">
		{#each LAYERS as mods (layerId(mods))}
			{@const id = layerId(mods)}
			<button class="layer" class:shown={id === layer} class:held={id === $heldLayer} on:click={() => chosenLayer.set(id)}>
				{layerTitle(id)}
				{#if counts[id]}<span class="count">{counts[id]}</span>{/if}
			</button>
		{/each}
	</nav>

	<KeyboardView map={$keymap} {layer} selected={$selectedKey} numpad={$view.numpad} {labels} onSelect={select} />

	<div class="panels">
		<section class="panel">
			{#if $selectedKey}
				<KeyEditor code={$selectedKey} {layer} {labels} />
			{:else}
				<p class="hint">No key selected: click a key above, or press it on your keyboard (with Shift, Ctrl, Alt for those layers).</p>
			{/if}
		</section>
		<section class="panel">
			<CategoryList />
		</section>
	</div>

	<section class="panel">
		<BindingList {labels} />
	</section>

	{#if $status}<p class="status">{$status}</p>{/if}
</main>

{#if dropping}
	<div class="drop-overlay"><span>Drop a keyboard layout (.json) to open it</span></div>
{/if}

<style>
	.keyboard-page {
		box-sizing: border-box;
		max-width: 1500px;
		margin: 0 auto;
		padding: 3.2em 1.5em 3em 4em; /* below the top links, clear of the left icons */
		display: flex;
		flex-direction: column;
		gap: 1em;
		text-align: left;
	}

	.page-header {
		display: flex;
		align-items: baseline;
		gap: 1em;
		flex-wrap: wrap;
	}

	.name {
		font: inherit;
		font-size: 1.4em;
		font-weight: 600;
		color: var(--col);
		background: none;
		border: none;
		border-bottom: 1px solid transparent;
		padding: 0;
		min-width: 10em;
	}

	.name:hover,
	.name:focus {
		outline: none;
		border-bottom-color: color-mix(in srgb, var(--col) 30%, transparent);
	}

	.hint,
	.status {
		font-size: 0.8em;
		opacity: 0.6;
		margin: 0;
	}

	.status {
		opacity: 0.85;
	}

	.layers {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35em;
	}

	/* buttons are reset globally (settings_overlay.css), so the chip look is set here */
	.layer {
		font: inherit;
		font-size: 0.82em;
		color: var(--col);
		background: none;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 999px;
		padding: 0.15em 0.75em;
		cursor: pointer;
	}

	.layer:hover {
		border-color: var(--col-selected);
	}

	.layer.shown {
		border-color: var(--col-selected);
		background: color-mix(in srgb, var(--col-selected) 18%, transparent);
	}

	.layer.held {
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--col-selected) 40%, transparent);
	}

	.count {
		margin-left: 0.35em;
		opacity: 0.6;
		font-size: 0.9em;
	}

	.panels {
		display: grid;
		grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		gap: 1em;
	}

	@media (max-width: 800px) {
		.panels {
			grid-template-columns: minmax(0, 1fr);
		}

		.keyboard-page {
			padding: 3.2em 0.8em 3em 3.2em;
		}
	}

	.panel {
		padding: 0.8em 1em;
		border: 1px solid color-mix(in srgb, var(--col) 14%, transparent);
		border-radius: 6px;
		background: color-mix(in srgb, var(--col) 3%, transparent);
	}

	.drop-overlay {
		position: fixed;
		inset: 0;
		z-index: 400;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		background: color-mix(in srgb, var(--col-selected) 10%, transparent);
		border: 3px dashed var(--col-selected);
	}

	.drop-overlay span {
		padding: 0.6em 1.2em;
		border-radius: 6px;
		background: var(--bg);
		color: var(--col);
	}
</style>
