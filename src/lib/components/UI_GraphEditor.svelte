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
	// strong arrow is the current direction), dot grid on / off, snap to grid on / off,
	// add node at the screen center, open graph (opens the Esc menu), export (download) and a
	// test pan button. Hover hints show each button's key in [brackets], drawn as key caps
	// by AssistanceMsg. Camera changes go through $lib/camera.ts; export is dispatched to
	// the page. The buttons are a data list (`buttons`); their icons live in $lib/icons.
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	import { screenSizeIndex, assistanceMsg, colorMode, menuOpen, menuTab } from '../../stores/imge_main';
	import { ZOOM_STEP, camera, panBy, zoomAt } from '$lib/camera';
	import { createNodeAt, graph, setDirection, measureNodeSizes, showDotGrid, snapToGrid } from '$lib/graph/store';

	// dot grid on / off (a display setting, remembered in this browser)
	const toggleDotGrid = () => {
		showDotGrid.update((shown) => !shown);
		handleMouseOver($showDotGrid ? 'Dot grid shown' : 'Dot grid hidden');
	};
	// snap to grid on / off (a display setting like the dot grid; Alt+drag moves freely either way)
	const toggleSnap = () => {
		snapToGrid.update((on) => !on);
		handleMouseOver($snapToGrid ? 'Snapping on' : 'Snapping off');
	};
	import type { Direction } from '$lib/graph/types';
	import IconPlus from '$lib/icons/icon-plus.svelte';
	import IconMinus from '$lib/icons/icon-minus.svelte';
	import IconAddNode from '$lib/icons/icon-add-node.svelte';
	import IconFit from '$lib/icons/icon-fit.svelte';
	import IconTranspose from '$lib/icons/icon-transpose.svelte';
	import IconDotGrid from '$lib/icons/icon-dot-grid.svelte';
	import IconSnap from '$lib/icons/icon-snap.svelte';
	import IconChevronUp from '$lib/icons/icon-chevron-up.svelte';
	import IconChevronDown from '$lib/icons/icon-chevron-down.svelte';

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

	// Toolbar entries, top to bottom: data only (icon, hover hint, action); the template
	// renders them all the same way. Stateful icons get their state through iconProps.
	type ToolbarButton = {
		id: string;
		hint: string;
		action: () => void;
		icon?: typeof IconPlus;
		iconProps?: Record<string, unknown>;
		text?: string; // shown instead of an icon
	};
	let buttons: ToolbarButton[];
	$: buttons = [
		{ id: 'zoom-in', icon: IconPlus, hint: 'Zoom In [+]', action: zoomIn },
		{ id: 'zoom-out', icon: IconMinus, hint: 'Zoom Out [-]', action: zoomOut },
		{ id: 'add-node', icon: IconAddNode, hint: 'Add Node [Shift+A] at mouse', action: addNode },
		{ id: 'fit', icon: IconFit, hint: 'Fit Graph [Home]', action: fitToScreen },
		{ id: 'transpose', icon: IconTranspose, iconProps: { direction }, hint: `Transpose to ${nextDirection}`, action: transpose },
		{
			id: 'dot-grid',
			icon: IconDotGrid,
			iconProps: { on: $showDotGrid },
			hint: $showDotGrid ? 'Hide Dot Grid' : 'Show Dot Grid',
			action: toggleDotGrid
		},
		{
			id: 'snap',
			icon: IconSnap,
			iconProps: { on: $snapToGrid },
			hint: $snapToGrid ? 'Turn Snapping Off' : 'Turn Snapping On',
			action: toggleSnap
		},
		{ id: 'open', icon: IconChevronUp, hint: 'Open Graph [Esc]', action: openGraphMenu },
		{ id: 'download', icon: IconChevronDown, hint: 'Download Graph [Ctrl+Shift+S]', action: exportGraph },
		{ id: 'test', text: 'T', hint: 'test button', action: test }
	];
</script>

<!-- Template: one button per toolbar entry -->
<div class="access-wrapper">
	{#each buttons as button (button.id)}
		<div
			class="access-function"
			role="button"
			tabindex="0"
			on:click={button.action}
			on:keydown={(event) => event.key === 'Enter' && button.action()}
			on:mouseenter={() => handleMouseOver(button.hint)}
			on:mouseleave={handleMouseLeave}
		>
			{#if button.icon}
				<svelte:component this={button.icon} {...button.iconProps} />
			{:else}
				<div>{button.text}</div>
			{/if}
		</div>
	{/each}
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

	/* the icons are their own components (src/lib/icons), so their svg is styled globally */
	.access-function :global(svg) {
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
