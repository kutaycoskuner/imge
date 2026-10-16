<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-16), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-16
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Light / dark theme toggle button: shows the moon in dark mode and the sun in light mode
	// (icons from $lib/icons) and switches the theme in $lib/ColorTheme.svelte on click.
	import { fly } from 'svelte/transition';
	import { theme } from '$lib/ColorTheme.svelte';
	import IconMoon from '$lib/icons/icon-moon.svelte';
	import IconSun from '$lib/icons/icon-sun.svelte';

	let currentTheme: string;
	// Subscribe to the theme store
	theme.themeStore.subscribe((value) => {
		currentTheme = value;
	});
</script>

<button class="ncolor-mode" on:click={theme.toggle} aria-label="Toggle theme">
	{#if currentTheme === 'dark'}
		<div class="dark-mode">
			<IconMoon />
		</div>
	{:else}
		<div class="light-mode">
			<IconSun />
		</div>
	{/if}
</button>

<style>
	button {
		all: unset; /* Reset all styles */
		cursor: pointer; /* Ensure it's still clickable */
		align-items: center;
	}

	.ncolor-mode {
		position: fixed;
		top: 0.5rem;
		right: 0.5rem;
		width: 1.4rem;
		height: 1.4rem;
		z-index: 20;
		cursor: pointer;
		-webkit-touch-callout: none;
		user-select: none;
	}
</style>
