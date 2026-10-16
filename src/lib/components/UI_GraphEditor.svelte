<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-16
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Graph editor toolbar (bottom left): zoom in/out toward the screen center, fit graph,
	// transpose (switch the direction left-to-right / top-to-bottom and turn the layout; the icon's
	// strong arrow is the current direction), dot grid on / off,
	// add node at the screen center, open graph (opens the Esc menu), export (download) and a
	// test pan button. Hover hints show each button's key in [brackets], drawn as key caps
	// by AssistanceMsg. Camera changes go through $lib/camera.ts; export is dispatched to
	// the page.
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	import { screenSizeIndex, assistanceMsg, colorMode, menuOpen, menuTab } from '../../stores/imge_main';
	import { ZOOM_STEP, camera, panBy, zoomAt } from '$lib/camera';
	import { createNodeAt, graph, setDirection, measureNodeSizes, showDotGrid } from '$lib/graph/store';

	// dot grid on / off (a display setting, remembered in this browser)
	const toggleDotGrid = () => {
		showDotGrid.update((shown) => !shown);
		handleMouseOver($showDotGrid ? 'Dot grid shown' : 'Dot grid hidden');
	};
	import type { Direction } from '$lib/graph/types';

	// transpose: switch between left-to-right and top-to-bottom; the layout turns around node centres
	$: direction = $graph.metadata.direction;
	let nextDirection: Direction;
	$: nextDirection = direction === 'top-to-bottom' ? 'left-to-right' : 'top-to-bottom';
	const transpose = () => {
		const target = nextDirection;
		const sizes = measureNodeSizes();
		graph.update((g) => setDirection(g, target, sizes));
		handleMouseOver(`Direction: ${target}`);
	};

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

	// opening graphs (folder or upload) lives in the Esc menu's Config tab, see GraphEditorMenu.svelte
	const openGraphMenu = () => {
		menuTab.set('config');
		menuOpen.set(true);
	};

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
		on:mouseenter={() => handleMouseOver('Zoom In [+]')}
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
		on:mouseenter={() => handleMouseOver('Zoom Out [-]')}
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
		on:mouseenter={() => handleMouseOver('Add Node [Shift+A] at mouse')}
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
		on:mouseenter={() => handleMouseOver('Fit Graph [Home]')}
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

	<!-- Transpose: the current direction is drawn strong, the other faded -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={transpose}
		on:keydown={(event) => event.key === 'Enter' && transpose()}
		on:mouseenter={() => handleMouseOver(`Transpose to ${nextDirection}`)}
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
			<!-- vertical double arrow (top-to-bottom) -->
			<g opacity={direction === 'top-to-bottom' ? 1 : 0.35}>
				<path d="M12 3v18M8.5 6.5 12 3l3.5 3.5M8.5 17.5 12 21l3.5-3.5" />
			</g>
			<!-- horizontal arrows on both sides, with a gap around the vertical one (left-to-right) -->
			<g opacity={direction === 'top-to-bottom' ? 0.35 : 1}>
				<path d="M3 12h6M6 9l-3 3 3 3M15 12h6M18 9l3 3-3 3" />
			</g>
		</svg>
	</div>

	<!-- Dot grid on / off: dots in perspective; shown = strong at the bottom fading up, hidden = all faded -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={toggleDotGrid}
		on:keydown={(event) => event.key === 'Enter' && toggleDotGrid()}
		on:mouseenter={() => handleMouseOver($showDotGrid ? 'Hide Dot Grid' : 'Show Dot Grid')}
		on:mouseleave={handleMouseLeave}
	>
		<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none">
			<g opacity="0.3">
				<circle cx="8" cy="6.5" r="1.3" /><circle cx="12" cy="6.5" r="1.3" /><circle cx="16" cy="6.5" r="1.3" />
			</g>
			<g opacity={$showDotGrid ? 0.6 : 0.3}>
				<circle cx="6.2" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="17.8" cy="12" r="1.5" />
			</g>
			<g opacity={$showDotGrid ? 1 : 0.3}>
				<circle cx="4.3" cy="17.8" r="1.7" /><circle cx="12" cy="17.8" r="1.7" /><circle cx="19.7" cy="17.8" r="1.7" />
			</g>
		</svg>
	</div>

	<!-- Import Graph -->
	<div
		class="access-function"
		role="button"
		tabindex="0"
		on:click={openGraphMenu}
		on:keydown={(event) => event.key === 'Enter' && openGraphMenu()}
		on:mouseenter={() => handleMouseOver('Open Graph [Esc]')}
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
		on:mouseenter={() => handleMouseOver('Download Graph [Ctrl+Shift+S]')}
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
