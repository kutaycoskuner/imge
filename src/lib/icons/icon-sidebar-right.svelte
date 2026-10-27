<script lang="ts">
	// a window with a column docked on its right side; off = the column is only outlined
	export let on = true;
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...$$restProps}>
	<rect x="3" y="4" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2" />
	<line x1="14" y1="4" x2="14" y2="20" stroke="currentColor" stroke-width="2" />
	<rect x="15" y="5" width="5" height="14" fill="currentColor" opacity={on ? 0.9 : 0} />
</svg>
