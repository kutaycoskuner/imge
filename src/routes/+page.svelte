<script lang="ts">
	import { browser } from '$app/environment';
	import katex from 'katex';

	let i = 2;
	let j = 3;
	let m = 2;
	let n = 3;

	$: valid = i === m && j === n;

	const symbolic = `A_{i\\times j} + B_{m\\times n} = C`;

	$: numeric = browser
		? katex.renderToString(`A_{${i}\\times${j}} + B_{${m}\\times${n}} = C`, {
				displayMode: true,
				throwOnError: false
			})
		: '';

	// MATRICES DATA STATE
	let A: number[][] = [];
	let B: number[][] = [];

	$: if (browser) {
		A = createMatrix(i, j, A);
		B = createMatrix(m, n, B);
	}

	// REACTIVE GENERATION FOR CALCULATED RESULT MATRIX C
	$: C = valid ? calculateSum(A, B) : [];

	function createMatrix(rows: number, cols: number, prev: number[][]) {
		return Array.from({ length: rows }, (_, r) =>
			Array.from({ length: cols }, (_, c) => prev?.[r]?.[c] ?? 0)
		);
	}

	function calculateSum(matrixA: number[][], matrixB: number[][]): number[][] {
		return matrixA.map((row, r) => row.map((val, c) => val + (matrixB?.[r]?.[c] ?? 0)));
	}

	// INLINE EDITING COORDINATE POINTERS
	let editA: { r: number; c: number } | null = null;
	let editB: { r: number; c: number } | null = null;
</script>

<svelte:head>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
</svelte:head>

<div class="mobile-notice">
    <div class="notice-card">
        <h2>Screen Size Not Supported</h2>
        <p>We're sorry, but this matrix calculator is not optimized for mobile devices. Please view this page on a desktop or a larger screen.</p>
    </div>
</div>

