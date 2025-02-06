<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { imgeState } from '../../stores/imge_bank'; // Assuming you have a Svelte store

	// State
	const imState = imgeState();
	let x = $state(0);
	let y = $state(0);

	// Computed values
	const offsetX = $derived(imState.get_coordsBaseXOffset() || 0);
	const offsetY = $derived(imState.get_coordsBaseYOffset() || 0);
	const stateoffsetX = $derived(imState.get_coordsStateXOffset() || 0);
	const stateoffsetY = $derived(imState.get_coordsStateYOffset() || 0);

	// Function to update mouse position relative to the center of the screen
	const updateMousePosition = (event: MouseEvent) => {
		x = event.clientX - offsetX - stateoffsetX;
		y = -(event.clientY - offsetY - stateoffsetY);
	};

	// Calculate the initial offset (center of the screen)
	const calculateBaseOffset = () => {
		if (browser) {
			imState.set_coordsBaseXOffset(window.innerWidth / 2);
			imState.set_coordsBaseYOffset(window.innerHeight / 2);
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