<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Colour picker in the style of htmlcolorcodes.com, drawn with CSS gradients only:
	// - a square: saturation from left (grey) to right (full), brightness from bottom (black)
	//   to top, in the current hue; drag the round handle, or arrow keys when focused
	// - a hue bar (the rainbow) under it; drag, or arrow keys
	// - tints and shades of the current colour (toward white / black), and the preset colours
	//   ($lib/graph/color.ts); a click picks one
	// While dragging, onInput reports each colour (so the canvas can follow live); onStart /
	// onEnd frame the drag (the caller makes it one undo step). A click on a chip or a key
	// press is onStart + onInput + onEnd at once.
	// The picker keeps its own hue and saturation, so they don't jump while the colour is
	// black or grey (where hex can't carry them).
	import { hexToHsv, hsvToHex, tintsAndShades, NODE_COLOR_PRESETS, type Hsv } from '$lib/graph/color';

	export let value: string | null; // "#rrggbb", or null (shown as the first preset's hue)
	export let onInput: (hex: string) => void;
	export let onStart: () => void = () => {};
	export let onEnd: () => void = () => {};

	const KEY_STEP = 0.02; // saturation / brightness per arrow key press (Shift: 5x)
	const HUE_KEY_STEP = 3; // degrees per arrow key press on the hue bar (Shift: 5x)

	let hsv: Hsv = hexToHsv(value ?? NODE_COLOR_PRESETS[0].color);
	let emitted: string | null = value; // last colour this picker reported
	// a new value from outside (typed hex, undo, another node): take its HSV
	$: if (value && value !== emitted) {
		hsv = hexToHsv(value);
		emitted = value;
	}
	$: current = hsvToHex(hsv);
	$: hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });
	$: row = tintsAndShades(current);

	function report(next: Hsv): void {
		hsv = next;
		emitted = hsvToHex(next);
		onInput(emitted);
	}

	// pointer drags on the square and the hue bar: position -> HSV, captured so a drag keeps
	// working outside the element
	const clamp = (v: number) => Math.min(1, Math.max(0, v));
	function fromSquare(event: PointerEvent, el: HTMLElement): void {
		const r = el.getBoundingClientRect();
		report({ h: hsv.h, s: clamp((event.clientX - r.left) / r.width), v: clamp(1 - (event.clientY - r.top) / r.height) });
	}
	function fromHue(event: PointerEvent, el: HTMLElement): void {
		const r = el.getBoundingClientRect();
		report({ ...hsv, h: Math.min(359.9, clamp((event.clientX - r.left) / r.width) * 360) });
	}

	function drag(read: (event: PointerEvent, el: HTMLElement) => void) {
		return (event: PointerEvent) => {
			const el = event.currentTarget as HTMLElement;
			el.setPointerCapture(event.pointerId);
			el.focus();
			onStart();
			read(event, el);
			const move = (e: PointerEvent) => read(e, el);
			const up = () => {
				el.removeEventListener('pointermove', move);
				el.removeEventListener('pointerup', up);
				el.removeEventListener('pointercancel', up);
				onEnd();
			};
			el.addEventListener('pointermove', move);
			el.addEventListener('pointerup', up);
			el.addEventListener('pointercancel', up);
		};
	}

	// a whole change at once (key press, chip click): one undo step
	function once(next: Hsv): void {
		onStart();
		report(next);
		onEnd();
	}

	function squareKey(event: KeyboardEvent): void {
		const step = KEY_STEP * (event.shiftKey ? 5 : 1);
		const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
		const move = moves[event.key];
		if (!move) return;
		event.preventDefault();
		once({ h: hsv.h, s: clamp(hsv.s + move[0]), v: clamp(hsv.v + move[1]) });
	}

	function hueKey(event: KeyboardEvent): void {
		const step = HUE_KEY_STEP * (event.shiftKey ? 5 : 1);
		const delta = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[event.key];
		if (delta === undefined) return;
		event.preventDefault();
		once({ ...hsv, h: (hsv.h + delta + 360) % 360 });
	}

	const pick = (hex: string) => once(hexToHsv(hex));
</script>

<div class="color-picker" style="--hue-col: {hueColor}; --current: {current};">
	<div
		class="square"
		role="slider"
		tabindex="0"
		aria-label="Saturation (left / right) and brightness (up / down)"
		aria-valuetext="saturation {Math.round(hsv.s * 100)} %, brightness {Math.round(hsv.v * 100)} %"
		aria-valuenow={Math.round(hsv.v * 100)}
		on:pointerdown={drag(fromSquare)}
		on:keydown={squareKey}
	>
		<span class="handle" style="left: {hsv.s * 100}%; top: {(1 - hsv.v) * 100}%;"></span>
	</div>

	<div
		class="hue"
		role="slider"
		tabindex="0"
		aria-label="Hue"
		aria-valuemin="0"
		aria-valuemax="360"
		aria-valuenow={Math.round(hsv.h)}
		on:pointerdown={drag(fromHue)}
		on:keydown={hueKey}
	>
		<span class="hue-handle" style="left: {(hsv.h / 360) * 100}%;"></span>
	</div>

	<div class="chips" aria-label="Tints and shades">
		{#each row as hex, i}
			<button class="chip" class:current={i === 3} style="background: {hex};" title={hex} aria-label="Tint or shade {hex}" on:click={() => pick(hex)}></button>
		{/each}
	</div>
	<div class="chips presets" aria-label="Preset colours">
		{#each NODE_COLOR_PRESETS as preset (preset.color)}
			<button class="chip" class:current={preset.color === value} style="background: {preset.color};" title="{preset.name} {preset.color}" aria-label="Preset {preset.name}" on:click={() => pick(preset.color)}></button>
		{/each}
	</div>
</div>

<style>
	.color-picker {
		display: flex;
		flex-direction: column;
		gap: 0.5em;
		margin-top: 0.5em;
	}

	/* saturation left -> right (white -> hue), brightness bottom -> top (black over it) */
	.square {
		position: relative;
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: 4px;
		background:
			linear-gradient(to top, #000, transparent),
			linear-gradient(to right, #fff, var(--hue-col));
		cursor: crosshair;
		touch-action: none;
		outline: none;
	}

	.handle,
	.hue-handle {
		position: absolute;
		pointer-events: none;
		box-sizing: border-box;
		border: 2px solid #fff;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4);
	}

	.handle {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--current);
		transform: translate(-50%, -50%);
	}

	.hue {
		position: relative;
		height: 12px;
		border-radius: 6px;
		background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
		cursor: ew-resize;
		touch-action: none;
		outline: none;
	}

	.hue-handle {
		top: 50%;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--hue-col);
		transform: translate(-50%, -50%);
	}

	/* keyboard focus: a ring in the selection colour */
	.square:focus-visible,
	.hue:focus-visible {
		box-shadow: 0 0 0 2px var(--col-selected);
	}

	.chips {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 3px;
	}

	.presets {
		grid-template-columns: repeat(5, 1fr);
	}

	.chip {
		height: 1.3em;
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--col) 20%, transparent);
		border-radius: 3px;
		cursor: pointer;
	}

	.chip:hover {
		transform: scale(1.12);
	}

	.chip.current {
		outline: 2px solid var(--col);
		outline-offset: 1px;
	}
</style>
