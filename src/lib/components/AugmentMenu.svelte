<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-11-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Augment control of the graph editor (routes/+page.svelte): a button at the right end
	// of the top bar, set a little apart from the theme toggle, that opens a dropdown:
	// choose an augmentation (logic that makes the graph do something: Gravity, Arithmetic),
	// read what it does, see the open graph tested against its checks (each with what it
	// found), and start it once every check passes; while it runs, its state and Stop (gravity:
	// Revert and stop, or Keep layout and stop). One runs
	// at a time: starting one stops the other. Opening another graph stops it. Augmentations as
	// data: $lib/graph/augmentations.ts; runners: $lib/graph/gravity-run.ts,
	// arithmetic-run.ts. Details: docs/graph-augmentations.md
	import { onDestroy } from 'svelte';
	import { graph } from '$lib/graph/store';
	import { workspace } from '$lib/graph/file-access';
	import { AUGMENTATIONS, augmentation, runChecks, allPass } from '$lib/graph/augmentations';
	import { gravityOn, gravityMoving, startGravity, stopGravity } from '$lib/graph/gravity-run';
	import { arithmeticOn, startArithmetic, stopArithmetic } from '$lib/graph/arithmetic-run';

	// each augmentation's start and stop, by id
	const RUNNERS: Record<string, { start: () => unknown; stop: () => void }> = {
		gravity: { start: startGravity, stop: stopGravity },
		arithmetic: { start: startArithmetic, stop: stopArithmetic }
	};
	const stopAll = () => Object.values(RUNNERS).forEach((r) => r.stop());

	let open = false;
	let chosen = AUGMENTATIONS[0].id;
	$: aug = augmentation(chosen)!;
	// the one running now, if any
	$: runningId = $gravityOn ? 'gravity' : $arithmeticOn ? 'arithmetic' : null;
	$: running = runningId === chosen;
	// tested live while the dropdown is open, so a fix in the graph shows at once
	$: results = open ? runChecks(aug, $graph) : [];
	$: ready = allPass(results);

	// another graph opened (file, example, graph node ...): the augmentation belongs to the old one
	let loads = $workspace.loads;
	$: if ($workspace.loads !== loads) {
		loads = $workspace.loads;
		stopAll();
	}
	onDestroy(stopAll);

	function toggleRun(): void {
		if (running) RUNNERS[chosen].stop();
		else if (ready) {
			stopAll();
			RUNNERS[chosen].start();
		}
	}
</script>