<div class="app-container main-content">
	<div class="math-box">
		<div class="row row-2">
			{@html katex.renderToString(symbolic, {
				displayMode: true,
				throwOnError: false
			})}
		</div>

		<div class="row row-15">
			{@html numeric}
		</div>

		<div class="row row-1 inputs">
			<div class="group group-a">
				<label>i (A rows)</label>
				<input type="number" bind:value={i} min="1" />
			</div>

			<div class="group group-a">
				<label>j (A cols)</label>
				<input type="number" bind:value={j} min="1" />
			</div>

			<div class="group group-b">
				<label>m (B rows)</label>
				<input type="number" bind:value={m} min="1" />
			</div>

			<div class="group group-b">
				<label>n (B cols)</label>
				<input type="number" bind:value={n} min="1" />
			</div>
		</div>

		{#if !valid}
			<div class="row row-1 warning">
				⚠ matrix addition requires dimensions to match exactly (i = m and j = n)
			</div>
		{/if}
	</div>

	{#if valid}
		<div class="matrix-box">
			<div class="equation-row">
				<div class="matrix-container color-system-a">
					<div class="matrix-title">Matrix A ({i}×{j})</div>
					<div class="matrix">
						<div class="matrix-inner">
							{#each A as row, r}
								<div class="matrix-row">
									{#each row as val, c}
										{#if editA?.r === r && editA?.c === c}
											<input
												class="cell-input"
												type="number"
												bind:value={A[r][c]}
												on:blur={() => (editA = null)}
												on:keydown={(e) => e.key === 'Enter' && (editA = null)}
												autofocus
											/>
										{:else}
											<span class="cell" on:click={() => (editA = { r, c })}>
												{val}
											</span>
										{/if}
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="operator">+</div>

				<div class="matrix-container color-system-b">
					<div class="matrix-title">Matrix B ({m}×{n})</div>
					<div class="matrix">
						<div class="matrix-inner">
							{#each B as row, r}
								<div class="matrix-row">
									{#each row as val, c}
										{#if editB?.r === r && editB?.c === c}
											<input
												class="cell-input"
												type="number"
												bind:value={B[r][c]}
												on:blur={() => (editB = null)}
												on:keydown={(e) => e.key === 'Enter' && (editB = null)}
												autofocus
											/>
										{:else}
											<span class="cell" on:click={() => (editB = { r, c })}>
												{val}
											</span>
										{/if}
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="operator">=</div>

				<div class="matrix-container color-system-c">
					<div class="matrix-title">Result Matrix C ({i}×{j})</div>
					<div class="matrix">
						<div class="matrix-inner">
							{#each C as row}
								<div class="matrix-row">
									{#each row as val}
										<span class="cell result-cell">
											{val}
										</span>
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	/* =========================================================================
   GLOBAL VIEWPORT CENTERING WRAPPER
========================================================================= */
	.app-container {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		width: 100%;
		box-sizing: border-box;
		padding: 2rem;
		gap: 2rem; /* Creates structured space between Box 1 and Box 2 */
	}

	/* =========================================================================
   BOX I: CONFIGURATOR STYLING
========================================================================= */
	.math-box {
		width: fit-content;
		padding: 0.8rem 2rem;
		border-radius: var(--border-radius, 8px);
		border: 1px solid var(--col-border, #ccc);
		background: var(--bg, #fff);
		color: var(--col, #333);
		font-family: var(--main-font, sans-serif);
		backdrop-filter: var(--main-blur, none);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
	}

	.row {
		display: flex;
		justify-content: center;
		align-items: center;
		margin: 0.6rem 0;
	}

	.row-2 {
		font-size: 2rem;
	}
	.row-15 {
		font-size: 1.5rem;
	}
	.row-1 {
		font-size: 1rem;
	}

	.row-2 :global(.katex),
	.row-15 :global(.katex) {
		font-style: italic;
	}

	.inputs {
		gap: 1rem;
	}

	.group {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	label {
		font-size: 0.75rem;
		opacity: 0.7;
		margin-bottom: 0.2rem;
	}

	input[type='number'] {
		width: 3.5rem;
		padding: 0.25rem;
		text-align: center;
		border: 1px solid var(--col-border, #ccc);
		border-radius: var(--border-radius, 4px);
		background: transparent;
		color: var(--col, #333);
		appearance: textfield;
		-moz-appearance: textfield;
	}

	input[type='number']::-webkit-outer-spin-button,
	input[type='number']::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	.warning {
		color: #ff3e00;
		font-weight: 500;
	}

	/* =========================================================================
   BOX II: INTERACTIVE MATH GRID LAYOUT
========================================================================= */
	.matrix-box {
		width: fit-content;
		padding: 1.5rem 2rem;
		border: 1px solid var(--col-border, #ccc);
		border-radius: var(--border-radius, 8px);
		background: var(--bg, #fff);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
	}

	.equation-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}

	.matrix-container {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.matrix-title {
		font-size: 0.85rem;
		margin-bottom: 0.6rem;
		font-weight: 500;
		font-family: var(--main-font, sans-serif);
	}

	/* CUSTOM HIGH-FIDELITY SCALABLE CSS SQUARE BRACKETS */
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
		border: 2px solid currentColor; /* Automatically references the scoped system color */
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

	.operator {
		font-size: 2rem;
		font-weight: 300;
		opacity: 0.6;
		user-select: none;
		padding-top: 1.5rem; /* Offsets bracket position to align perfectly with content row */
	}

	/* SYSTEM CELLS */
	.cell {
		min-width: 2.5rem;
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-family: var(--main-font, sans-serif);
		font-size: 1.1rem;
		cursor: pointer;
		border: 1px solid transparent;
		border-radius: var(--border-radius, 4px);
		transition:
			background 0.12s,
			border-color 0.12s,
			color 0.12s;
	}

	.cell-input {
		width: 2.5rem;
		height: 2rem;
		text-align: center;
		background: var(--bg, #fff);
		color: var(--col, #333);
		font-family: var(--main-font, sans-serif);
		font-size: 1.1rem;
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

	.result-cell {
		cursor: default;
		font-weight: 600;
	}

	/* =========================================================================
   COLOR DESIGN CHANNELS
========================================================================= */

	/* Channel A: Matrix A (Dynamic Ocean Blue) */
	.color-system-a {
		color: #0076ff;
	}
	.color-system-a .cell:hover {
		background: rgba(0, 118, 255, 0.1);
		border-color: rgba(0, 118, 255, 0.3);
	}
	.color-system-a .cell-input {
		border: 2px solid #0076ff;
	}
	:global(.app-container) .group-a input[type='number']:focus {
		border-color: #0076ff;
		outline: none;
	}

	/* Channel B: Matrix B (Deep Royalty Purple) */
	.color-system-b {
		color: #7928ca;
	}
	.color-system-b .cell:hover {
		background: rgba(121, 40, 202, 0.1);
		border-color: rgba(121, 40, 202, 0.3);
	}
	.color-system-b .cell-input {
		border: 2px solid #7928ca;
	}
	:global(.app-container) .group-b input[type='number']:focus {
		border-color: #7928ca;
		outline: none;
	}

	/* Channel C: Result Matrix C (Vibrant Emerald Green) */
	.color-system-c {
		color: #00a36c;
	}

	/* =========================================================================
    MOBILE NOTICE VIEWPORT RULES (🟢 ALL NEW)
    ========================================================================= */
	.mobile-notice {
		display: none; /* Hidden by default on desktop screens */
		box-sizing: border-box;
		padding: 2rem;
		width: 100%;
		min-height: 100vh;
		background: var(--bg);
		font-family: var(--main-font, sans-serif);
	}

	.notice-card {
		background: var(--bg);
		padding: 2.5rem 1.5rem;
		border-radius: 12px;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
		border: 1px solid var(--col-border);
		text-align: center;
		max-width: 400px;
		margin: auto;
	}


	.notice-card h2 {
		color: var(--col);
		margin: 0 0 0.75rem 0;
		font-size: 1.4rem;
		font-weight: 600;
	}

	.notice-card p {
		color: var(--col-2);
		font-size: 0.95rem;
		line-height: 1.5;
		margin: 0;
	}

	/* ⚡ The Breakpoint: Triggers when the screen is 768px wide or smaller */
	@media (max-width: 768px) {
		.mobile-notice {
			display: flex; /* Shows the notice block */
			align-items: center;
			justify-content: center;
		}
		.main-content {
			display: none !important; /* Completely hides the calculator grid */
		}
	}
</style>
