<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Keybindings tab of the graph editor's Esc menu: every shortcut as key caps, and the
	// mouse actions. The keys are handled in routes/+page.svelte; the full table with details
	// is docs/graph-editing.md, "Mouse and keys" (keep both in step).
	import Kbd from './Kbd.svelte';

	// each row: one or more key combos (shown as alternatives) and what they do
	const KEYS: { section: string; rows: [string[], string][] }[] = [
		{
			section: 'Graph',
			rows: [
				[['Shift+N'], 'New empty graph (asks first if there are unsaved changes)'],
				[['Ctrl+Z'], 'Undo the last change (a whole drag is one step)'],
				[['Ctrl+Y', 'Ctrl+Shift+Z'], 'Redo'],
				[['Ctrl+S'], 'Save to the graph’s file; without a file, opens the menu'],
				[['Ctrl+Shift+S'], 'Download the graph as a .json file'],
				[['Esc'], 'Cancel a link drag or a name edit; otherwise open / close this menu']
			]
		},
		{
			section: 'Nodes',
			rows: [
				[['Shift+A'], 'New node at the mouse'],
				[['Ctrl+C'], 'Copy the selected nodes and the links between them'],
				[['Ctrl+V'], 'Paste the copied nodes at the mouse (again: one grid square further)'],
				[['F2'], 'Edit the selected node’s name (or the selected link’s)'],
				[['Delete', 'Backspace'], 'Remove the selected nodes with their links, or the selected link'],
				[['F'], 'Link two selected nodes']
			]
		},
		{
			section: 'Links',
			rows: [
				[['L'], 'Next shape: spline → line → manhattan'],
				[['D'], 'Next arrow: forward → both → backward → none'],
				[['R'], 'Route above or below its nodes (cycles and self-loops)']
			]
		},
		{
			section: 'View',
			rows: [
				[['+', '='], 'Zoom in toward the screen centre'],
				[['-'], 'Zoom out'],
				[['Home'], 'Fit the whole graph in the window']
			]
		}
	];

	const MOUSE: [string, string][] = [
		['Click', 'Select a node or link'],
		['Shift+click', 'Add a node to the selection, or remove it'],
		['Drag empty space', 'Pan'],
		['Shift+drag empty space', 'Draw a box: adds every node it touches to the selection (Esc cancels)'],
		['Wheel', 'Zoom toward the cursor'],
		['Drag a node', 'Move it with every selected node, snapped to half grid squares'],
		['Alt+drag a node', 'Move it without snapping (snapping can be turned off in the toolbar)'],
		['Drag output → input', 'Link two nodes (also input → output)'],
		['Drag a linked input', 'Re-route its latest link, or drop on empty space to remove it'],
		['Double-click a name', 'Edit a node’s or link’s name'],
		['Drag a manhattan link’s middle', 'Move its corner']
	];
</script>

<div class="keys-menu">
	{#each KEYS as group}
		<section>
			<h3>{group.section}</h3>
			<dl>
				{#each group.rows as [combos, action]}
					<dt>
						{#each combos as combo, i}{#if i > 0}<span class="or">/</span>{/if}<Kbd keys={combo} />{/each}
					</dt>
					<dd>{action}</dd>
				{/each}
			</dl>
		</section>
	{/each}

	<section>
		<h3>Mouse</h3>
		<dl>
			{#each MOUSE as [input, action]}
				<dt class="mouse">{input}</dt>
				<dd>{action}</dd>
			{/each}
		</dl>
	</section>

	<p class="note">
		Shortcuts pause while you type a name and while this menu is open (Ctrl+S and Ctrl+Shift+S
		work everywhere); Cmd works for Ctrl on a Mac.
	</p>
</div>

<style>
	.keys-menu {
		display: flex;
		flex-direction: column;
		gap: 1em;
		min-width: min(32em, 80vw);
		max-width: 40em;
		text-align: left;
	}

	h3 {
		margin: 0 0 0.4em;
		font-size: 0.75em;
		text-transform: uppercase;
		opacity: 0.7;
	}

	dl {
		display: grid;
		grid-template-columns: minmax(10em, max-content) 1fr; /* one key column width in every section */
		gap: 0.35em 1.2em;
		margin: 0;
		font-size: 0.85em;
	}

	dt {
		white-space: nowrap;
	}

	dt.mouse {
		opacity: 0.85;
	}

	dd {
		margin: 0;
		opacity: 0.8;
	}

	.or {
		margin: 0 0.35em;
		opacity: 0.5;
	}

	.note {
		margin: 0;
		padding: 0;
		font-size: 0.75em;
		opacity: 0.6;
	}
</style>
