<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Graph editor toolbar (bottom left): zoom in/out toward the screen center, fit graph,
	// transpose (switch the direction left-to-right / top-to-bottom and turn the layout; the icon's
	// strong arrow is the current direction), dot grid on / off, snap to grid on / off, port
	// look (filled -> hollow -> hidden -> filled), Properties panel on / off,
	// add node at the screen center, open graph (opens the Esc menu), export (download) and
	// export as image (a flyout with PNG / JPG / SVG, $lib/graph/export-image.ts). Hover hints show each button's key in [brackets], drawn as key caps
	// by AssistanceMsg. Camera changes go through $lib/camera.ts; export is dispatched to
	// the page. The buttons are a data list (`buttons`); their icons live in $lib/icons.
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	import { screenSizeIndex, assistanceMsg, colorMode, menuOpen, menuTab } from '../../stores/imge_main';
	import { ZOOM_STEP, camera, zoomAt } from '$lib/camera';
	import { exportGraphImage, type ImageFormat } from '$lib/graph/export-image';
	import {
		createNodeAt,
		graph,
		setDirection,
		measureNodeSizes,
		showDotGrid,
		snapToGrid,
		showPropertiesPanel,
		portLook,
		PORT_LOOKS
	} from '$lib/graph/store';

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
	// port look: filled -> hollow -> hidden -> filled (display only, like the Esc menu's Ports choice)
	$: nextPortLook = PORT_LOOKS[(PORT_LOOKS.indexOf($portLook) + 1) % PORT_LOOKS.length];
	const cyclePortLook = () => {
		portLook.set(nextPortLook);
		handleMouseOver(`Ports ${$portLook}${$portLook === 'hidden' ? ' (shown on hover)' : ''}`);
	};
	// Properties panel on / off (also N and the panel's own chevron; remembered in this browser)
	const toggleProperties = () => {
		showPropertiesPanel.update((shown) => !shown);
		handleMouseOver($showPropertiesPanel ? 'Properties panel shown [N]' : 'Properties panel hidden [N]');
	};
	import type { Direction } from '$lib/graph/types';
	import IconPlus from '$lib/icons/icon-plus.svelte';
	import IconMinus from '$lib/icons/icon-minus.svelte';
	import IconAddNode from '$lib/icons/icon-add-node.svelte';
	import IconFit from '$lib/icons/icon-fit.svelte';
	import IconTranspose from '$lib/icons/icon-transpose.svelte';
	import IconDotGrid from '$lib/icons/icon-dot-grid.svelte';
	import IconSnap from '$lib/icons/icon-snap.svelte';
	import IconNodePorts from '$lib/icons/icon-node-ports.svelte';
	import IconSidebarRight from '$lib/icons/icon-sidebar-right.svelte';
	import IconChevronUp from '$lib/icons/icon-chevron-up.svelte';
	import IconChevronDown from '$lib/icons/icon-chevron-down.svelte';
	import IconImage from '$lib/icons/icon-image.svelte';

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

	// Export as image: the button opens a flyout with the formats (as data); a choice downloads
	// the whole graph as that image and closes the flyout; a click elsewhere closes it too
	const IMAGE_FORMATS: { format: ImageFormat; label: string; hint: string }[] = [
		{ format: 'png', label: 'PNG', hint: 'Picture, 2x size, transparent background' },
		{ format: 'jpg', label: 'JPG', hint: 'Picture, 2x size, with the theme background' },
		{ format: 'svg', label: 'SVG', hint: 'Vector (shapes and text), transparent background' }
	];
	let imageMenuOpen = false;
	const toggleImageMenu = () => (imageMenuOpen = !imageMenuOpen);

	async function exportImage(format: ImageFormat): Promise<void> {
		imageMenuOpen = false;
		try {
			const name = await exportGraphImage(format);
			handleMouseOver(name ? `Exported ${name}` : 'Nothing to export: the graph is empty');
		} catch (error) {
			handleMouseOver(`Could not export the image: ${(error as Error).message}`);
		}
	}

	function closeImageMenu(event: MouseEvent): void {
		if (imageMenuOpen && !(event.target as Element).closest('.image-export')) imageMenuOpen = false;
	}

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
		flyout?: boolean; // opens the image formats next to it
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
		{
			id: 'ports',
			icon: IconNodePorts,
			iconProps: { look: $portLook },
			hint: `Ports ${$portLook}: switch to ${nextPortLook}`,
			action: cyclePortLook
		},
		{
			id: 'properties',
			icon: IconSidebarRight,
			iconProps: { on: $showPropertiesPanel },
			hint: $showPropertiesPanel ? 'Hide Properties [N]' : 'Show Properties [N]',
			action: toggleProperties
		},
		{ id: 'open', icon: IconChevronUp, hint: 'Open Graph [Esc]', action: openGraphMenu },
		{ id: 'download', icon: IconChevronDown, hint: 'Download Graph [Ctrl+Shift+S]', action: exportGraph },
		{ id: 'image', icon: IconImage, hint: 'Export as Image (PNG / JPG / SVG)', action: toggleImageMenu, flyout: true }
	];
</script>

<!-- Template: one button per toolbar entry -->
<div class="access-wrapper">
	{#each buttons as button (button.id)}
		<div
			class="access-function"
			class:image-export={button.flyout}
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
			{#if button.flyout && imageMenuOpen}
				<!-- the formats, to the right of the button; clicks here don't reach the button -->
				<div class="image-flyout" role="menu" tabindex="-1" on:click|stopPropagation on:keydown|stopPropagation>
					{#each IMAGE_FORMATS as option (option.format)}
						<button
							role="menuitem"
							title={option.hint}
							on:click={() => exportImage(option.format)}
							on:mouseenter={() => handleMouseOver(`Export as ${option.label}: ${option.hint}`)}
						>
							{option.label}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>

<svelte:window on:click={closeImageMenu} />

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

	/* the image formats, beside the toolbar's image button */
	.image-export {
		position: relative;
	}

	.image-flyout {
		position: absolute;
		left: calc(100% + 6px);
		top: 50%;
		transform: translateY(-50%);
		display: flex;
		gap: 3px;
		padding: 3px;
		background: var(--bg);
		border: 1px solid color-mix(in srgb, var(--col) 20%, transparent);
		border-radius: 4px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
	}

	/* buttons are reset globally (settings_overlay.css), so the look is set here */
	.image-flyout button {
		font: inherit;
		font-size: 0.75em;
		color: var(--col);
		background: none;
		border: 1px solid color-mix(in srgb, var(--col) 25%, transparent);
		border-radius: 3px;
		padding: 0.15em 0.5em;
		cursor: pointer;
	}

	.image-flyout button:hover {
		border-color: var(--col-selected);
		color: var(--col-selected);
	}

	@media (max-width: 480px) {
	}

	@media (min-width: 481px) and (max-width: 1024px) {
	}

	@media (min-width: 1025px) {
	}
</style>
