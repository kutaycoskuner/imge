<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Shows the world coordinates under the mouse (x right, y down, whole units). Derived
	// from the camera, so a spot on the canvas shows the same numbers at every zoom and
	// the display also updates when the view moves under a still mouse.
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { camera, viewport, screenToWorld } from '$lib/camera';

	// mouse position in screen px
	let mouseX = $state(0);
	let mouseY = $state(0);

	const world = $derived(screenToWorld({ x: mouseX, y: mouseY }, $camera, $viewport));
	// `|| 0` turns -0 into 0
	const x = $derived(Math.round(world.x) || 0);
	const y = $derived(Math.round(world.y) || 0);

	const updateMousePosition = (event: MouseEvent) => {
		mouseX = event.clientX;
		mouseY = event.clientY;
	};

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;
		window.addEventListener('mousemove', updateMousePosition);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('mousemove', updateMousePosition);
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
