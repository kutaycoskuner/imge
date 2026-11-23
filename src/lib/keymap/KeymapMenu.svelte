<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-23
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Config tab of the keyboard layout page's Esc menu (registered by
	// routes/keyboard_layout/+page.svelte, next to Saved, Examples and How to use): the
	// profile switch (the saved layouts; picking one opens it, and the open layout's changes
	// go into the active profile; save the open layout as a new profile), the layout file (new,
	// open a file, download) and the keyboard: its shape (ANSI / ISO, stored in the layout),
	// numpad shown, labels from the user's own layout (view settings, kept in this browser).
	// The menu closes when a layout opens from a file or as new; it stays open on a switch.
	import { menuOpen } from '../../stores/imge_main';
	import { keymap, view, layoutMap, status, savedLayouts, activeProfile, openSavedLayout, saveOpenLayout, newKeymap, pickKeymapFile, downloadKeymap } from './store';
	import { setMetadata, PHYSICAL, type Physical } from './keymap';
	import { sortedSaved } from './saved';

	$: profiles = sortedSaved($savedLayouts);

	// the switch: picking a profile opens it; if the user keeps the open layout (asked when
	// it is in no profile), the switch shows the active one again
	function switchProfile(event: Event & { currentTarget: HTMLSelectElement }): void {
		const select = event.currentTarget;
		if (!select.value || !openSavedLayout(select.value)) select.value = $activeProfile ?? '';
	}

	function saveAsProfile(): void {
		const name = prompt('Save the open layout as a profile named:', $keymap.metadata.name);
		if (name !== null) saveOpenLayout(name);
	}

	const SHAPES: Record<Physical, string> = {
		ansi: 'ANSI (US): wide left Shift, \\ above Enter',
		iso: 'ISO (Europe, e.g. Turkish Q, German): extra key left of Z, tall Enter'
	};
	const close = (opened: boolean) => opened && menuOpen.set(false);
</script>

<div class="keymap-menu">
	<section>
		<h3>Profile</h3>
		<div class="row">
			<select class="choice profile" aria-label="Profile" value={$activeProfile ?? ''} on:change={switchProfile}>
				{#if !$activeProfile}<option value="">{$keymap.metadata.name} (not saved as a profile)</option>{/if}
				{#each profiles as profile (profile.id)}
					<option value={profile.id}>{profile.name} · {profile.keymap.data.bindings.length} bindings</option>
				{/each}
			</select>
			<button class="action" on:click={saveAsProfile}>Save as new profile…</button>
		</div>
		<p class="note">
			{#if $activeProfile}
				Changes are saved into this profile as you make them; pick another to switch. Rename, download or delete
				profiles in the <strong>Saved</strong> tab.
			{:else if profiles.length}
				The open layout is in no profile: save it as one to keep it, or pick a profile to switch to it.
			{:else}
				No profiles yet: save the open layout as one, then make more (new layout, examples, files) and switch
				between them here.
			{/if}
		</p>
	</section>

	<section>
		<h3>Layout</h3>
		<div class="row">
			<button class="action" on:click={() => close(newKeymap())}>New layout</button>
			<button class="action" on:click={async () => close(await pickKeymapFile())}>Open a file…</button>
			<button class="action" on:click={() => downloadKeymap()}>Download .json</button>
		</div>
		<p class="note">
			New, an example or a file opens outside the profiles (the active profile keeps what it holds). Profiles stay
			in this browser only: <strong>download</strong> a layout to keep a copy elsewhere or to share it. A layout file
			(.json) can also be <strong>dragged and dropped</strong> anywhere on the page. Open, save and download are in
			the toolbar at the bottom left too.
		</p>
	</section>

	<section>
		<h3>Keyboard</h3>
		<div class="row">
			<span>Shape</span>
			<select class="choice" value={$keymap.metadata.physical} on:change={(e) => keymap.update((m) => setMetadata(m, { physical: e.currentTarget.value as Physical }))}>
				{#each PHYSICAL as shape}<option value={shape}>{SHAPES[shape]}</option>{/each}
			</select>
		</div>
		<label class="row toggle"><input type="checkbox" bind:checked={$view.numpad} /> Numpad</label>
		<label class="row toggle">
			<input type="checkbox" bind:checked={$view.ownLabels} disabled={!$layoutMap} />
			Key labels from my keyboard layout
			<span class="note">{$layoutMap ? '' : '(this browser doesn’t tell it: US labels; Chrome and Edge do)'}</span>
		</label>
	</section>

	{#if $status}<p class="status">{$status}</p>{/if}
</div>

<style>
	.keymap-menu {
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

	/* buttons are reset globally (settings_overlay.css), so their look is set here */
	.action {
		font: inherit;
		color: var(--col);
		background: none;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.2em 0.6em;
		cursor: pointer;
	}

	.action:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	.choice {
		font: inherit;
		color: var(--col);
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		max-width: 100%;
	}

	.choice.profile {
		min-width: 18em;
		padding: 0.2em 0.3em;
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
