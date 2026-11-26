<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-26
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Table" for a table node (type "table"): show its name above
	// the table, its scale, the number of rows and columns, and the row or column chosen in
	// "Edit": insert a row / column before or after it, remove it, and its style (size,
	// opacity, bold, italic, underline, alignment, colour). Each style key can be left unset
	// ("—"), so a row only overrides what it sets: a cell takes its column's style, then its
	// row's on top (table.ts). Lines between the cells: off unless switched on here. Cells are
	// typed in the node itself (double-click). Each change
	// is one undo step (setNodeContent). Name and colour are in the Content section.
	import PropText from './PropText.svelte';
	import PropColor from './PropColor.svelte';
	import { graph, setNodeContent, setNodeScale } from '$lib/graph/store';
	import { nodeScale, SCALE_MIN, SCALE_MAX } from '$lib/graph/node-types';
	import {
		tableOf,
		tableContent,
		addRow,
		removeRow,
		addColumn,
		removeColumn,
		setStyle,
		tableLines,
		TABLE_ALIGNS,
		TABLE_MAX,
		SIZE_RANGE,
		OPACITY_RANGE,
		type Table,
		type TableStyle
	} from '$lib/graph/table';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];
	$: table = tableOf(node.content);

	// the row or column being edited: "row:0", "col:2"; kept inside the table when it shrinks
	let target = 'row:0';
	let axis: 'row' | 'col' = 'row';
	$: axis = target.startsWith('col:') ? 'col' : 'row';
	$: index = Math.min(Number(target.slice(4)) || 0, (axis === 'row' ? table.rows : table.cols) - 1);
	$: style = ((axis === 'row' ? table.rowStyles : table.colStyles)[index] ?? {}) as TableStyle;
	$: isRow = axis === 'row';

	const store = (next: Table) => {
		const id = node.id;
		const content = tableContent(next);
		graph.update((g) => setNodeContent(g, id, content));
	};

	function insert(after: boolean): void {
		const at = index + (after ? 1 : 0);
		store(isRow ? addRow(table, at) : addColumn(table, at));
		target = `${axis}:${at}`;
	}

	function remove(): void {
		store(isRow ? removeRow(table, index) : removeColumn(table, index));
		target = `${axis}:${Math.max(0, index - 1)}`;
	}

	const restyle = (patch: Partial<Record<keyof TableStyle, unknown>>) => store(setStyle(table, axis, index, patch));

	// a yes / no style key as a three-way choice: unset, on, off
	const tri = (v: boolean | undefined) => (v === undefined ? '' : v ? 'on' : 'off');
	const fromTri = (v: string) => (v === '' ? undefined : v === 'on');
	const FLAGS: { key: 'bold' | 'italic' | 'underline'; title: string }[] = [
		{ key: 'bold', title: 'Bold' },
		{ key: 'italic', title: 'Italic' },
		{ key: 'underline', title: 'Underline' }
	];
	// computed here: a function call as a <select> value doesn't compile in this Svelte mode
	// (it leaves an undefined temporary); a plain lookup does
	$: flagValue = { bold: tri(style.bold), italic: tri(style.italic), underline: tri(style.underline) } as Record<string, string>;
	$: alignValue = style.align ?? '';
	const ALIGN_TITLES: Record<string, string> = { left: 'Left', center: 'Centre', right: 'Right' };
	const numberOrUnset = (typed: string) => (typed.trim() === '' ? undefined : Number(typed));
</script>

