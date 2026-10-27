<script lang="ts">
	// a window with a prompt (>_); on = the window filled faintly (text view shown)
	export let on = false;
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...$$restProps}>
	<rect x="3" y="4.5" width="18" height="15" rx="2" fill="currentColor" fill-opacity={on ? 0.25 : 0} />
	<path d="M7 9.5 L10 12 L7 14.5" />
	<path d="M12 15 H16.5" />
</svg>
