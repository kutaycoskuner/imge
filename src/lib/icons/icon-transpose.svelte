<script lang="ts">
	// vertical double arrow (top-to-bottom) and horizontal arrows on both sides of it
	// (left-to-right); the current direction is drawn strong, the other faded
	export let direction: 'left-to-right' | 'top-to-bottom' = 'left-to-right';
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {...$$restProps}>
	<g opacity={direction === 'top-to-bottom' ? 1 : 0.35}>
		<path d="M12 3v18M8.5 6.5 12 3l3.5 3.5M8.5 17.5 12 21l3.5-3.5" />
	</g>
	<!-- gap around the vertical arrow -->
	<g opacity={direction === 'top-to-bottom' ? 0.35 : 1}>
		<path d="M3 12h6M6 9l-3 3 3 3M15 12h6M18 9l3 3-3 3" />
	</g>
</svg>
