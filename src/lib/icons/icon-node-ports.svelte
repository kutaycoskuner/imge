<script lang="ts">
	// a node box with a port square on its left and right edge, drawn in the port look:
	// filled = solid squares, hollow = outlined squares (the page background inside, so the
	// box edge doesn't show through), hidden = no squares (box only)
	export let look: 'filled' | 'hollow' | 'hidden' = 'filled';
</script>

<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...$$restProps}>
	<rect x="5" y="7" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.8" />
	{#if look !== 'hidden'}
		{#each [1.5, 16.5] as x}
			<rect
				{x}
				y="8.5"
				width="6"
				height="7"
				rx="0.8"
				style="fill: {look === 'filled' ? 'currentColor' : 'var(--bg, white)'}"
				stroke="currentColor"
				stroke-width={look === 'filled' ? 0 : 1.6}
			/>
		{/each}
	{/if}
</svg>
