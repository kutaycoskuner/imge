<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-11-13), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-13
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Matrix calculator (/matrix_addition): a calculator and a lesson at once. Three panels
	// filling the screen, each a faint 1 px frame with pixelated corners and its title (small,
	// lower case) in a gap of the top line at the left (as the graph editor's group names);
	// thin, faint scrollbars inside:
	//   top, left     i. notation: the formula in math notation with the sizes i, j, m, n to
	//                 type in, and a warning (with a button that fixes the sizes) when A and B
	//                 can't be combined
	//   top, right    ii. description, one block of sections: what the operation does, the
	//                 size rule checked against the typed sizes, the selected entry of C
	//                 written out term by term (hover or click a cell of C; its row and
	//                 column in A and B light up), properties
	//   bottom        iii. calculator, the whole width, on one line: A, B, C written out (C entry
	//                 by entry) and the result C, each in its colour; click a number of A or B
	//                 to change it. The toolbar's >_ button switches to the text view: A
	//                 and B as aligned text to type in ($lib/matrix/ascii.ts; sizes and values
	//                 follow as soon as it reads as two matrices) and the equation as text to copy
	// Toolbar at the bottom left, placed and styled exactly as the graph editor's (.access-*
	// in static/styles/imge.css): + × d for the operation (determinant comes later), >_ for
	// the text view; hover hints (full names) in the hint line (AssistanceMsg).
	// Math: $lib/matrix/matrix.ts, texts per operation: $lib/matrix/operations.ts, colours:
	// $lib/matrix/tones.ts, one matrix: $lib/matrix/MatrixGrid.svelte.
	// Details: docs/matrix-calculator.md
	import katex from 'katex';
	import MatrixGrid from '$lib/matrix/MatrixGrid.svelte';
	import { OPERATIONS, symbolicFormula } from '$lib/matrix/operations';
	import {
		MAX_DIM,
		clampDim,
		resize,
		canCombine,
		resultDims,
		combine,
		entryTerms,
		entryValue,
		entryText,
		formatNumber,
		termNumber,
		type Matrix,
		type OperationId,
		type Term
	} from '$lib/matrix/matrix';
	import { colored } from '$lib/matrix/tones';
	import { matricesToText, parseMatricesText, equationText } from '$lib/matrix/ascii';
	import AssistanceMsg from '$lib/components/AssistanceMsg.svelte';
	import IconTerminal from '$lib/icons/icon-terminal.svelte';
	import { assistanceMsg } from '../../stores/imge_main';

	type Cell = { r: number; c: number };

	// hover hints of the small frame buttons, in the hint line like the graph editor's toolbar
	const hint = (text: string) => assistanceMsg.set(text);
	const unhint = () => assistanceMsg.set('');

	let opId: OperationId = 'add';
	$: op = OPERATIONS.find((o) => o.id === opId) ?? OPERATIONS[0];

	// sizes as typed (may be empty while typing) and as used (whole numbers 1 .. MAX_DIM)
	let i: unknown = 2;
	let j: unknown = 3;
	let m: unknown = 2;
	let n: unknown = 3;
	$: d = { i: clampDim(i), j: clampDim(j), m: clampDim(m), n: clampDim(n) };
	$: valid = canCombine(opId, d);
	$: size = resultDims(opId, d);

	// start values, so the page shows a worked example right away
	let A: Matrix = [
		[1, 2, 3],
		[4, 5, 6]
	];
	let B: Matrix = [
		[7, 8, 9],
		[10, 11, 12]
	];
	$: A = resize(d.i, d.j, A);
	$: B = resize(d.m, d.n, B);
	$: C = combine(opId, A, B, d);

	// the selected entry of C: under the mouse, else the last one clicked (kept inside C)
	let pinned: Cell = { r: 0, c: 0 };
	let pointed: Cell | null = null;
	$: selected = size ? inside(pointed ?? pinned, size) : null;
	$: terms = selected ? entryTerms(opId, A, B, selected.r, selected.c) : [];
	$: inA = (r: number, c: number) => terms.some((t) => t.aRow === r && t.aCol === c);
	$: inB = (r: number, c: number) => terms.some((t) => t.bRow === r && t.bCol === c);
	$: isSelected = (r: number, c: number) => selected?.r === r && selected?.c === c;
	$: writtenOut = (r: number, c: number) => entryText(opId, entryTerms(opId, A, B, r, c));

	// II's view: the matrices, or the text view (A and B as editable text, the equation to copy)
	let view: 'grid' | 'text' = 'grid';
	let asciiText = '';
	let asciiError = '';
	let typing = false; // while the text has the focus it isn't redrawn under the cursor
	$: if (!typing) asciiText = matricesToText(A, B);
	$: equationArt = valid ? equationText([A, op.operator, B, '=', C]) : equationText([A, op.operator, B]);

	/** Typed text → sizes and values, as soon as it reads as two whole matrices. */
	function readAscii(): void {
		const r = parseMatricesText(asciiText);
		if (!r.ok) {
			asciiError = r.error;
			return;
		}
		asciiError = '';
		[i, j, m, n] = [r.A.length, r.A[0].length, r.B.length, r.B[0].length];
		A = r.A;
		B = r.B;
	}

	/** Leaving the text: redraw it aligned, unless it has an error (then it stays as typed). */
	function endTyping(): void {
		if (!asciiError) typing = false;
	}

	// toolbar entries, top to bottom (data only, like the graph editor's `buttons`): one per
	// operation (its hint the full name), then the text view toggle
	type Tool = {
		id: string;
		icon: typeof IconTerminal;
		iconProps?: Record<string, unknown>;
		hint: string;
		active: boolean;
		disabled: boolean;
		action: () => void;
	};
	$: tools = [
		...OPERATIONS.map(
			(o): Tool => ({
				id: o.id,
				icon: o.icon,
				hint: o.label,
				active: o.id === opId,
				disabled: !o.enabled,
				action: () => (opId = o.id)
			})
		),
		{
			id: 'view',
			icon: IconTerminal,
			iconProps: { on: view === 'text' },
			hint: view === 'text' ? 'View as Matrices' : 'View as Text: type A and B',
			active: view === 'text',
			disabled: false,
			action: () => (view = view === 'text' ? 'grid' : 'text')
		}
	] satisfies Tool[];

	async function copyEquation(): Promise<void> {
		try {
			await navigator.clipboard.writeText(equationArt);
			hint('Equation copied as text');
		} catch {
			hint('Copying was refused by the browser');
		}
		setTimeout(unhint, 2000);
	}

	function inside(cell: Cell, s: { rows: number; cols: number }): Cell {
		return { r: Math.min(cell.r, s.rows - 1), c: Math.min(cell.c, s.cols - 1) };
	}

	function applyFix(): void {
		const f = op.rule.fix(d);
		if (f.i !== undefined) i = f.i;
		if (f.j !== undefined) j = f.j;
		if (f.m !== undefined) m = f.m;
		if (f.n !== undefined) n = f.n;
	}

	function tex(source: string, display = false): string {
		return katex.renderToString(source, { displayMode: display, throwOnError: false });
	}

	function escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	/** A description text: plain text with $...$ parts rendered as math. */
	function rich(text: string): string {
		return text
			.split('$')
			.map((part, k) => (k % 2 ? tex(part) : escapeHtml(part)))
			.join('');
	}

	/** The selected entry written out in three lines: symbols, numbers, value; each part in
	 *  its matrix's colour. */
	function entryTex(id: OperationId, ts: Term[], cell: Cell): string {
		const a = (t: Term) => colored('a', `a_{${t.aRow + 1}${t.aCol + 1}}`);
		const b = (t: Term) => colored('b', `b_{${t.bRow + 1}${t.bCol + 1}}`);
		const av = (t: Term) => colored('a', termNumber(t.a));
		const bv = (t: Term) => colored('b', termNumber(t.b));
		const symbols = ts.map((t) => (id === 'add' ? `${a(t)} + ${b(t)}` : `${a(t)}\\,${b(t)}`)).join(' + ');
		const numbers = ts.map((t) => (id === 'add' ? `${av(t)} + ${bv(t)}` : `${av(t)} \\cdot ${bv(t)}`)).join(' + ');
		const c = colored('c', `c_{${cell.r + 1}${cell.c + 1}}`);
		const value = colored('c', formatNumber(entryValue(id, ts)));
		return `\\begin{aligned} ${c} &= ${symbols} \\\\ &= ${numbers} \\\\ &= ${value} \\end{aligned}`;
	}
