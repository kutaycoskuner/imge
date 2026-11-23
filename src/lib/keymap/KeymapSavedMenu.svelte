<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-23
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Saved tab of the keyboard layout page's Esc menu (registered by
	// routes/keyboard_layout/+page.svelte): the profiles, layouts saved in this browser
	// ("loadouts") to switch between (also in the Config tab's switch). On top: save the open
	// layout as a profile under a name (a name already saved offers to save over it). Below:
	// the profiles, last saved first, each with what it holds and when it was saved, and
	// switch / save over / rename / download / delete; the active one (which takes the open
	// layout's changes) is marked. Switching closes the menu. Rules: ./saved.ts, storing and
	// questions: ./store.ts.
	import { menuOpen } from '../../stores/imge_main';
	import {
		keymap,
		status,
		savedLayouts,
		activeProfile,
		saveOpenLayout,
		openSavedLayout,
		saveOverSavedLayout,
		renameSavedLayout,
		deleteSavedLayout,
		downloadSavedLayout
	} from './store';
	import { sortedSaved, MAX_SAVED } from './saved';

	// the name to save under: the open layout's name until the user types another
	let name = '';
	let typed = false;
	$: if (!typed) name = $keymap.metadata.name;

	$: list = sortedSaved($savedLayouts);

	function save(): void {
		if (saveOpenLayout(name)) typed = false;
	}

	function open(id: string): void {
		if (openSavedLayout(id)) menuOpen.set(false);
	}

	const DATE = new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
	const when = (iso: string) => (iso ? DATE.format(new Date(iso)) : '');

	// the row's actions: label, hover text, what it does
	const ACTIONS: { label: string; title: string; run: (id: string) => unknown }[] = [
		{ label: 'switch', title: 'Switch to this profile (the active one keeps its changes)', run: open },
		{ label: 'save over', title: 'Save the open layout over this profile and make it active', run: saveOverSavedLayout },
		{ label: 'rename', title: 'Rename this profile', run: renameSavedLayout },
		{ label: 'download', title: 'Download this layout as .json, without opening it', run: downloadSavedLayout },
		{ label: 'delete', title: 'Delete it from this browser', run: deleteSavedLayout }
	];
</script>

<div class="saved-menu">
	<section>
		<h3>Save the open layout as a profile</h3>
		<form class="row" on:submit|preventDefault={save}>
			<input class="name" aria-label="Name to save under" bind:value={name} on:input={() => (typed = true)} maxlength="80" />
			<button class="action" type="submit">Save as profile</button>
		</form>
	</section>

	<section>
		<h3>Profiles in this browser ({list.length}/{MAX_SAVED})</h3>
		{#if list.length}
			<ul class="list">
				{#each list as entry (entry.id)}
					<li class:current={entry.id === $activeProfile}>
						<div class="head">
							<button class="entry-name" title="Switch to this profile" on:click={() => open(entry.id)}>{entry.name}</button>
							{#if entry.id === $activeProfile}<span class="badge">active: changes go here</span>{/if}
						</div>
						<span class="note">
							{entry.keymap.data.bindings.length} bindings · {entry.keymap.metadata.physical.toUpperCase()} · saved {when(entry.savedAt)}
						</span>
						<div class="row actions">
							{#each ACTIONS as act}
								<button class="small" class:danger={act.label === 'delete'} title={act.title} on:click={() => act.run(entry.id)}>{act.label}</button>
							{/each}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="note">No profiles yet. Save the open layout above, then switch between profiles here or in the Config tab.</p>
		{/if}
	</section>

	<p class="note">
		The active profile takes every change of the open layout. Profiles stay in this browser only (this device, this
		browser); clearing the site's data removes them.
		<strong>Download</strong> a layout to keep it elsewhere or to share it.
	</p>

	{#if $status}<p class="status">{$status}</p>{/if}
</div>

<style>
	.saved-menu {
		display: flex;
		flex-direction: column;
		gap: 1em;
		text-align: left;
		min-width: min(36em, 100%);
		max-width: 40em; /* readable lines, as the graph editor's menu tabs */
	}

	h3 {
		margin: 0 0 0.4em;
		font-size: 0.8em;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		opacity: 0.7;
	}

	.row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5em;
		margin: 0.3em 0;
		font-size: 0.85em;
	}

	.name {
		font: inherit;
		color: var(--col);
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.5em;
		min-width: 16em;
		flex: 1;
	}

	/* buttons are reset globally (settings_overlay.css), so their look is set here */
	.action,
	.small {
		font: inherit;
		color: var(--col);
		background: none;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.6em;
		cursor: pointer;
	}

	.small {
		font-size: 0.85em;
		padding: 0.1em 0.5em;
	}

	.action:hover,
	.small:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	.small.danger:hover {
		border-color: #ff3e00;
		color: #ff3e00;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.7em;
	}

	.list li {
		display: flex;
		flex-direction: column;
		gap: 0.15em;
		padding-left: 0.6em;
		border-left: 2px solid transparent;
	}

	.list li.current {
		border-left-color: var(--col-selected);
	}

	.head {
		display: flex;
		align-items: baseline;
		gap: 0.6em;
	}

	.entry-name {
		font: inherit;
		font-weight: 600;
		color: var(--col);
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		text-align: left;
	}

	.entry-name:hover {
		color: var(--col-selected);
	}

	.badge {
		font-size: 0.7em;
		opacity: 0.7;
	}

	.actions {
		margin: 0.2em 0 0;
	}

	.note,
	.status {
		margin: 0;
		font-size: 0.75em;
		opacity: 0.6;
	}

	.status {
		opacity: 1;
	}
</style>
