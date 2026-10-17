<script lang="ts">
	// three rows of dots in perspective; on = strong at the bottom fading up, off = all faded
	export let on = true;
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...$$restProps}>
	<g opacity="0.3">
		<circle cx="8" cy="6.5" r="1.3" /><circle cx="12" cy="6.5" r="1.3" /><circle cx="16" cy="6.5" r="1.3" />
	</g>
	<g opacity={on ? 0.6 : 0.3}>
		<circle cx="6.2" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="17.8" cy="12" r="1.5" />
	</g>
	<g opacity={on ? 1 : 0.3}>
		<circle cx="4.3" cy="17.8" r="1.7" /><circle cx="12" cy="17.8" r="1.7" /><circle cx="19.7" cy="17.8" r="1.7" />
	</g>
</svg>
