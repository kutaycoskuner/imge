<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-26
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Saved tab of the graph editor's Esc menu (registered by routes/+page.svelte, next
	// to Config, Examples and Keybindings): graphs saved in this browser (localStorage).
	// On top: save the open graph here under a name (its name here, its file's name or the
	// next default name until the user types another; a name already saved asks to save over
	// it); from then on Save (Ctrl+S) and autosave write it here. Below: the saved graphs,
	// last saved first, each with its node count and save date, and open / save over / rename
	// / download / delete; the open one is marked. At the bottom: save them all as a folder on
	// the computer (Chrome, Edge) or as that folder in a .zip (other browsers). Opening a
	// graph closes the menu. All actions: $lib/graph/file-access.ts, list rules:
	// $lib/graph/browser-graphs.ts. Details: docs/graph-saving.md, "Saved in this browser".
	import {
		workspace,
		browserGraphs,
		suggestedBrowserName,
		saveToBrowser,
		openBrowserGraph,
		saveOverBrowserGraph,
		renameBrowserGraph,
		deleteBrowserGraph,
		downloadBrowserGraph,
		saveAllBrowserGraphsAsFolder,
		setAutosave
	} from '$lib/graph/file-access';
	import { sortedBrowserGraphs, nodeCount, MAX_BROWSER_GRAPHS } from '$lib/graph/browser-graphs';
	import { menuOpen } from '../../stores/imge_main';

	// the name to save under: empty shows the suggestion, which a save uses
	let name = '';
	$: w = $workspace;
	$: suggestion = suggestedBrowserName($browserGraphs, w);
	$: list = sortedBrowserGraphs($browserGraphs);

	function save(): void {
		if (saveToBrowser(name)) name = '';
	}

	function open(id: string): void {
		if (openBrowserGraph(id)) menuOpen.set(false);
	}

	const DATE = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	const when = (iso: string) => (iso ? DATE.format(new Date(iso)) : '');

	// each saved graph's actions: label, hover text, what it does
	const ACTIONS: { label: string; title: string; run: (id: string) => unknown }[] = [
		{ label: 'open', title: 'Open this graph (asks first if the open one has unsaved changes)', run: open },
		{ label: 'save over', title: 'Save the open graph over this one; Save then writes here', run: saveOverBrowserGraph },
		{ label: 'rename', title: 'Rename it', run: renameBrowserGraph },
		{ label: 'download', title: 'Download it as .json, without opening it', run: downloadBrowserGraph },
		{ label: 'delete', title: 'Delete it from this browser', run: deleteBrowserGraph }
	];
</script>

<div class="saved-menu">
	<section>
		<h3>Save the open graph in this browser</h3>
		<form class="row" on:submit|preventDefault={save}>
			<!-- left empty, the shown suggestion is used -->
			<input class="name" aria-label="Name to save under" placeholder={suggestion} bind:value={name} maxlength="120" />
			<button class="action" type="submit">Save in browser</button>
		</form>
		<p class="note">
			{#if w.browserId}
				The open graph is saved here: Save (Ctrl+S){w.autosave ? ' and autosave write' : ' writes'} into it.
			{:else}
				Saved here, Save (Ctrl+S) writes it back here instead of to a file.
			{/if}
		</p>
		<label class="row toggle">
			<input type="checkbox" checked={w.autosave} on:change={(e) => setAutosave(e.currentTarget.checked)} />
			<span>Autosave a moment after each change (here, or to the open file in a folder)</span>
		</label>
	</section>

	<section>
		<h3>Graphs in this browser ({list.length}/{MAX_BROWSER_GRAPHS})</h3>
		{#if list.length}
			<ul class="list">
				{#each list as entry (entry.id)}
					<li class:current={entry.id === w.browserId}>
						<div class="head">
							<button class="entry-name" title="Open this graph" on:click={() => open(entry.id)}>{entry.name}</button>
							{#if entry.id === w.browserId}<span class="badge">open{w.dirty ? ' • unsaved changes' : ''}</span>{/if}
						</div>
						<span class="note">{nodeCount(entry.graph)} {nodeCount(entry.graph) === 1 ? 'node' : 'nodes'} · saved {when(entry.savedAt)}</span>
						<div class="row actions">
							{#each ACTIONS as act}
								<button class="small" class:danger={act.label === 'delete'} title={act.title} on:click={() => act.run(entry.id)}>{act.label}</button>
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="note">No graphs saved in this browser yet. Save the open graph above.</p>
		{/if}
	</section>

	<section>
		<h3>On your computer</h3>
		<div class="row">
			<button class="action" disabled={!list.length} on:click={saveAllBrowserGraphsAsFolder}>
				{w.supported ? 'Save all as a folder…' : 'Download all as a folder (.zip)'}
			</button>
		</div>
		<p class="note">
			{#if w.supported}
				Pick where: a new folder "imge-graphs-&lt;date&gt;" is made there with every graph above as its own .json file.
			{:else}
				This browser can't write folders, so the folder "imge-graphs-&lt;date&gt;" with every graph above as its own
				.json file comes as a .zip download; unzip it.
			{/if}
			One graph: <strong>download</strong> above, or the Config tab's folder and Save as.
		</p>
		<p class="note">
			Graphs saved here stay in this browser only (this device, this browser); clearing the site's data removes them.
			Storage is small (about 5 MB), so pictures in image nodes fill it quickly.
		</p>
	</section>

	{#if w.status}<p class="status">{w.status}</p>{/if}
</div>

<style>
	.saved-menu {
		display: flex;
		flex-direction: column;
		gap: 1.2em;
		min-width: min(32em, 80vw);
		max-width: 40em;
		text-align: left;
	}

	h3 {
		margin: 0 0 0.5em;
		font-size: 0.75em;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.6em;
		margin-bottom: 0.4em;
	}

	.note,
	.status {
		margin: 0;
		padding: 0;
		font-size: 0.8em;
		opacity: 0.7;
	}

	.status {
		opacity: 1;
	}

	/* buttons are reset globally (settings_overlay.css), so they get their look here */
	.action,
	.small {
		cursor: pointer;
		padding: 0.3em 0.8em;
		border: 1px solid var(--col-border);
		border-radius: 4px;
		font-size: 0.85em;
		user-select: none;
	}

	.small {
		padding: 0.1em 0.5em;
		font-size: 0.75em;
	}

	.action:hover,
	.small:hover {
		border-color: var(--col);
	}

	.small.danger:hover {
		border-color: #ff3e00;
		color: #ff3e00;
	}

	.action:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.name {
		font: inherit;
		font-size: 0.85em;
		color: var(--col);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--col-border);
		outline: none;
		padding: 0.2em 0;
		min-width: 14em;
		flex: 1;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7em;
		max-height: 18em;
		overflow-y: auto;
	}

	.list li {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
		padding-left: 0.6em;
		border-left: 2px solid transparent;
	}

	.list li.current {
		border-left-color: var(--col-selected, #ffa033);
	}

	.head {
		display: flex;
		align-items: baseline;
		gap: 0.6em;
	}

	.entry-name {
		cursor: pointer;
		font-weight: 600;
	}

	.entry-name:hover {
		color: var(--col-selected, #ffa033);
	}

	.badge {
		font-size: 0.75em;
		opacity: 0.7;
	}

	.actions {
		margin: 0.2em 0 0;
	}

	/* undo the overlay's global dashed "upload" label style for this checkbox label */
	.toggle {
		cursor: pointer;
		font-size: 0.85em;
		border: none;
		padding: 0;
		text-transform: none;
		font-style: normal;
		opacity: 1;
	}
</style>
