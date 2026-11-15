<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-11-13), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-13
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// One matrix of the matrix calculator's expanded view, in square brackets, with a title
	// above it and its colour (tone: a, b, template, c; the colours are in ./tones.ts).
	// Editable: clicking a number turns it into a box (Enter or leaving it ends the edit) and
	// the typed value goes into `values` (bind:values). `text` writes a cell differently (the
	// written-out sums and products), `highlighted` marks the cells of the selected entry,
	// `onpoint` reports the cell under the mouse (null when it leaves) and `onpick` a click,
	// for the cells of C. Used by src/routes/matrix_addition/+page.svelte.
	import type { Matrix } from './matrix';
	import { cellValue, formatNumber } from './matrix';
	import { TONES, type Tone } from './tones';

	export let values: Matrix;
	export let title: string;
	export let tone: Tone;
	export let editable = false;
	export let text: ((r: number, c: number) => string) | null = null;
	export let highlighted: (r: number, c: number) => boolean = () => false;
	export let onpoint: ((cell: { r: number; c: number } | null) => void) | null = null;
	export let onpick: ((cell: { r: number; c: number }) => void) | null = null;

	let editing: { r: number; c: number } | null = null;

	function endEdit(r: number, c: number): void {
		values[r][c] = cellValue(values[r][c]);
		values = values;
		editing = null;
	}
</script>

<div
	class="matrix-container"
	class:result={tone === 'c'}
	style="--tone: {TONES[tone].color}; --tone-bg: {TONES[tone].bg}; --tone-border: {TONES[tone].border}"
>
	<div class="matrix-title">{title}</div>
	<div class="matrix" role="grid" tabindex="-1" on:mouseleave={() => onpoint?.(null)}>
		<div class="matrix-inner">
			{#each values as row, r}
				<div class="matrix-row" role="row">
					{#each row as val, c}
						{#if editable && editing?.r === r && editing?.c === c}
							<!-- svelte-ignore a11y_autofocus -->
							<input
								class="cell-input"
								type="number"
								bind:value={values[r][c]}
								on:blur={() => endEdit(r, c)}
								on:keydown={(e) => e.key === 'Enter' && endEdit(r, c)}
								autofocus
							/>
						{:else}
							<button
								type="button"
								role="gridcell"
								class="cell"
								class:editable
								class:wide={text !== null}
								class:highlighted={highlighted(r, c)}
								on:mouseenter={() => onpoint?.({ r, c })}
								on:click={() => (editable ? (editing = { r, c }) : onpick?.({ r, c }))}
							>
								{text ? text(r, c) : formatNumber(val)}
							</button>
						{/if}
					{/each}
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.matrix-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: var(--tone);
	}

	.matrix-title {
		font-size: 0.85rem;
		margin-bottom: 0.6rem;
		font-weight: 500;
		font-family: var(--main-font, sans-serif);
		white-space: nowrap;
	}

	/* square brackets: the left and right borders, as tall as the rows */
	.matrix {
		display: inline-flex;
		position: relative;
		padding: 0.4rem 0.6rem;
	}
	.matrix::before,
	.matrix::after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		width: 6px;
		border: 2px solid currentColor;
		opacity: 0.85;
	}
	.matrix::before {
		left: 0;
		border-right: none;
		border-radius: 4px 0 0 4px;
	}
	.matrix::after {
		right: 0;
		border-left: none;
		border-radius: 0 4px 4px 0;
	}

	.matrix-inner {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.matrix-row {
		display: flex;
		gap: 0.8rem;
	}

	.cell {
		min-width: 2.5rem;
		height: 2rem;
		padding: 0 0.3rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--main-font, sans-serif);
		font-size: 1.1rem;
		color: inherit;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--border-radius, 4px);
		cursor: default;
		white-space: nowrap;
		transition:
			background 0.12s,
			border-color 0.12s;
	}
	.cell.editable {
		cursor: pointer;
	}
	.cell.editable:hover,
	.cell.highlighted {
		background: var(--tone-bg);
		border-color: var(--tone-border);
	}
	.cell.wide {
		min-width: 4.5rem;
		font-size: 0.95rem;
	}
	.result .cell {
		font-weight: 600;
		cursor: pointer;
	}

	.cell-input {
		width: 2.5rem;
		height: 2rem;
		text-align: center;
		background: var(--bg, #fff);
		color: var(--col, #333);
		font-family: var(--main-font, sans-serif);
		font-size: 1.1rem;
		border: 2px solid var(--tone);
		border-radius: var(--border-radius, 4px);
		outline: none;
		appearance: textfield;
		-moz-appearance: textfield;
	}
	.cell-input::-webkit-outer-spin-button,
	.cell-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
</style>
