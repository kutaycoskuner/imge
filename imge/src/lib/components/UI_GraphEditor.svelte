<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import {
		screenSizeIndex,
		zoomLevel,
		assistanceMsg,
		colorMode,
		coordsStateXOffset,
		coordsStateYOffset
	} from '../../stores/imge_main';

	// Access store variables
	$: _screenSizeIndex = $screenSizeIndex;
	$: _zoomLevel = $zoomLevel;
	$: _assistanceMsg = $assistanceMsg;
	$: _colorMode = $colorMode;

	// Define min and max zoom levels
	const MIN_ZOOM_LEVEL = 0.04;
	const MAX_ZOOM_LEVEL = 4;

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
	const zoomIn = () => {
		zoomLevel.update((level) => {
			const newLevel = level + 0.1;
			return newLevel > MAX_ZOOM_LEVEL ? MAX_ZOOM_LEVEL : newLevel;
		});
	};

	const zoomOut = () => {
		zoomLevel.update((level) => {
			const newLevel = level - 0.1;
			return newLevel < MIN_ZOOM_LEVEL ? MIN_ZOOM_LEVEL : newLevel;
		});
	};

	const test = () => {
		coordsStateXOffset.update((n: number) => n - 10);
	};

	// Emit events (fitToScreen and addNode)

	const fitToScreen = () => {
		coordsStateXOffset.update((n: number) => 0);
		coordsStateYOffset.update((n: number) => 0);
		zoomLevel.update((n: number) => 1);
	};

	const addNode = () => {
		//   dispatch('addNode');
	};
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
		on:mouseenter={() => handleMouseOver('Zoom In' )}
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
		on:mouseenter={() => handleMouseOver('Add Node')}
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
		on:mouseenter={() => handleMouseOver('Reset View')}
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
		class="access-function not-selected"
		role="button"
		tabindex="0"
		on:keydown={(event) => event.key === 'Enter' && handleMouseOver('Import Graph')}
		on:mouseenter={() => handleMouseOver('Import Graph')}
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
		class="access-function not-selected"
		role="button"
		tabindex="0"
		on:keydown={(event) => event.key === 'Enter' && handleMouseOver('Export Graph')}
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
		on:keydown={(event) => event.key === 'Enter' && fitToScreen()}
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
		bottom: 2em;
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