<dl class="props">
	<dt>Size</dt>
	<dd>
		{table.rows} {table.rows === 1 ? 'row' : 'rows'} × {table.cols} {table.cols === 1 ? 'column' : 'columns'}
		<div class="prop-faint">double-click a cell to type in it; Tab moves to the next</div>
	</dd>

	<dt>Scale</dt>
	<dd>
		<PropText
			type="number"
			step={0.25}
			min={SCALE_MIN}
			max={SCALE_MAX}
			label="Scale"
			value={nodeScale(node)}
			onCommit={(typed) => graph.update((g) => setNodeScale(g, node.id, Number(typed)))}
		/>
	</dd>

	<dt><label for="prop-table-target">Edit</label></dt>
	<dd>
		<select id="prop-table-target" class="prop-input" bind:value={target}>
			<optgroup label="Rows">
				{#each table.cells as row, r}<option value="row:{r}">Row {r + 1}{row[0] ? ` · ${row[0].slice(0, 16)}` : ''}</option>{/each}
			</optgroup>
			<optgroup label="Columns">
				{#each table.cells[0] as head, c}<option value="col:{c}">Column {c + 1}{head ? ` · ${head.slice(0, 16)}` : ''}</option>{/each}
			</optgroup>
		</select>
	</dd>
</dl>

<div class="prop-actions">
	<button
		type="button"
		class="prop-button"
		disabled={isRow ? table.rows >= TABLE_MAX.rows : table.cols >= TABLE_MAX.cols}
		on:click={() => insert(false)}>Insert {isRow ? 'above' : 'left'}</button
	>
	<button
		type="button"
		class="prop-button"
		disabled={isRow ? table.rows >= TABLE_MAX.rows : table.cols >= TABLE_MAX.cols}
		on:click={() => insert(true)}>Insert {isRow ? 'below' : 'right'}</button
	>
	<button type="button" class="prop-button" disabled={isRow ? table.rows <= 1 : table.cols <= 1} on:click={remove}>
		Remove {isRow ? 'row' : 'column'}
	</button>
</div>

<div class="prop-subtitle">Look of {isRow ? 'row' : 'column'} {index + 1} <span class="prop-faint">(— = not set{isRow ? '' : '; rows set on top'})</span></div>
<dl class="props">
	<dt>Text size</dt>
	<dd>
		<PropText
			type="number"
			step={0.1}
			min={SIZE_RANGE.min}
			max={SIZE_RANGE.max}
			placeholder="—"
			label="Text size"
			value={style.size ?? ''}
			onCommit={(typed) => restyle({ size: numberOrUnset(typed) })}
		/>
	</dd>

	<dt>Opacity</dt>
	<dd>
		<PropText
			type="number"
			step={0.1}
			min={OPACITY_RANGE.min}
			max={OPACITY_RANGE.max}
			placeholder="—"
			label="Opacity"
			value={style.opacity ?? ''}
			onCommit={(typed) => restyle({ opacity: numberOrUnset(typed) })}
		/>
	</dd>

	{#each FLAGS as flag (flag.key)}
		<dt>{flag.title}</dt>
		<dd>
			<select class="prop-input" aria-label={flag.title} value={flagValue[flag.key]} on:change={(e) => restyle({ [flag.key]: fromTri(e.currentTarget.value) })}>
				<option value="">—</option>
				<option value="on">on</option>
				<option value="off">off</option>
			</select>
		</dd>
	{/each}

	<dt>Align</dt>
	<dd>
		<select class="prop-input" aria-label="Align" value={alignValue} on:change={(e) => restyle({ align: e.currentTarget.value || undefined })}>
			<option value="">—</option>
			{#each TABLE_ALIGNS as a}<option value={a}>{ALIGN_TITLES[a]}</option>{/each}
		</select>
	</dd>

	<dt class="prop-top">Color</dt>
	<dd>
		<PropColor value={style.color ?? null} onCommit={(color) => restyle({ color: color ?? undefined })} />
	</dd>
</dl>

<label class="prop-check">
	<input type="checkbox" checked={node.content.showName !== false} on:change={(e) => {
		const id = node.id;
		const showName = e.currentTarget.checked;
		graph.update((g) => setNodeContent(g, id, { showName }));
	}} />
	Show the name above the table
</label>
<label class="prop-check">
	<input type="checkbox" checked={tableLines(node.content)} on:change={(e) => {
		const id = node.id;
		const showLines = e.currentTarget.checked;
		graph.update((g) => setNodeContent(g, id, { showLines }));
	}} />
	Show lines between the cells
</label>