</script>

<svelte:head>
	<title>Matrix calculator · imge</title>
	<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
</svelte:head>

<div class="mobile-notice">
	<div class="notice-card">
		<h2>Screen Size Not Supported</h2>
		<p>
			We're sorry, but this matrix calculator is not optimized for mobile devices. Please view this
			page on a desktop or a larger screen.
		</p>
	</div>
</div>

<div class="app-container main-content">
	<div class="panels">
		<!-- i. notation (top, left) -->
		<section class="panel panel-math">
			<h2 class="panel-title">I. notation</h2>
			<div class="panel-body centered">
				<div class="row row-2">{@html tex(symbolicFormula(op), true)}</div>
				<div class="row row-15">{@html tex(op.formula(d), true)}</div>

				<div class="row row-1 inputs">
					<div class="group group-a">
						<label for="dim-i">i (A rows)</label>
						<input id="dim-i" type="number" bind:value={i} min="1" max={MAX_DIM} />
					</div>
					<div class="group group-a">
						<label for="dim-j">j (A cols)</label>
						<input id="dim-j" type="number" bind:value={j} min="1" max={MAX_DIM} />
					</div>
					<div class="group group-b">
						<label for="dim-m">m (B rows)</label>
						<input id="dim-m" type="number" bind:value={m} min="1" max={MAX_DIM} />
					</div>
					<div class="group group-b">
						<label for="dim-n">n (B cols)</label>
						<input id="dim-n" type="number" bind:value={n} min="1" max={MAX_DIM} />
					</div>
				</div>

				{#if !valid}
					<div class="row row-1 warning">
						<span>⚠ {@html rich(op.rule.fails)}</span>
						<button type="button" class="pixel-button" on:click={applyFix}>{op.rule.fixLabel}</button>
					</div>
				{/if}
			</div>
		</section>

		<!-- iii. calculator (bottom, full width) -->
		<section class="panel panel-matrices">
			<h2 class="panel-title">III. calculator</h2>
			<div class="panel-body centered">
				{#if view === 'text'}
					<div class="ascii">
						<div class="ascii-col">
							<label class="ascii-head" for="ascii-edit">A and B: type values, rows and columns</label>
							<textarea
								id="ascii-edit"
								class="ascii-text ascii-type"
								bind:value={asciiText}
								rows={asciiText.split('\n').length}
								cols={Math.max(12, ...asciiText.split('\n').map((l) => l.length + 2))}
								spellcheck="false"
								on:input={readAscii}
								on:focus={() => (typing = true)}
								on:blur={endTyping}
							></textarea>
							{#if asciiError}<p class="ascii-error">⚠ {asciiError}</p>{/if}
						</div>
						<div class="ascii-col">
							<div class="ascii-head">
								<span>{valid ? 'equation' : 'no result: the sizes don\'t fit'}</span>
								<button type="button" class="pixel-button small" on:click={copyEquation}>copy</button>
							</div>
							<pre class="ascii-text ascii-type">{equationArt}</pre>
						</div>
					</div>
				{:else if valid && size}
					<div class="equation-row">
						<MatrixGrid bind:values={A} title="Matrix A ({d.i}×{d.j})" tone="a" editable highlighted={inA} />
						<div class="operator">{op.operator}</div>
						<MatrixGrid bind:values={B} title="Matrix B ({d.m}×{d.n})" tone="b" editable highlighted={inB} />
						<div class="operator">=</div>
						<MatrixGrid
							values={C}
							title="{op.templateTitle} ({size.rows}×{size.cols})"
							tone="template"
							text={writtenOut}
							highlighted={isSelected}
							onpoint={(cell) => (pointed = cell)}
							onpick={(cell) => (pinned = cell)}
						/>
						<div class="operator">=</div>
						<MatrixGrid
							values={C}
							title="Result C ({size.rows}×{size.cols})"
							tone="c"
							highlighted={isSelected}
							onpoint={(cell) => (pointed = cell)}
							onpick={(cell) => (pinned = cell)}
						/>
					</div>
				{:else}
					<p class="hint">No result: the sizes don't fit (see notation).</p>
				{/if}
			</div>
		</section>

		<!-- ii. description (top, right), one block of sections -->
		<section class="panel panel-desc">
			<h2 class="panel-title">II. description</h2>
			<div class="panel-body">
				{#each op.boxes as box}
					<section class="desc-section">
						<h3>{box.title}</h3>
						{#if box.kind === 'text'}
							{#each box.paragraphs as p}
								<p>{@html rich(p)}</p>
							{/each}
						{:else if box.kind === 'rule'}
							<p>{@html rich(op.rule.needs)}</p>
							<p class="check" class:ok={valid} class:fails={!valid}>
								{@html tex(op.rule.check(d))}
								<span>{@html valid ? '✓ ' + rich(op.rule.ok) : '✗ ' + rich(op.rule.fails)}</span>
							</p>
							<p>
								{@html rich(op.rule.resultSize)}
								{#if size}Here: <strong>{size.rows}×{size.cols}</strong>.{/if}
							</p>
						{:else if box.kind === 'entry'}
							{#if selected}
								<p class="hint">Point at or click a cell of C; its parts light up in A and B.</p>
								<div class="entry">{@html tex(entryTex(opId, terms, selected), true)}</div>
							{:else}
								<p class="hint">Fix the sizes first: there is no C yet.</p>
							{/if}
						{/if}
					</section>
				{/each}
			</div>
		</section>
	</div>
</div>

<!-- toolbar at the bottom left, as the graph editor's (styles .access-* in imge.css):
     the operations, then the text view toggle; hover hints in the hint line -->
<div class="access-wrapper main-content" role="toolbar" aria-label="matrix calculator">
	{#each tools as tool (tool.id)}
		<div
			class="access-function"
			class:active={tool.active}
			role="button"
			tabindex="0"
			aria-label={tool.hint}
			aria-pressed={tool.active}
			aria-disabled={tool.disabled}
			on:click={() => !tool.disabled && tool.action()}
			on:keydown={(event) => event.key === 'Enter' && !tool.disabled && tool.action()}
			on:mouseenter={() => hint(tool.hint)}
			on:mouseleave={unhint}
		>
			<svelte:component this={tool.icon} {...tool.iconProps} />
		</div>
	{/each}
</div>

<AssistanceMsg />

<style>
	/* =========================================================================
	   PAGE: three panels filling the screen between the top links and the
	   bottom bar; top row notation | explanation, bottom row the matrices alone
	========================================================================= */
	.app-container {
		box-sizing: border-box;
		width: 100%;
		height: 100vh;
		/* left: room for the toolbar (fixed at the bottom left, as in the graph editor) */
		padding: 3rem 1.5rem 3.5rem 3.5rem;
	}

	.panels {
		--pixel: 1px; /* frame line width */
		--frame: color-mix(in srgb, var(--col, #333) 22%, transparent); /* frame lines: faint */
		display: grid;
		/* the explanation gets more room: it grows with later operations (determinant) */
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.6fr);
		grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
		grid-template-areas:
			'math desc'
			'matrices matrices';
		gap: 2.2rem 2rem;
		height: 100%;
		max-width: 1800px;
		margin: 0 auto;
	}
	.panel-math {
		grid-area: math;
	}
	.panel-matrices {
		grid-area: matrices;
	}
	.panel-desc {
		grid-area: desc;
	}

	/* a panel: a 1 px frame with pixelated corners, no shadow. The four edges are drawn as
	   box-shadows of the box's own size moved out by one line each way; they don't overlap
	   at the corners, so each corner pixel stays empty (the pixel-art corner). */
	.panel {
		position: relative;
		min-height: 0;
		display: flex;
		flex-direction: column;
		border: none;
		background: var(--bg, #fff);
		color: var(--col, #333);
		font-family: var(--main-font, sans-serif);
		box-shadow:
			0 calc(-1 * var(--pixel)) 0 0 var(--frame),
			0 var(--pixel) 0 0 var(--frame),
			calc(-1 * var(--pixel)) 0 0 0 var(--frame),
			var(--pixel) 0 0 0 var(--frame);
	}

	/* the title, as the graph editor's group names: in a gap of the top line (the page's
	   background behind it cuts the line), here at the left instead of centred */
	.panel-title {
		position: absolute;
		top: calc(-0.5 * var(--pixel));
		left: 1rem;
		transform: translateY(-50%);
		margin: 0;
		padding: 0 0.5em;
		background: var(--bg, #fff);
		color: var(--col, #333);
		font-size: 0.8rem;
		font-weight: 600;
		line-height: 1.4;
		text-transform: lowercase; /* i. notation, ii. description, iii. calculator */
		opacity: 0.85;
		white-space: nowrap;
		z-index: 1;
	}

	/* scrollbars inside the panels: thin, a faint thumb in the frame colour, no track
	   (Firefox: scrollbar-*, Chrome / Edge / Safari: ::-webkit-scrollbar) */
	.panels :global(*) {
		scrollbar-width: thin;
		scrollbar-color: var(--frame) transparent;
	}
	.panels :global(*::-webkit-scrollbar) {
		width: 6px;
		height: 6px;
	}
	.panels :global(*::-webkit-scrollbar-track),
	.panels :global(*::-webkit-scrollbar-corner) {
		background: transparent;
	}
	.panels :global(*::-webkit-scrollbar-thumb) {
		background: var(--frame);
		border-radius: 0;
	}
	.panels :global(*::-webkit-scrollbar-thumb:hover) {
		background: color-mix(in srgb, var(--col, #333) 45%, transparent);
	}

	.panel-body {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 1.6rem 1rem 1.2rem;
	}
	.panel-body.centered {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		/* "safe": too tall or wide content starts at the edge and scrolls instead of being cut */
		justify-content: safe center;
		align-items: safe center;
	}

	/* buttons in the same pixel style */
	.pixel-button {
		padding: 0.3rem 0.9rem;
		border: var(--pixel) solid currentColor;
		border-radius: 0;
		background: transparent;
		color: inherit;
		font-family: inherit;
		font-size: 0.9rem;
		cursor: pointer;
	}
	.pixel-button:hover:not(:disabled) {
		background: var(--col-transparent-2, rgba(0, 0, 0, 0.1));
	}

	/* =========================================================================
	   I: NOTATION AND SIZES
	========================================================================= */
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
		border: var(--pixel) solid var(--col-border, #ccc);
		border-radius: 0;
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
	.group-a input[type='number']:focus {
		border-color: #0076ff;
		outline: none;
	}
	.group-b input[type='number']:focus {
		border-color: #7928ca;
		outline: none;
	}

	.warning {
		flex-direction: column;
		gap: 0.5rem;
		color: #ff3e00;
		font-weight: 500;
		text-align: center;
	}

	.pixel-button.small {
		padding: 0.1rem 0.6rem;
		font-size: 0.8rem;
	}

	/* =========================================================================
	   II: MATRICES (one line; the panel scrolls sideways when it is too wide)
	========================================================================= */
	/* the row keeps its natural width (max-content) and its parts never shrink, so no matrix,
	   title or written-out entry is squeezed onto a second line; too wide: the panel scrolls */
	.equation-row {
		display: flex;
		flex-wrap: nowrap;
		align-items: center;
		justify-content: center;
		gap: 1.2rem;
		width: max-content;
	}
	.equation-row > :global(*) {
		flex: none;
	}
	.operator {
		font-size: 2rem;
		font-weight: 300;
		opacity: 0.6;
		user-select: none;
		padding-top: 1.5rem;
	}

	/* calculator, text view: the editable text of A and B | the equation to copy; terminal
	   look in the page's text colour: no frame, no background, no wrapping */
	.ascii {
		display: flex;
		flex-wrap: nowrap;
		gap: 3rem;
		align-items: flex-start;
		width: max-content;
	}
	.ascii-col {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.ascii-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		font-size: 0.8rem;
		opacity: 0.8;
	}
	/* font, line height, spacing: .ascii-type in imge.css, as the graph editor's text view,
	   so the box-drawing brackets join into whole lines */
	.ascii-text {
		margin: 0;
		padding: 0;
		font-size: 15px;
		overflow: hidden;
		color: var(--col, #333);
		background: none;
		border: none;
		border-radius: 0;
		box-shadow: none;
		outline: none;
	}
	textarea.ascii-text {
		resize: none;
		overflow-wrap: normal;
		caret-color: var(--col, #333);
	}
	.ascii-error {
		margin: 0;
		color: #ff3e00;
		font-size: 0.85rem;
	}

	/* =========================================================================
	   III: EXPLANATION (one block of sections)
	========================================================================= */
	.desc-section {
		padding: 1rem 0;
		border-top: 2px dashed var(--col-border, #ccc);
	}
	.desc-section:first-child {
		padding-top: 0;
		border-top: none;
	}
	.desc-section:last-child {
		padding-bottom: 0;
	}
	.desc-section h3 {
		margin: 0 0 0.5rem;
		font-size: 1rem;
		font-weight: 600;
	}
	.desc-section p {
		margin: 0.5rem 0;
		line-height: 1.6;
		font-size: 0.95rem;
		max-width: 75ch;
	}
	.check {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.4rem 1rem;
		padding: 0.4rem 0.7rem;
		border-left: calc(3 * var(--pixel)) solid currentColor;
	}
	.check.ok {
		color: #00a36c;
		background: rgba(0, 163, 108, 0.08);
	}
	.check.fails {
		color: #ff3e00;
		background: rgba(255, 62, 0, 0.08);
	}
	.hint {
		opacity: 0.7;
	}
	.entry {
		overflow-x: auto;
	}

	/* narrower screens: the panels one below the other, as tall as their content */
	@media (max-width: 1100px) {
		.app-container {
			height: auto;
		}
		.panels {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: auto;
			grid-template-areas: 'math' 'desc' 'matrices';
		}
	}

	/* =========================================================================
	   MOBILE NOTICE VIEWPORT RULES
	========================================================================= */
	.mobile-notice {
		display: none;
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
	@media (max-width: 768px) {
		.mobile-notice {
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.main-content {
			display: none !important;
		}
	}
</style>
