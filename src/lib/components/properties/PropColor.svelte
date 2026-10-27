<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Colour field of the Properties panel: a preview swatch drawn like a coloured node
	// (border in the colour, dim fill), a hex text field and a reset button. A click on the
	// swatch opens / closes the colour picker under the row (ColorPicker: square, hue bar,
	// tints and shades, presets); Esc inside it closes it.
	// - Typed hex: the swatch follows right away; the graph changes when the edit is done
	//   (Enter or leaving the field), so one edit is one undo step.
	// - Picker: the node follows live while dragging; holdHistory / releaseHistory make the
	//   whole drag one undo step.
	// - Accepts #abc / abc / #aabbcc / aabbcc ($lib/graph/color.ts); while the text isn't a hex
	//   colour the field is marked red, and leaving it puts the old value back. Empty = the
	//   theme's default look (null). Esc cancels the edit (and keeps the Esc menu closed).
	import { parseHexColor, dimColor } from '$lib/graph/color';
	import { holdHistory, releaseHistory } from '$lib/graph/history';
	import ColorPicker from './ColorPicker.svelte';

	export let value: string | null; // "#rrggbb" or null (default look)
	export let mixed = false; // several nodes with different colours: empty field, "mixed", reset all
	export let label = 'Colour';
	export let onCommit: (color: string | null) => void;

	let draft = value ?? '';
	let focused = false; // typing in the hex field
	let cancelled = false;
	let open = false; // the colour picker under the row
	$: if (!focused) draft = value ?? '';

	$: placeholder = mixed ? 'mixed' : 'default'; // shown while the field is empty
	$: empty = draft.trim() === '';
	$: preview = empty ? null : parseHexColor(draft);
	$: invalid = !empty && !preview;

	// sends the draft when it is a colour (or empty) and differs from the stored value; read
	// from the draft itself, not from the reactive `preview`
	function commit(): void {
		if (cancelled) return;
		const text = draft.trim();
		const color = text === '' ? null : parseHexColor(text);
		if (text !== '' && !color) return; // not a colour: the field goes back to the stored value
		if (color !== value) onCommit(color);
	}

	function handleKey(event: KeyboardEvent): void {
		const field = event.target as HTMLInputElement;
		if (event.key === 'Enter') field.blur();
		else if (event.key === 'Escape') {
			event.preventDefault(); // only cancels the edit; the Esc menu stays closed
			cancelled = true;
			field.blur();
		}
	}

	function handleBlur(): void {
		commit();
		focused = false;
		cancelled = false;
		draft = value ?? '';
	}

	// Esc while the picker has the keyboard closes it (and keeps the Esc menu closed)
	function pickerKey(event: KeyboardEvent): void {
		if (event.key !== 'Escape' || !open) return;
		event.preventDefault();
		open = false;
	}
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="prop-color-field" on:keydown={pickerKey}>
<div class="prop-color">
	<button
		class="swatch"
		class:empty={!preview}
		class:open
		title={open ? 'Close the colour picker' : 'Open the colour picker'}
		aria-label="{label}: picker"
		aria-expanded={open}
		style={preview ? `--swatch-col: ${preview}; --swatch-fill: ${dimColor(preview)};` : ''}
		on:click={() => (open = !open)}
	></button>
	<input
		class="prop-input hex"
		class:invalid
		type="text"
		spellcheck="false"
		{placeholder}
		aria-label="{label}: hex"
		aria-invalid={invalid}
		value={draft}
		on:input={(event) => (draft = event.currentTarget.value)}
		on:focus={() => (focused = true)}
		on:keydown={handleKey}
		on:blur={handleBlur}
	/>
	{#if value !== null || mixed}
		<button class="reset" title="Back to the default look" aria-label="{label}: reset" on:click={() => onCommit(null)}>×</button>
	{/if}
</div>
{#if open}
	<ColorPicker {value} onStart={holdHistory} onInput={(hex) => onCommit(hex)} onEnd={releaseHistory} />
{/if}
</div>

<style>
	.prop-color {
		display: flex;
		align-items: center;
		gap: 0.4em;
		min-width: 0;
	}

	/* drawn like a coloured node: border in the colour, fill a dim version of it */
	.swatch {
		position: relative;
		flex: none;
		padding: 0;
		width: 1.9em;
		height: 1.5em;
		border-radius: 0.35em;
		border: 1.5px solid var(--swatch-col);
		background: var(--swatch-fill);
		cursor: pointer;
	}

	/* no colour (default, or text that isn't a colour yet): the default node look, crossed */
	.swatch.empty {
		border-color: var(--col-border);
		background: linear-gradient(
			to top right,
			transparent calc(50% - 0.5px),
			color-mix(in srgb, var(--col) 45%, transparent) 50%,
			transparent calc(50% + 0.5px)
		);
	}

	/* while the picker is open, the swatch is ringed like a pressed button */
	.swatch.open {
		box-shadow: 0 0 0 2px var(--col-selected);
	}

	.hex {
		flex: 1;
		font-family: monospace;
	}

	/* more specific than the panel's shared focus border, so red shows while typing too */
	.prop-color .hex.invalid,
	.prop-color .hex.invalid:focus {
		border-color: #d9534f;
	}

	.reset {
		flex: none;
		padding: 0 0.2em;
		font: inherit;
		font-size: 1.1em;
		line-height: 1;
		color: inherit;
		background: none;
		border: none;
		opacity: 0.6;
		cursor: pointer;
	}

	.reset:hover {
		opacity: 1;
	}
</style>
