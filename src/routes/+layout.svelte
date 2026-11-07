<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { ANALYTICS } from '$lib/site';
	import BasicNavigation from '$lib/components/BasicNavigation.svelte';
	import IconButtons from '$lib/components/IconButtons.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	// import LeftHoverNavigation from '$lib/components/LeftHoverNavigation.svelte';
	import Toggle from '$lib/components/ThemeChanger.svelte';

	// import UIAccessibility from '$lib/components/UIAccessibility.svelte';
	let { children } = $props();

		onMount(() => {
		// setTimeout(() => {
		// 	if (typeof window.MathJax !== 'undefined') {
		// 		window.MathJax.typesetPromise();
		// 	} else {
		// 		console.warn('MathJax object not found. Ensure the script loaded correctly.');
		// 	}
		// }, 750); // Increased delay
	});
</script>

<svelte:head>
	<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg-full.js"></script>
	<!-- analytics (archrium): counts visits on the live site only (data-domains, $lib/site.ts);
	     none in the keyboard build, the server adds its own -->
	{#if ANALYTICS}
		<script defer src={ANALYTICS.script} data-website-id={ANALYTICS.websiteId} data-domains={ANALYTICS.domain}></script>
	{/if}
</svelte:head>

<Toggle />
<!-- <Toggle /> -->
<IconButtons />
<BasicNavigation />
<SettingsOverlay />
<!-- <LeftHoverNavigation /> -->


{@render children()}
