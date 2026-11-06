<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-06
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The keymap's categories: name, how many bindings use it, and its colour with the graph
	// editor's colour field (swatch drawn like a coloured key, hex, the picker under it: square,
	// hue bar, tints and shades, presets; keys follow live while dragging); add one, remove one
	// (its bindings stay, without a category).
	import { keymap } from './store';
	import { addCategory, updateCategory, removeCategory } from './keymap';
	import PropColor from '$lib/components/properties/PropColor.svelte';

	const nothing = () => {}; // no undo grouping on this page (PropColor's default is the graph's)

	$: counts = new Map($keymap.data.categories.map((c) => [c.id, $keymap.data.bindings.filter((b) => b.category === c.id).length]));

	function remove(id: string, name: string): void {
		const used = counts.get(id) ?? 0;
		if (used && !confirm(`Remove the category "${name}"? Its ${used} binding${used > 1 ? 's' : ''} stay, without a category.`)) return;
		keymap.update((m) => removeCategory(m, id));
	}
</script>

<div class="categories">
	<h3>Categories</h3>
	<ul>
		{#each $keymap.data.categories as category (category.id)}
			<li>
				<div class="line">
					<input
						class="field"
						aria-label="Category name"
						value={category.name}
						on:change={(e) => keymap.update((m) => updateCategory(m, category.id, { name: e.currentTarget.value.trim() || category.name }))}
						on:keydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
					/>
					<span class="count" title="bindings in this category">{counts.get(category.id) ?? 0}</span>
					<button class="remove" title="Remove the category" on:click={() => remove(category.id, category.name)}>×</button>
				</div>
				<PropColor
					label="{category.name}: colour"
					value={category.color}
					required
					onPickStart={nothing}
					onPickEnd={nothing}
					onCommit={(color) => color && keymap.update((m) => updateCategory(m, category.id, { color }))}
				/>
			</li>
		{/each}
	</ul>
	<button class="add" on:click={() => keymap.update((m) => addCategory(m, '').map)}>+ Add category</button>
</div>

<style>
	h3 {
		margin: 0 0 0.5em;
		font-size: 1em;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7em;
		font-size: 0.85em;
	}

	/* one category: its name line, its colour field under it (the picker opens below that) */
	li {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
	}

	.line {
		display: flex;
		align-items: center;
		gap: 0.4em;
	}

	.field {
		flex: 1;
		min-width: 0;
		font: inherit;
		color: var(--col);
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 22%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.4em;
	}

	.field:focus {
		outline: none;
		border-color: var(--col-selected);
	}

	.count {
		min-width: 1.6em;
		text-align: right;
		opacity: 0.6;
	}

	.remove,
	.add {
		font: inherit;
		color: inherit;
		background: none;
		cursor: pointer;
	}

	.remove {
		border: none;
		opacity: 0.6;
	}

	.remove:hover {
		opacity: 1;
		color: var(--col-selected);
	}

	.add {
		margin-top: 0.5em;
		font-size: 0.85em;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.6em;
	}

	.add:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}
</style>
