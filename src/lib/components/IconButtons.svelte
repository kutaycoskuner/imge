<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-16), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-16
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Bottom-left bar on every page (from +layout.svelte): links to the GitHub repository and
	// other projects with a hover tooltip, then the site's version and last update.
	// The version comes from package.json and the last update is the build date, both set
	// in vite.config.ts (__APP_VERSION__, __BUILD_DATE__); bump package.json for a release.
	import { base } from '$app/paths';
	import * as config from '$lib/config';

	import GithubIcon from '$lib/icons/icon-github.svelte';
	import ThreeIcon from '$lib/icons/icon-three.js.svelte';
	import FourCubesIcon from '$lib/icons/icon-four_cubes.svelte';

	let tooltipText = '';
	let showTooltip = false;

	const version = __APP_VERSION__;
	const lastUpdate = __BUILD_DATE__;
</script>

<nav>
	<div class="icon-container">
		<div class="icon-group">
			<a
				href="https://github.com/kutaycoskuner/imge"
				target="_blank"
				rel="noopener noreferrer"
				class="icon-button"
				on:mouseenter={() => {
					tooltipText = 'to github repository';
					showTooltip = true;
				}}
				on:mouseleave={() => {
					tooltipText = '';
					showTooltip = false;
				}}
			>
				<GithubIcon />
			</a>

			<a
				href="https://kutaycoskuner.github.io/port/computer_science"
				target="_blank"
				rel="noopener noreferrer"
				class="icon-button"
				on:mouseenter={() => {
					tooltipText = 'other projects';
					showTooltip = true;
				}}
				on:mouseleave={() => {
					tooltipText = '';
					showTooltip = false;
				}}
			>
				<FourCubesIcon />
			</a>

			<!-- <a
				href="https://threejs.org/"
				target="_blank"
				rel="noopener noreferrer"
				class="icon-button"
				on:mouseenter={() => {
					tooltipText = 'three.js';
					showTooltip = true;
				}}
				on:mouseleave={() => {
					tooltipText = '';
					showTooltip = false;
				}}
			>
				<ThreeIcon />
			</a> -->

			{#if showTooltip}
				<div class="tooltip-text">
					{tooltipText}
				</div>
			{:else}
				<div class="version">v{version} · last update {lastUpdate}</div>
			{/if}
		</div>
	</div>
</nav>

<style>
	nav {
		position: fixed;
		margin: 0;
		bottom: 0;
		left: 0;
		z-index: 90;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.nav-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.nav-links a {
		color: var(--col);
		text-decoration: none;
		font-size: 0.5rem;
	}

	.nav-links a:hover {
		text-decoration: underline;
	}

	.icon-container {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.icon-group {
		display: flex;
		flex-direction: row;
	}

	.icon-button {
		padding-left: 0.5rem;
		padding-bottom: 0.5rem;
		background: transparent;
		cursor: pointer;
		transition: all 0.2s ease;
		color: var(--col);
		text-decoration: none;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.8;
	}

	.icon-button:hover {
		opacity: 1;
		transform: scale(1.1);
	}

	.icon-button :global(svg) {
		width: 1.2rem;
		height: 1.2rem;
	}

	/* in the tooltip's place while no icon is hovered, quieter than the icons */
	.version {
		padding-left: 1rem;
		padding-bottom: 0.5rem;
		display: flex;
		align-items: center;
		font-size: 0.7rem;
		opacity: 0.5;
		user-select: none;
		white-space: nowrap;
	}

	.tooltip-text {
		padding-left: 1rem;
		position: relative;
		bottom: 0;
		/* ... */
		display: flex;
		align-items: center;
		z-index: 100; /* good */
	}
</style>
