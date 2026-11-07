<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-06
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Every binding of the keymap, all layers, grouped by category (in the keymap's order, then
	// those without one), each as key caps (modifiers + key) and what it does; within a group
	// by key and layer. A search filters by action, key or modifier ("ctrl", "shift w"). A click
	// selects that key and shows its layer.
	import { keymap, selectedKey, chosenLayer } from './store';
	import { LAYERS, layerId, layerTitle, type Binding } from './keymap';
	import { keyLabel, keyboardKeys } from './keyboards';

	export let labels: Map<string, string> | null = null;

	let search = '';
	$: locale = typeof navigator === 'undefined' ? undefined : navigator.language;
	// keys in keyboard order (top-left to bottom-right), then layers in LAYERS order
	const ORDER = new Map(keyboardKeys('iso', true).concat(keyboardKeys('ansi', true)).sort((a, b) => a.y - b.y || a.x - b.x).map((k, i) => [k.code, i]));
	const LAYER_ORDER = LAYERS.map(layerId);
	const sort = (a: Binding, b: Binding) =>
		(ORDER.get(a.key) ?? 999) - (ORDER.get(b.key) ?? 999) || LAYER_ORDER.indexOf(layerId(a.mods)) - LAYER_ORDER.indexOf(layerId(b.mods));
	const caps = (b: Binding) => [...b.mods.map(layerTitle), keyLabel(b.key, labels, locale)];

	$: words = search.toLowerCase().split(/\s+/).filter(Boolean);
	$: matches = (b: Binding) => {
		const text = `${b.action} ${caps(b).join(' ')} ${b.key}`.toLowerCase();
		return words.every((w) => text.includes(w));
	};
	$: groups = [
		...$keymap.data.categories.map((c) => ({ id: c.id, name: c.name, color: c.color as string | null })),
		{ id: null as string | null, name: 'No category', color: null }
	]
		.map((g) => ({ ...g, items: $keymap.data.bindings.filter((b) => b.category === g.id && matches(b)).sort(sort) }))
		.filter((g) => g.items.length);
	$: total = groups.reduce((n, g) => n + g.items.length, 0);

	function pick(b: Binding): void {
		selectedKey.set(b.key);
		chosenLayer.set(layerId(b.mods));
	}
</script>

<div class="binding-list">
	<div class="list-header">
		<h3>All bindings <span class="faint">{total}{words.length ? ` of ${$keymap.data.bindings.length}` : ''}</span></h3>
		<input class="search" type="search" placeholder="search: action, key, modifier" bind:value={search} />
	</div>
	{#if !groups.length}
		<p class="faint">{$keymap.data.bindings.length ? 'Nothing matches the search.' : 'No bindings yet: click a key (or press it) and type what it does.'}</p>
	{/if}
	<div class="groups">
		{#each groups as group (group.id ?? '-')}
			<section class="group" style={group.color ? `--group-col: ${group.color}` : ''}>
				<h4><span class="dot" class:none={!group.color}></span>{group.name} <span class="faint">{group.items.length}</span></h4>
				<ul>
					{#each group.items as b (b.key + '|' + layerId(b.mods))}
						<li>
							<button class="item" on:click={() => pick(b)} title="Show {caps(b).join('+')} on the keyboard">
								<span class="caps">{#each caps(b) as cap, i}{#if i > 0}<span class="plus">+</span>{/if}<kbd>{cap}</kbd>{/each}</span>
								<span class="action">{b.action}</span>
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/each}
	</div>
</div>

<style>
	.list-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1em;
		flex-wrap: wrap;
		margin-bottom: 0.6em;
	}

	h3 {
		margin: 0;
		font-size: 1em;
	}

	.faint {
		opacity: 0.55;
		font-weight: normal;
		font-size: 0.85em;
	}

	.search {
		font: inherit;
		font-size: 0.85em;
		color: var(--col);
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 22%, transparent);
		border-radius: 3px;
		padding: 0.25em 0.5em;
		width: min(20em, 100%);
	}

	/* the groups side by side as far as they fit */
	.groups {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(17em, 1fr));
		gap: 1em 1.5em;
		align-items: start;
	}

	h4 {
		display: flex;
		align-items: center;
		gap: 0.4em;
		margin: 0 0 0.3em;
		font-size: 0.85em;
	}

	.dot {
		width: 0.75em;
		height: 0.75em;
		border-radius: 50%;
		background: var(--group-col);
	}

	.dot.none {
		background: none;
		border: 1px dashed color-mix(in srgb, var(--col) 50%, transparent);
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0 0 0 0.4em;
		border-left: 3px solid var(--group-col, color-mix(in srgb, var(--col) 25%, transparent));
	}

	.item {
		display: flex;
		align-items: baseline;
		gap: 0.6em;
		width: 100%;
		font: inherit;
		font-size: 0.82em;
		color: inherit;
		background: none;
		border: none;
		padding: 0.15em 0.3em;
		text-align: left;
		cursor: pointer;
		border-radius: 3px;
	}

	.item:hover {
		background: color-mix(in srgb, var(--col) 8%, transparent);
	}

	.caps {
		white-space: nowrap;
		flex-shrink: 0;
	}

	.plus {
		margin: 0 0.12em;
		opacity: 0.6;
	}

	.action {
		min-width: 0;
	}
</style>
