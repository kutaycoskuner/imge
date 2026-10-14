<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The graph editor's Esc menu (registered by routes/+page.svelte): point it at a folder
	// on the computer (edit folder, remember it or remove the saved folder), see the imge
	// graphs in it by name and open one with a click, save / save as, optional autosave.
	// Chrome and Edge read and write the folder; Firefox and Safari can only read it, so
	// saving downloads the file there. All actions and state live in $lib/graph/file-access.ts.
	import {
		workspace,
		chooseFolder,
		chooseFolderReadOnly,
		rememberFolder,
		reopenRememberedFolder,
		forgetFolder,
		openFile,
		save,
		saveAs,
		setAutosave,
		uploadGraph
	} from '$lib/graph/file-access';

	let saveAsName = '';
	$: w = $workspace;
	$: hasFolder = !!w.folder || w.readOnly;
	$: pickFolder = w.supported ? chooseFolder : chooseFolderReadOnly;
</script>

<div class="graph-menu">
	<!-- folder -->
	<section>
		<h3>Folder</h3>
		{#if hasFolder}
			<div class="row">
				<span class="value">{w.folderName}</span>
				{#if w.readOnly}<span class="note">(read only)</span>{/if}
				<button class="action" on:click={pickFolder}>Edit folder…</button>
				{#if w.rememberedName}
					<button class="action subtle" on:click={forgetFolder}>Remove saved folder</button>
				{/if}
			</div>
		{:else if w.rememberedName}
			<div class="row">
				<button class="action" on:click={reopenRememberedFolder}>Reopen "{w.rememberedName}"</button>
				<button class="action" on:click={pickFolder}>Edit folder…</button>
				<button class="action subtle" on:click={forgetFolder}>Remove saved folder</button>
			</div>
		{:else}
			<div class="row">
				<button class="action" on:click={pickFolder}>Choose folder…</button>
				<span class="note">The imge graphs in it are listed below.</span>
			</div>
		{/if}

		{#if !w.supported}
			<p class="note">
				This browser can only read a folder: graphs open from it, but saving downloads the file
				(put it back into the folder), and the folder isn't remembered. Chrome and Edge save into
				the folder directly.
			</p>
		{/if}

		{#if w.askRemember}
			<div class="row ask">
				<span>Remember this folder for next time?</span>
				<button class="action" on:click={() => rememberFolder(true)}>Yes</button>
				<button class="action subtle" on:click={() => rememberFolder(false)}>No</button>
			</div>
			<p class="note">
				Kept in this browser only (like a cookie, but in its folder storage); the browser asks
				once to allow access again next time. "Remove saved folder" deletes it.
			</p>
		{/if}
	</section>

	{#if hasFolder}
		<!-- graphs -->
		<section>
			<h3>Graphs in this folder</h3>
			{#if w.files.length === 0}
				<p class="note">No imge graphs here yet.{#if w.folder} Save one below.{/if}</p>
			{:else}
				<ul class="files">
					{#each w.files as entry (entry.fileName)}
						<li>
							<button
								class="file"
								class:current={entry.fileName === w.fileName}
								title={entry.fileName}
								on:click={() => openFile(entry.fileName)}
							>
								<span class="file-name">{entry.name}</span>
								<span class="file-meta">{entry.nodes} {entry.nodes === 1 ? 'node' : 'nodes'}</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			{#if w.skipped > 0}
				<p class="note">
					{w.skipped} other .json {w.skipped === 1 ? 'file' : 'files'} in this folder
					{w.skipped === 1 ? "isn't an imge graph" : "aren't imge graphs"} and {w.skipped === 1
						? 'is'
						: 'are'} not listed.
				</p>
			{/if}
		</section>

		<!-- save -->
		<section>
			<h3>Save</h3>
			<div class="row">
				<span class="value">
					{w.fileName?.replace(/\.json$/i, '') ?? 'not saved yet'}{#if w.dirty}<span class="dirty">
							• unsaved changes</span
						>{/if}
				</span>
				<button class="action" disabled={!w.fileName} on:click={save}>
					{w.folder ? 'Save' : 'Save (download)'}
				</button>
			</div>
			<form class="row" on:submit|preventDefault={() => saveAs(saveAsName)}>
				<input class="name" placeholder="graph name" bind:value={saveAsName} />
				<button class="action" type="submit">{w.folder ? 'Save as' : 'Save as (download)'}</button>
			</form>
			{#if w.folder}
				<label class="row toggle">
					<input
						type="checkbox"
						checked={w.autosave}
						on:change={(e) => setAutosave(e.currentTarget.checked)}
					/>
					<span>Autosave to the open file a moment after each change</span>
				</label>
			{/if}
		</section>
	{/if}

	{#if !w.supported}
		<div class="row">
			<button class="action subtle" on:click={uploadGraph}>Open a single file…</button>
		</div>
	{/if}

	{#if w.status}
		<p class="status">{w.status}</p>
	{/if}
</div>

<style>
	.graph-menu {
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

	.value {
		font-weight: 600;
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

	.dirty {
		font-weight: normal;
		color: var(--col-selected, #ffa033);
	}

	/* buttons are reset globally (settings_overlay.css), so they get their look here */
	.action,
	.file {
		cursor: pointer;
		padding: 0.3em 0.8em;
		border: 1px solid var(--col-border);
		border-radius: 4px;
		font-size: 0.85em;
		user-select: none;
	}

	.action:hover,
	.file:hover {
		border-color: var(--col);
	}

	.action:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.subtle {
		border-color: transparent;
		opacity: 0.7;
	}

	.files {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3em;
		max-height: 12em;
		overflow-y: auto;
	}

	.file {
		display: flex;
		justify-content: space-between;
		gap: 2em;
		border-color: transparent;
	}

	.file.current {
		border-color: var(--col-selected, #ffa033);
	}

	.file-meta {
		opacity: 0.6;
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
		min-width: 12em;
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
