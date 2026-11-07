<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-06
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The selected key in every layer at once: one row per modifier combination (the key alone,
	// Shift, Ctrl, Alt, Ctrl+Shift ...) with its key caps, what it does (typing saves when the
	// field is left or Enter is pressed; an empty field removes the binding) and its category.
	// The shown layer's row is highlighted; clicking a row's keys shows that layer.
	import { keymap, chosenLayer } from './store';
	import { LAYERS, layerId, layerTitle, bindingOf, setBinding, removeBinding } from './keymap';
	import { keyLabel } from './keyboards';

	export let code: string;
	export let layer: string; // the layer shown
	export let labels: Map<string, string> | null = null;

	$: locale = typeof navigator === 'undefined' ? undefined : navigator.language;
	$: label = keyLabel(code, labels, locale);
	$: rows = LAYERS.map((mods) => {
		const id = layerId(mods);
		return { id, caps: [...mods.map((m) => layerTitle(m)), label], binding: bindingOf($keymap, code, id) };
	});

	function setAction(id: string, event: Event): void {
		const action = (event.currentTarget as HTMLInputElement).value;
		keymap.update((m) => setBinding(m, code, id, { action }));
	}

	function setCategory(id: string, event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		keymap.update((m) => setBinding(m, code, id, { category: value || null }));
	}

	function key(event: KeyboardEvent): void {
		if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur();
	}
</script>

<div class="key-editor">
	<h3>
		<kbd>{label}</kbd>
		<span class="faint">{code}</span>
	</h3>
	<table>
		<tbody>
			{#each rows as row (row.id)}
				<tr class:shown={row.id === layer}>
					<td class="caps">
						<button class="caps-button" title="Show the {layerTitle(row.id)} layer" on:click={() => chosenLayer.set(row.id)}>
							{#each row.caps as cap, i}{#if i > 0}<span class="plus">+</span>{/if}<kbd>{cap}</kbd>{/each}
						</button>
					</td>
					<td class="action">
						<input
							class="field"
							placeholder="what it does"
							aria-label="{layerTitle(row.id)} + {label}: what it does"
							value={row.binding?.action ?? ''}
							on:change={(e) => setAction(row.id, e)}
							on:keydown={key}
						/>
					</td>
					<td class="category">
						<select
							class="field"
							aria-label="{layerTitle(row.id)} + {label}: category"
							value={row.binding?.category ?? ''}
							disabled={!row.binding}
							on:change={(e) => setCategory(row.id, e)}
						>
							<option value="">no category</option>
							{#each $keymap.data.categories as category (category.id)}<option value={category.id}>{category.name}</option>{/each}
						</select>
					</td>
					<td>
						{#if row.binding}
							<button class="remove" title="Remove" on:click={() => keymap.update((m) => removeBinding(m, code, row.id))}>×</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	h3 {
		display: flex;
		align-items: baseline;
		gap: 0.6em;
		margin: 0 0 0.5em;
		font-size: 1em;
	}

	.faint {
		opacity: 0.55;
		font-size: 0.8em;
		font-weight: normal;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85em;
	}

	td {
		padding: 0.15em 0.3em;
		vertical-align: middle;
	}

	tr.shown {
		background: color-mix(in srgb, var(--col-selected) 12%, transparent);
	}

	.caps {
		white-space: nowrap;
		width: 1%;
	}

	.caps-button {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
	}

	.plus {
		margin: 0 0.15em;
		opacity: 0.6;
	}

	.action {
		width: 60%;
	}

	.field {
		width: 100%;
		box-sizing: border-box;
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

	select.field:disabled {
		opacity: 0.4;
	}

	.remove {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		cursor: pointer;
		opacity: 0.6;
		padding: 0 0.3em;
	}

	.remove:hover {
		opacity: 1;
		color: var(--col-selected);
	}
</style>
