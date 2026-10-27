<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The graph editor's text view (experimental): the open graph drawn with box-drawing
	// characters ($lib/graph/ascii.ts), over the canvas while the toolbar's view button says
	// text. It follows every change (Properties panel, undo); a click on a box or a link
	// selects it (Shift+click adds nodes), so the panel edits it. Styles the plain text
	// can't hold are shown here: UML highlighting, underlined {static} members, italic
	// abstract ones, node colours, the selection. "Copy text" and "Download .txt" give the
	// plain characters. Mounted by routes/+page.svelte when `viewMode` is "text".
	import { graph, selection, linkArrowOverride, viewMode } from '$lib/graph/store';
	import { workspace } from '$lib/graph/file-access';
	import { graphToAscii, asciiText, undrawnLinks, type AsciiCell } from '$lib/graph/ascii';

	$: art = graphToAscii($graph, { arrowOverride: $linkArrowOverride });
	$: skipped = undrawnLinks($graph).length;
	$: selected = new Set([...$selection.nodes.map((id) => `node:${id}`), ...($selection.link ? [`link:${$selection.link}`] : [])]);

	// one row of cells as runs of the same look, so the view has few elements; characters a
	// font may draw wider than a cell (▶ ◇ « …) get a run of their own, one cell wide
	type Run = { text: string; cls: string; owner?: string; color?: string };
	const NARROW = /^[\x20-\x7e─-╿]$/;
	function runs(row: AsciiCell[], chosen: Set<string>): Run[] {
		const out: Run[] = [];
		for (const cell of row) {
			const wide = !NARROW.test(cell.ch);
			const cls = [cell.cls ?? '', cell.owner && chosen.has(cell.owner) ? 'ascii-sel' : '', wide ? 'ascii-w' : ''].filter(Boolean).join(' ');
			const last = out[out.length - 1];
			if (last && !wide && !last.cls.includes('ascii-w') && last.cls === cls && last.owner === cell.owner && last.color === cell.color) last.text += cell.ch;
			else out.push({ text: cell.ch, cls, owner: cell.owner, color: cell.color });
		}
		return out;
	}
	$: rows = art.cells.map((row) => runs(row, selected));

	let note = '';
	let noteTimer: ReturnType<typeof setTimeout>;
	function say(text: string): void {
		note = text;
		clearTimeout(noteTimer);
		noteTimer = setTimeout(() => (note = ''), 2500);
	}

	function select(event: MouseEvent): void {
		const owner = (event.target as HTMLElement).closest<HTMLElement>('[data-owner]')?.dataset.owner;
		if (!owner) return selection.set({ nodes: [], link: null });
		const [kind, id] = owner.split(':');
		if (kind === 'link') return selection.set({ nodes: [], link: id });
		if (event.shiftKey) {
			const nodes = $selection.nodes.includes(id) ? $selection.nodes.filter((n) => n !== id) : [...$selection.nodes, id];
			selection.set({ nodes, link: null });
		} else selection.set({ nodes: [id], link: null });
	}

	async function copy(): Promise<void> {
		try {
			await navigator.clipboard.writeText(asciiText(art));
			say('Copied as text');
		} catch {
			say('The browser did not allow copying; use Download .txt');
		}
	}

	function download(): void {
		const base = ($workspace.fileName ?? 'imgegraph').replace(/\.json$/i, '');
		const url = URL.createObjectURL(new Blob([asciiText(art) + '\n'], { type: 'text/plain;charset=utf-8' }));
		const a = document.createElement('a');
		a.href = url;
		a.download = `${base}.txt`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
		say(`Downloaded ${base}.txt`);
	}
</script>

<div class="text-view">
	<div class="text-view-bar">
		<strong>Text view</strong>
		<span class="faint">experimental · {art.width} × {art.height} characters{skipped ? ` · ${skipped} link${skipped > 1 ? 's' : ''} at groups not drawn` : ''}</span>
		<button on:click={copy}>Copy text</button>
		<button on:click={download}>Download .txt</button>
		<button on:click={() => viewMode.set('canvas')}>Back to canvas</button>
		{#if note}<span class="faint">{note}</span>{/if}
	</div>
	{#if art.height}
		<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
		<pre class="ascii" on:click={select}>{#each rows as row}{#each row as run}<span class={run.cls} data-owner={run.owner} style={run.color ? `color: ${run.color}` : undefined}>{run.text}</span>{/each}{'\n'}{/each}</pre>
	{:else}
		<p class="faint">The graph is empty.</p>
	{/if}
</div>

<style>
	/* over the canvas, below the top bar (its links and the theme switch stay usable); under
	   the Properties panel (25) and the toolbar (30) */
	.text-view {
		position: fixed;
		inset: 2.4em 0 0 0;
		z-index: 22;
		overflow: auto;
		padding: 0.4em 1em 3em 4em; /* clear of the toolbar on the left */
		box-sizing: border-box;
		background: var(--bg);
		color: var(--col);
	}

	.text-view-bar {
		position: sticky;
		top: 0;
		left: 0;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6em;
		margin-bottom: 0.8em;
		font-size: 0.8em;
	}

	.text-view-bar button {
		font: inherit;
		color: var(--col);
		background: none;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.15em 0.6em;
		cursor: pointer;
	}

	.text-view-bar button:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	.faint {
		opacity: 0.6;
	}

	.ascii {
		margin: 0;
		font-family: 'Cascadia Mono', Consolas, 'DejaVu Sans Mono', Menlo, monospace;
		font-size: 13px;
		line-height: 1.17; /* box-drawing glyphs fill this, so vertical lines join */
		letter-spacing: 0; /* the site's spacing would break horizontal lines into dashes */
		font-weight: 400;
		white-space: pre;
		cursor: default;
		width: max-content;
	}

	/* styles plain text can't hold */
	.ascii :global(.ascii-u) { text-decoration: underline; text-underline-offset: 2px; }
	.ascii :global(.ascii-i) { font-style: italic; }
	.ascii :global(.ascii-b) { font-weight: 600; }
	.ascii :global(.ascii-err) { text-decoration: underline wavy #d9534f; }
	.ascii :global(.ascii-label) { opacity: 0.8; }
	.ascii :global(.ascii-sel) { color: var(--col-selected) !important; }
	/* glyphs a font may draw wider than a cell keep exactly one cell */
	.ascii :global(.ascii-w) { display: inline-block; width: 1ch; overflow: visible; text-align: center; }
	.ascii :global([data-owner]) { cursor: pointer; }
</style>
