<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-23
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The How to use tab of the keyboard layout page's Esc menu (registered by
	// routes/keyboard_layout/+page.svelte): short instructions by topic (keys, layers,
	// categories and the list, files: drag and drop, download, kept and saved in the browser; the
	// toolbar and the menu), in the look of the graph editor's Keybindings tab. Key caps are
	// drawn by Kbd. The full description is docs/keyboard-layout.md, "Using it" and "Files"
	// (keep both in step).
	import Kbd from '$lib/components/Kbd.svelte';

	// each row: what you do (key caps or words) and what happens
	type Row = { keys?: string[]; input?: string; text: string };
	const HELP: { section: string; rows: Row[] }[] = [
		{
			section: 'Keys',
			rows: [
				{ input: 'Click a key', text: 'Select it; the editor under the keyboard shows it in every layer' },
				{ input: 'Press a key', text: 'Select it too, on your own keyboard; its field takes your typing' },
				{ input: 'Type, then Enter', text: 'What the key does in that layer; an empty field or × removes it' },
				{ keys: ['Shift+W'], text: 'A key pressed with modifiers selects it in that layer (here: Shift)' }
			]
		},
		{
			section: 'Layers',
			rows: [
				{ input: 'Click a chip', text: 'Show a layer: No modifier, Shift, Ctrl, Alt, Ctrl+Shift … (8 in all)' },
				{ keys: ['Shift', 'Ctrl', 'Alt'], text: 'Hold modifiers to see their layer while they are held' },
				{ input: 'S C A in a corner', text: 'The key is used in other layers too: Shift, Ctrl, Alt (CS = Ctrl+Shift …)' }
			]
		},
		{
			section: 'Categories and list',
			rows: [
				{ input: 'Categories', text: 'Name and colour per category (+ adds one); keys take their category’s colour' },
				{ input: 'All bindings', text: 'Every binding, grouped by category; search by action, key or modifier ("shift w")' },
				{ input: 'Click the title', text: 'Rename the layout' }
			]
		},
		{
			section: 'Files',
			rows: [
				{ input: 'Kept in the browser', text: 'The open layout stays here between visits, but only in this browser' },
				{ input: 'Profiles', text: 'Several layouts under names, e.g. one per game; the active one takes every change by itself' },
				{ input: 'Switch profile', text: 'The Profile list at the top of Config; nothing is lost when switching' },
				{ input: 'Save as profile', text: 'The toolbar’s disk button, Config or the Saved tab; the open layout becomes that profile' },
				{ input: 'Saved tab', text: 'All profiles: switch, save over, rename, download or delete each one' },
				{ input: 'Download', text: 'Saves the layout as a .json file, to keep a copy outside this browser or to share it (toolbar ↓, Config or Saved)' },
				{ input: 'Drag and drop', text: 'Drop a layout .json anywhere on the page to open it (a dashed frame shows while dragging)' },
				{ input: 'Open a file', text: 'Pick a layout .json from your computer (toolbar ↑ or Config)' },
				{ input: 'New / examples', text: 'Start empty (Config) or from an example (Examples); they open outside the profiles, the active profile keeps what it holds' }
			]
		},
		{
			section: 'Toolbar and menu',
			rows: [
				{ keys: ['Esc'], text: 'Open or close this menu (click the Esc key on the keyboard to bind it)' },
				{ input: 'Gear (bottom left)', text: 'Open this menu; hover a toolbar button to see what it does' }
			]
		}
	];
</script>

<div class="help-menu">
	{#each HELP as group}
		<section>
			<h3>{group.section}</h3>
			<dl>
				{#each group.rows as row}
					<dt class:words={!row.keys}>
						{#if row.keys}
							{#each row.keys as combo, i}{#if i > 0}<span class="or">/</span>{/if}<Kbd keys={combo} />{/each}
						{:else}
							{row.input}
						{/if}
					</dt>
					<dd>{row.text}</dd>
				{/each}
			</dl>
		</section>
	{/each}

	<p class="note">
		Keys the browser keeps for itself (Ctrl+W, Ctrl+T, Ctrl+N, F11) can’t be pressed into the page: click them on the
		keyboard instead. Keys pressed while this menu is open aren’t bound.
	</p>
</div>

<style>
	.help-menu {
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
		grid-template-columns: minmax(10em, max-content) 1fr; /* one first-column width in every section */
		gap: 0.35em 1.2em;
		margin: 0;
		font-size: 0.85em;
	}

	dt {
		white-space: nowrap;
	}

	dt.words {
		opacity: 0.85;
	}

	dd {
		margin: 0;
	}

	.or {
		margin: 0 0.3em;
		opacity: 0.5;
	}

	.note {
		margin: 0;
		font-size: 0.75em;
		opacity: 0.6;
	}
</style>
