<script lang="ts">
	// a square with dotted guides running out of its corners; off = guides faded
	export let on = true;
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...$$restProps}>
	<rect x="9" y="9" width="6" height="6" fill="none" stroke="currentColor" stroke-width="2" />
	<g fill="currentColor" opacity={on ? 1 : 0.3}>
		<!-- guides above and below the corners -->
		<circle cx="9" cy="3.5" r="1.1" /><circle cx="9" cy="6.2" r="1.1" />
		<circle cx="15" cy="3.5" r="1.1" /><circle cx="15" cy="6.2" r="1.1" />
		<circle cx="9" cy="17.8" r="1.1" /><circle cx="9" cy="20.5" r="1.1" />
		<circle cx="15" cy="17.8" r="1.1" /><circle cx="15" cy="20.5" r="1.1" />
		<!-- guides left and right of the corners -->
		<circle cx="3.5" cy="9" r="1.1" /><circle cx="6.2" cy="9" r="1.1" />
		<circle cx="3.5" cy="15" r="1.1" /><circle cx="6.2" cy="15" r="1.1" />
		<circle cx="17.8" cy="9" r="1.1" /><circle cx="20.5" cy="9" r="1.1" />
		<circle cx="17.8" cy="15" r="1.1" /><circle cx="20.5" cy="15" r="1.1" />
	</g>
</svg>
