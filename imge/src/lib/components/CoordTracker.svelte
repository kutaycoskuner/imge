<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import {
		coordsBaseXOffset,
		coordsBaseYOffset,
		coordsStateXOffset,
		coordsStateYOffset
	} from '../../stores/imge_main'; // Assuming you have a Svelte store

	// State
	let x = $state(0);
	let y = $state(0);

	// Computed values
	const offsetX = $derived($coordsBaseXOffset || 0);
	const offsetY = $derived($coordsBaseYOffset || 0);
	const stateoffsetX = $derived($coordsStateXOffset || 0);
	const stateoffsetY = $derived($coordsStateYOffset || 0);

	// Function to update mouse position relative to the center of the screen
	const updateMousePosition = (event: MouseEvent) => {
		x = (event.clientX - offsetX + stateoffsetX);
		y = -(event.clientY - offsetY - stateoffsetY);
	};

	// Calculate the initial offset (center of the screen)
	const calculateBaseOffset = () => {
		if (browser) {
			coordsBaseXOffset.update(n => window.innerWidth / 2);
			coordsBaseYOffset.update(n => window.innerHeight / 2);
		}
	};

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;
		calculateBaseOffset();
		window.addEventListener('mousemove', updateMousePosition);
		window.addEventListener('resize', calculateBaseOffset);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('mousemove', updateMousePosition);
		window.removeEventListener('resize', calculateBaseOffset);
	});
</script>

<div class="mouse-tracker">
	<div class="coordinates">
		x: {x}, y: {y}
	</div>
</div>

<style>
	.mouse-tracker {
		user-select: none;
		position: fixed;
		bottom: 1em;
		right: 1em;
		background-color: var(--bg);
		color: var(--col);
		padding: 5px 10px;
		border-radius: 4px;
		font-family: Arial, sans-serif;
		font-size: 14px;
		z-index: 1000;
		opacity: 0.8;
	}

	.coordinates {
		pointer-events: none;
	}
</style>
