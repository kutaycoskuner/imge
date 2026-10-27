<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// A multi-line field of the Properties panel for UML member lines (one attribute or method
	// per line), with syntax highlighting while typing and a format check under it.
	// - Highlighting: a <pre> with the parsed lines (tokens from $lib/graph/uml.ts) lies exactly
	//   under a textarea whose own text is transparent; both use the same font, padding and no
	//   wrapping (white-space: pre), and scroll together, so the caret and selection belong to the textarea and
	//   the colours to the <pre>.
	// - Format check: every line that doesn't follow the notation is listed as
	//   "line N: what's wrong", live while typing; nothing is refused, a line with an error is
	//   still saved (and drawn underlined on the node).
	// - The graph changes only when the edit is done (leaving the field), so one edit is one undo
	//   step; empty lines are dropped. Esc puts the old text back (and keeps the Esc menu closed).
	//   While not focused, the field follows `value`, so undo shows up in it.
	import type { UmlLine } from '$lib/graph/uml';

	export let value: string[];
	export let parse: (line: string) => UmlLine;
	export let label: string; // for screen readers, e.g. "Attributes"
	export let placeholder = '';
	export let onCommit: (lines: string[]) => void;

	let draft = value.join('\n');
	let focused = false;
	let cancelled = false;
	$: if (!focused) draft = value.join('\n');

	// parsed per line; an empty line is just empty (dropped when saving)
	$: lines = draft.split('\n').map((line) => (line.trim() ? parse(line) : { tokens: [{ text: line, kind: 'text' as const }], error: null, static: false, abstract: false, properties: [] }));
	$: problems = lines.map((l, i) => ({ line: i + 1, error: l.error })).filter((p) => p.error);
	$: filled = lines.filter((l) => l.tokens.some((t) => t.text.trim())).length;
	$: rows = Math.max(3, lines.length + 1);

	const clean = (text: string): string[] =>
		text
			.split('\n')
			.map((l) => l.trimEnd())
			.filter((l) => l.trim());

	function handleKey(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			event.preventDefault(); // only cancels the edit; the Esc menu stays closed
			cancelled = true;
			(event.target as HTMLTextAreaElement).blur();
		}
	}

	function handleBlur(): void {
		const next = clean(draft);
		if (!cancelled && JSON.stringify(next) !== JSON.stringify(value)) onCommit(next);
		focused = false;
		cancelled = false;
		draft = value.join('\n');
	}

	// keeps the highlighted copy under the text when the field scrolls
	let pre: HTMLPreElement;
	const syncScroll = (event: Event) => {
		const area = event.currentTarget as HTMLTextAreaElement;
		pre.scrollTop = area.scrollTop;
		pre.scrollLeft = area.scrollLeft;
	};
</script>

<div class="uml-field">
	<div class="uml-editor">
		<pre class="uml-highlight" aria-hidden="true" bind:this={pre}>{#each lines as line, i}<span class="uml-line" class:invalid={!!line.error}>{#each line.tokens as token}<span class="uml-{token.kind}">{token.text}</span>{/each}</span>{i < lines.length - 1 ? '\n' : ''}{/each}{'\n'}</pre>
		<textarea
			class="uml-input"
			aria-label={label}
			{placeholder}
			{rows}
			spellcheck="false"
			value={draft}
			on:input={(event) => (draft = event.currentTarget.value)}
			on:focus={() => (focused = true)}
			on:keydown={handleKey}
			on:blur={handleBlur}
			on:scroll={syncScroll}
		></textarea>
	</div>
	{#if problems.length}
		<ul class="uml-problems">
			{#each problems as problem (problem.line)}
				<li>line {problem.line}: {problem.error}</li>
			{/each}
		</ul>
	{:else if filled}
		<p class="uml-ok">{filled} line{filled === 1 ? '' : 's'} in UML notation</p>
	{/if}
</div>

<style>
	.uml-field {
		display: flex;
		flex-direction: column;
		gap: 0.25em;
		min-width: 0;
	}

	/* the highlighted copy and the textarea share one box, font and padding exactly */
	.uml-editor {
		position: relative;
		min-width: 0;
	}

	.uml-highlight,
	.uml-input {
		box-sizing: border-box;
		width: 100%;
		margin: 0;
		padding: 0.3em 0.45em;
		font-family: monospace;
		font-size: 0.92em;
		line-height: 1.5;
		white-space: pre;
		overflow: auto;
		border: 1px solid transparent;
		border-radius: 3px;
		tab-size: 4;
	}

	.uml-highlight {
		position: absolute;
		inset: 0;
		pointer-events: none;
		color: var(--col);
		scrollbar-width: none; /* only the textarea shows scroll bars */
	}

	.uml-input {
		position: relative;
		display: block;
		resize: vertical;
		color: transparent; /* the text is seen in the highlighted copy under it */
		caret-color: var(--col);
		background: color-mix(in srgb, var(--col) 7%, transparent);
		border-color: color-mix(in srgb, var(--col) 15%, transparent);
		outline: none;
	}

	.uml-input:focus {
		border-color: var(--col-selected);
	}

	.uml-input::placeholder {
		color: color-mix(in srgb, var(--col) 40%, transparent);
	}

	.uml-input::selection {
		background: color-mix(in srgb, var(--col-selected) 35%, transparent);
	}

	.uml-problems {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.85em;
		color: #d9534f;
	}

	.uml-ok {
		margin: 0;
		font-size: 0.85em;
		opacity: 0.55;
	}
</style>
