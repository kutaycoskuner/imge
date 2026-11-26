<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-26
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The inside of a table node (type "table", drawn by GraphNode.svelte): its name above the
	// table when shown, then the cells in rows and columns, each drawn with its style (its
	// column's, then its row's on top: table.ts cellStyle). Double-click a cell to edit it in
	// place: Enter or clicking away saves, Tab / Shift+Tab save and move to the next / previous
	// cell, Esc cancels. Rows, columns and their styles are edited in the Properties panel
	// (PropsTable.svelte). The node's scale sets the whole table's size. Lines between the
	// cells only when the table asks for them (content showLines; none by default).
	import { graph, setNodeContent, editingNodeId } from '$lib/graph/store';
	import { tableOf, cellStyle, setCell, tableContent, tableLines } from '$lib/graph/table';
	import type { GraphNode } from '$lib/graph/types';

	export let node: GraphNode;
	export let name: string;

	$: table = tableOf(node.content);
	$: showName = node.content.showName !== false && name.trim() !== '';

	let editing: { r: number; c: number } | null = null;
	let draft = '';

	function edit(r: number, c: number): void {
		editing = { r, c };
		draft = table.cells[r][c];
	}

	function commit(): void {
		if (!editing) return;
		const { r, c } = editing;
		const id = node.id;
		const next = tableContent(setCell(table, r, c, draft));
		editing = null;
		graph.update((g) => setNodeContent(g, id, next));
	}

	function key(event: KeyboardEvent): void {
		if (!editing) return;
		if (event.key === 'Enter') commit();
		else if (event.key === 'Escape') {
			event.preventDefault(); // only cancels the edit; keeps the Esc menu closed
			editing = null;
		} else if (event.key === 'Tab') {
			event.preventDefault();
			const { r, c } = editing;
			const index = r * table.cols + c + (event.shiftKey ? -1 : 1);
			commit();
			if (index >= 0 && index < table.rows * table.cols) edit(Math.floor(index / table.cols), index % table.cols);
		}
	}

	function focus(el: HTMLInputElement) {
		el.focus();
		el.select();
	}

	// a cell's CSS from its style
	function css(r: number, c: number): string {
		const s = cellStyle(table, r, c);
		return [
			`font-size: ${s.size}em`,
			`opacity: ${s.opacity}`,
			`font-weight: ${s.bold ? 700 : 400}`,
			`font-style: ${s.italic ? 'italic' : 'normal'}`,
			`text-decoration: ${s.underline ? 'underline' : 'none'}`,
			`text-align: ${s.align}`,
			s.color ? `color: ${s.color}` : ''
		]
			.filter(Boolean)
			.join('; ');
	}
</script>

{#if showName}<div class="table-name node-title" role="presentation" on:dblclick={() => editingNodeId.set(node.id)}>{name}</div>{/if}
<div class="table-grid" class:lined={tableLines(node.content)} style="grid-template-columns: repeat({table.cols}, auto);" role="table" aria-label={name || 'Table'}>
	{#each table.cells as row, r}
		{#each row as cell, c}
			<div class="table-cell" class:first-row={r === 0} class:first-col={c === 0} style={css(r, c)} role="cell" tabindex="-1" on:dblclick|stopPropagation={() => edit(r, c)}>
				{#if editing?.r === r && editing?.c === c}
					<input class="table-input" bind:value={draft} use:focus on:keydown|stopPropagation={key} on:blur={commit} />
				{:else}
					{cell || ' '}
				{/if}
			</div>
		{/each}
	{/each}
</div>
