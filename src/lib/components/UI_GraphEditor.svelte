<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Graph editor toolbar (bottom left): zoom in/out toward the screen center, fit graph,
	// add node at the screen center, open graph (opens the Esc menu), export (download) and a
	// test pan button.
	// Camera changes go through $lib/camera.ts; export is dispatched to the page.
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	import { screenSizeIndex, assistanceMsg, colorMode, menuOpen } from '../../stores/imge_main';
	import { ZOOM_STEP, camera, panBy, zoomAt } from '$lib/camera';
	import { createNodeAt } from '$lib/graph/store';

	const dispatch = createEventDispatcher();
	// Access store variables
	$: _screenSizeIndex = $screenSizeIndex;
	$: _assistanceMsg = $assistanceMsg;
	$: _colorMode = $colorMode;

	// Lifecycle hooks
	onMount(() => {
		if (!browser) return;
		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		if (!browser) return;
		window.removeEventListener('keydown', handleKeydown);
	});

	// Event handlers
	const handleKeydown = (event: KeyboardEvent) => {};

	// Mouseover event handlers
	const handleMouseOver = (message: string) => {
		assistanceMsg.update(() => message);
	};

	const handleMouseLeave = () => {
		assistanceMsg.update(() => '');
	};

	// Zoom functions
	const zoomIn = () => zoomAt(ZOOM_STEP);

	const zoomOut = () => zoomAt(1 / ZOOM_STEP);

	const exportGraph = () => {
		dispatch('requestExport');
	};

	// opening graphs (folder or upload) lives in the Esc menu, see GraphEditorMenu.svelte
	const openGraphMenu = () => menuOpen.set(true);

	// moves the canvas 10 px to the right
	const test = () => panBy(10, 0);

	// Emit events (fitToScreen and addNode)

	// fitting needs the rendered node sizes, so the page does it
	const fitToScreen = () => dispatch('requestFit');

	// the camera's x/y is the world point at the screen center
	const addNode = () => createNodeAt({ x: $camera.x, y: $camera.y });
</script>

<!-- Template -->
<div class="access-wrapper">
	<!-- Zoom In -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={zoomIn}
		on:keydown={(event) => event.key === 'Enter' && zoomIn()}
		on:mouseenter={() => handleMouseOver('Zoom In')}
		on:mouseleave={handleMouseLeave}
	>
		<svg
			class="w-6 h-6 text-gray-800 dark:text-white"
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M5 12h14m-7 7V5"
			/>
		</svg>
	</div>

	<!-- Zoom Out -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={zoomOut}
		on:keydown={(event) => event.key === 'Enter' && zoomOut()}
		on:mouseenter={() => handleMouseOver('Zoom Out')}
		on:mouseleave={handleMouseLeave}
	>
		<svg
			class="w-6 h-6 text-gray-800 dark:text-white"
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M5 12h14"
			/>
		</svg>
	</div>

	<!-- Add Node -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={addNode}
		on:keydown={(event) => event.key === 'Enter' && addNode()}
		on:mouseenter={() => handleMouseOver('Add Node (Shift+A at mouse)')}
		on:mouseleave={handleMouseLeave}
	>
		<svg
			class="w-6 h-6 text-gray-800 dark:text-white"
			aria-hidden="true"
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			fill="none"
			viewBox="0 0 24 24"
		>
			<path
				stroke="currentColor"
				stroke-linecap="round"
				stroke-width="2"
				d="M7.926 10.898 15 7.727m-7.074 5.39L15 16.29M8 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm12 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm0-11a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
			/>
		</svg>
	</div>

	<!-- Fit to Screen -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={fitToScreen}
		on:keydown={(event) => event.key === 'Enter' && fitToScreen()}
		on:mouseenter={() => handleMouseOver('Fit Graph')}
		on:mouseleave={handleMouseLeave}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path
				d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"
			/>
		</svg>
	</div>

	<!-- Import Graph -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={openGraphMenu}
		on:keydown={(event) => event.key === 'Enter' && openGraphMenu()}
		on:mouseenter={() => handleMouseOver('Open Graph (Esc menu)')}
		on:mouseleave={handleMouseLeave}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M18 15l-6-6-6 6" />
		</svg>
	</div>

	<!-- Export Graph -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={exportGraph}
		on:keydown={(event) => event.key === 'Enter' && exportGraph()}
		on:mouseenter={() => handleMouseOver('Export Graph')}
		on:mouseleave={handleMouseLeave}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M6 9l6 6 6-6" />
		</svg>
	</div>

	<!-- Test -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={test}
		on:keydown={(event) => event.key === 'Enter' && test()}
		on:mouseenter={() => handleMouseOver('test button')}
		on:mouseleave={handleMouseLeave}
	>
		<div>T</div>
	</div>
</div>

<!-- Styles -->
<style>
	.access-wrapper {
		display: grid;
		grid-template-columns: 1;
		grid-template-rows: repeat(auto, 1fr);
		grid-gap: 2px;
		position: fixed;
		bottom: 4em;
		left: 1em;
		z-index: 30;
	}

	.access-function {
		display: flex;
		width: 1.2em;
		height: 1.2em;
		padding: 0.2em;
		justify-content: center;
		align-items: center;
		text-align: center;
		background: var(--bg);
		border-radius: 4px;
		user-select: none;
		cursor: pointer;
	}

	.access-function svg {
		width: 100%;
		height: 100%;
		opacity: 0.8;
	}

	@media (max-width: 480px) {
	}

	@media (min-width: 481px) and (max-width: 1024px) {
	}

	@media (min-width: 1025px) {
	}
</style>
