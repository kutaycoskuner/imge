<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import BasicNavigation from '$lib/components/BasicNavigation.svelte';
	import SettingsOverlay from '$lib/components/SettingsOverlay.svelte';
	// import LeftHoverNavigation from '$lib/components/LeftHoverNavigation.svelte';
	import Toggle from '$lib/components/ThemeChanger.svelte';
	import CoordTracker from '$lib/components/CoordTracker.svelte';
	// import UIAccessibility from '$lib/components/UIAccessibility.svelte';
	let { children } = $props();
</script>

<Toggle />
<BasicNavigation />
<!-- <UIAccessibility /> -->
<!-- <SettingsOverlay /> -->
<CoordTracker />


{@render children()}

<!-- <Left	HoverNavigation /> -->