<div class="augment">
	<button
		type="button"
		class="augment-button"
		class:running={!!runningId}
		aria-expanded={open}
		aria-haspopup="true"
		title="Augmentations: logic that makes the graph do something"
		on:click={() => (open = !open)}
	>
		{#if runningId}<span class="pulse" class:still={runningId !== 'gravity' || !$gravityMoving}></span> {augmentation(runningId)?.title.toLowerCase()}{:else}augment{/if}
		<span class="caret">{open ? '▴' : '▾'}</span>
	</button>

	{#if open}
		<div class="augment-panel" role="dialog" aria-label="Augmentations">
			<label class="row">
				<span class="label">Augmentation</span>
				<select class="choice" bind:value={chosen}>
					{#each AUGMENTATIONS as a (a.id)}<option value={a.id}>{a.title}</option>{/each}
				</select>
			</label>
			<p class="description">{aug.description}</p>

			<h4>Checks on the open graph</h4>
			<ul class="checks">
				{#each results as r (r.id)}
					<li class:fail={!r.ok}>
						<span class="mark">{r.ok ? '✓' : '✗'}</span>
						<span class="title">{r.title}</span>
						<span class="detail">{r.detail}</span>
					</li>
				{/each}
			</ul>

			<div class="row actions">
				{#if running && chosen === 'gravity'}
					<!-- gravity moves the nodes: stopping says whether to keep that or put them back -->
					<button type="button" class="action stop" title="Every node back where it was before gravity started" on:click={() => stopGravity('revert')}>
						Revert and stop
					</button>
					<button type="button" class="action" title="Stop and keep the new layout (Ctrl+Z after that puts the old one back)" on:click={() => stopGravity('keep')}>
						Keep layout and stop
					</button>
				{:else}
					<button type="button" class="action" class:stop={running} disabled={!running && !ready} on:click={toggleRun}>
						{running ? `Stop ${aug.title.toLowerCase()}` : `Start ${aug.title.toLowerCase()}`}
					</button>
				{/if}
			</div>
			<div class="row">
				<span class="state">
					{#if running && chosen === 'gravity'}
						{$gravityMoving ? 'moving…' : 'settled; drag a dot to stir it'}
					{:else if running}
						results shown beside the nodes, live
					{:else if !ready}
						fix the failed checks to start
					{:else if runningId}
						starting it stops {augmentation(runningId)?.title.toLowerCase()}
					{/if}
				</span>
			</div>
			{#if running && chosen === 'gravity'}
				<p class="description">
					<strong>Revert</strong> puts every node back where it was before gravity started; <strong>Keep layout</strong> leaves the new
					one (Ctrl+Z after that still puts the old one back: the whole run is one step).
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* the right end of the top bar, left of the theme toggle (fixed at right 0.5rem), with a
	   gap and a faint divider between them */
	.augment {
		position: fixed;
		top: 0.45rem;
		right: 3.4rem;
		z-index: 60;
		font-family: var(--main-font, monospace);
	}

	.augment::after {
		content: '';
		position: absolute;
		right: -1.1rem;
		top: 0.2rem;
		bottom: 0.2rem;
		border-right: 1px solid var(--col-border);
	}

	/* buttons are reset globally (settings_overlay.css), so they get their look here */
	.augment-button {
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		padding: 0.2em 0.7em;
		font-size: 0.8rem;
		border: 1px solid var(--col-border);
		border-radius: 4px;
		background: var(--bg);
		color: var(--col);
		user-select: none;
	}

	.augment-button:hover,
	.augment-button.running {
		border-color: var(--col-selected);
	}

	.caret {
		opacity: 0.6;
		font-size: 0.8em;
	}

	/* a softly beating dot while gravity moves, still once settled */
	.pulse {
		width: 0.5em;
		height: 0.5em;
		border-radius: 50%;
		background: var(--col-selected);
		animation: pulse 1s ease-in-out infinite;
	}

	.pulse.still {
		animation: none;
		opacity: 0.6;
	}

	@keyframes pulse {
		50% {
			opacity: 0.3;
		}
	}

	.augment-panel {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		width: 22rem;
		max-width: calc(100vw - 2rem);
		padding: 0.8rem 0.9rem;
		background: var(--bg);
		color: var(--col);
		border: 1px solid var(--col-border);
		border-radius: 4px;
		box-shadow: var(--box-shadow-small);
		font-size: 0.8rem;
		text-align: left;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}

	/* Revert and stop / Keep layout and stop side by side, wrapping on a narrow panel */
	.actions {
		flex-wrap: wrap;
		margin-bottom: 0.4em;
	}

	.label {
		opacity: 0.7;
	}

	.choice {
		flex: 1;
		font: inherit;
		color: var(--col);
		background: var(--bg);
		border: 1px solid var(--col-border);
		border-radius: 4px;
		padding: 0.15em 0.3em;
	}

	.description {
		margin: 0.6em 0;
		line-height: 1.45;
		opacity: 0.8;
	}

	h4 {
		margin: 0.6em 0 0.3em;
		font-size: 0.9em;
		text-transform: uppercase;
		opacity: 0.7;
	}

	.checks {
		list-style: none;
		margin: 0 0 0.7em;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25em;
	}

	.checks li {
		display: grid;
		grid-template-columns: 1.2em 1fr;
		column-gap: 0.2em;
	}

	.mark {
		color: #30a46c;
	}

	.fail .mark,
	.fail .title {
		color: #e5484d;
	}

	.detail {
		grid-column: 2;
		opacity: 0.6;
		font-size: 0.9em;
	}

	.action {
		cursor: pointer;
		padding: 0.25em 0.8em;
		border: 1px solid var(--col-border);
		border-radius: 4px;
	}

	.action:hover:not(:disabled) {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	.action.stop {
		border-color: var(--col-selected);
	}

	.action:disabled {
		opacity: 0.4;
		cursor: default;
	}

	.state {
		opacity: 0.7;
	}
</style>
