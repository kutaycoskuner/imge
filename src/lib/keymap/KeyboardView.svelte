<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-06
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The keyboard of the layout page: every key of the physical keyboard (keyboards.ts) at its
	// place, as wide as the page allows (KEY_MAX px per key unit at most). A key bound in the
	// shown layer is coloured by its binding's category and shows what it does; small letters in
	// its corner say which other modifier layers use it (C = Ctrl, S = Shift, A = Alt, CS = Ctrl+Shift
	// ...). The modifier keys of the shown layer look pressed. A click selects a key
	// (`onSelect`); the selected key is outlined.
	import { keyboardKeys, keyboardSize, keyLabel } from './keyboards';
	import { layerBindings, keyLayers, layerTitle, type Keymap } from './keymap';

	export let map: Keymap;
	export let layer: string; // the layer shown
	export let selected: string | null = null;
	export let numpad = true;
	export let labels: Map<string, string> | null = null; // the user's own layout, when known
	export let onSelect: (code: string) => void;

	const KEY_MAX = 64; // px per key unit at most
	const GAP = 0.08; // key units between keys

	$: keys = keyboardKeys(map.metadata.physical, numpad);
	$: size = keyboardSize(keys);
	let width = 0;
	$: unit = Math.min(KEY_MAX, width / size.w || 0);
	$: bound = layerBindings(map, layer);
	$: colors = new Map(map.data.categories.map((c) => [c.id, c.color]));
	$: locale = typeof navigator === 'undefined' ? undefined : navigator.language;

	// the modifier keys of the shown layer look pressed
	const MODIFIER_KEYS: Record<string, string[]> = {
		shift: ['ShiftLeft', 'ShiftRight'],
		ctrl: ['ControlLeft', 'ControlRight'],
		alt: ['AltLeft', 'AltRight']
	};
	$: pressed = new Set(layer.split('+').flatMap((m) => MODIFIER_KEYS[m] ?? []));

	// other modifier layers that use a key, short: "C", "S", "A", "CS" ... (the key on its own
	// isn't marked: it is the first layer, and almost every key would carry a mark)
	const short = (id: string) => id.split('+').map((m) => m[0].toUpperCase()).join('');
	const others = (code: string) => keyLayers(map, code).filter((id) => id && id !== layer);
</script>

<div class="keyboard" bind:clientWidth={width} style="height: {size.h * unit}px; --u: {unit}px;">
	{#each keys as key (key.code)}
		{@const binding = bound.get(key.code)}
		{@const color = binding?.category ? colors.get(binding.category) : null}
		{@const more = others(key.code)}
		<button
			class="key"
			class:bound={!!binding}
			class:colored={!!color}
			class:selected={key.code === selected}
			class:pressed={pressed.has(key.code)}
			style="left: {key.x * unit}px; top: {key.y * unit}px; width: {(key.w - GAP) * unit}px; height: {(key.h - GAP) * unit}px;{color ? ` --key-col: ${color};` : ''}"
			title="{keyLabel(key.code, labels, locale)} ({key.code}){binding ? `: ${binding.action}` : ''}{more.length ? ` · also ${more.map(layerTitle).join(', ')}` : ''}"
			data-code={key.code}
			on:click={() => onSelect(key.code)}
		>
			<span class="key-label">{keyLabel(key.code, labels, locale)}</span>
			{#if more.length}<span class="key-layers">{more.slice(0, 3).map(short).join(' ')}{more.length > 3 ? '…' : ''}</span>{/if}
			{#if binding}<span class="key-action">{binding.action}</span>{/if}
		</button>
	{/each}
</div>

<style>
	.keyboard {
		position: relative;
		width: 100%;
		max-width: calc(64px * 22.5);
		user-select: none;
	}

	/* buttons are reset globally (settings_overlay.css), so the key look is set here */
	.key {
		position: absolute;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: flex-start;
		padding: calc(var(--u) * 0.06) calc(var(--u) * 0.09);
		box-sizing: border-box;
		overflow: hidden;
		text-align: left;
		font: inherit;
		color: var(--col);
		background: color-mix(in srgb, var(--col) 5%, var(--bg));
		border: 1px solid color-mix(in srgb, var(--col) 22%, transparent);
		border-bottom-width: calc(var(--u) * 0.06 + 1px);
		border-radius: calc(var(--u) * 0.12);
		cursor: pointer;
	}

	.key:hover {
		border-color: color-mix(in srgb, var(--col) 50%, transparent);
	}

	/* bound in the shown layer: without a category a neutral accent, with one its colour */
	.key.bound {
		border-color: color-mix(in srgb, var(--col) 55%, transparent);
		background: color-mix(in srgb, var(--col) 12%, var(--bg));
	}

	.key.colored {
		border-color: var(--key-col);
		background: color-mix(in srgb, var(--key-col) 24%, var(--bg));
	}

	.key.pressed {
		border-bottom-width: 1px;
		transform: translateY(calc(var(--u) * 0.04));
		background: color-mix(in srgb, var(--col-selected) 22%, var(--bg));
		border-color: var(--col-selected);
	}

	.key.selected {
		outline: 2px solid var(--col-selected);
		outline-offset: 1px;
		z-index: 1;
	}

	.key-label {
		font-size: calc(var(--u) * 0.24);
		font-weight: 600;
		line-height: 1.1;
		white-space: nowrap;
	}

	.key-layers {
		position: absolute;
		top: calc(var(--u) * 0.05);
		right: calc(var(--u) * 0.08);
		font-size: calc(var(--u) * 0.15);
		opacity: 0.65;
		letter-spacing: 0.02em;
	}

	.key-action {
		width: 100%;
		font-size: calc(var(--u) * 0.165);
		line-height: 1.15;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
		word-break: break-word;
	}
</style>
