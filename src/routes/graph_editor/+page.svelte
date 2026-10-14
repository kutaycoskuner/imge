<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Graph editor page: loads the test graph (upgraded to the current format version by
	// $lib/graph/migrations.ts), renders its nodes on an endless canvas and handles panning
	// (drag empty space), node dragging and wheel zoom toward the cursor.
	// All world <-> screen math lives in $lib/camera.ts; see docs/graph-editor-canvas.md.
	import PolkaDots from '$lib/components/PolkaDots.svelte';
	import OriginAxes from '$lib/components/OriginAxes.svelte';
	import UI_GraphEditor from '$lib/components/UI_GraphEditor.svelte';
	import CoordTracker from '$lib/components/CoordTracker.svelte';
	import AssistanceMsg from '$lib/components/AssistanceMsg.svelte';
	import { onMount } from 'svelte';
	import { camera, viewport, panBy, zoomAt, trackViewport } from '$lib/camera';
	import { migrateGraph, stampCurrentVersion, CURRENT_GRAPH_VERSION } from '$lib/graph/migrations';

	// exp() turns wheel delta into a smooth factor for both mouse wheels and trackpads
	const WHEEL_ZOOM_SPEED = 0.0015;

	let jsonData: Record<string, any> = {};

	let isPanningSpace: boolean = false;
	let isDraggingNode: boolean = false;
	let selectedNode: any = null;

	// last mouse position in screen px; moves are applied as deltas from it
	let lastX: number = 0,
		lastY: number = 0;

	// Mouse event functions
	// -----------------------------------------------------------------------------------
	function handleMouseDown(event: MouseEvent): void {
		if (event.button !== 0) return;
		const target = event.target as HTMLElement;
		const nodeElement = target.closest('.node') as HTMLElement | null;

		lastX = event.clientX;
		lastY = event.clientY;

		if (!nodeElement) {
			isPanningSpace = true;
		} else {
			moveNodeStart(nodeElement);
		}
	}

	function handleMouseMove(event: MouseEvent): void {
		if (!isPanningSpace && !isDraggingNode) return;

		const dx = event.clientX - lastX;
		const dy = event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;

		if (isPanningSpace) panBy(dx, dy);
		else moveNode(dx, dy);
	}

	function handleMouseUp(): void {
		isPanningSpace = false;
		isDraggingNode = false;
	}

	function handleWheel(event: WheelEvent): void {
		zoomAt(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), { x: event.clientX, y: event.clientY });
	}

	// Move node
	// -----------------------------------------------------------------------------------
	function moveNodeStart(nodeElement: HTMLElement): void {
		isDraggingNode = true;
		selectedNode = jsonData.data.nodes.find((n: any) => n._id == nodeElement.dataset.id);
	}

	function moveNode(dxScreen: number, dyScreen: number): void {
		if (!selectedNode) return;

		// screen px -> world units, so the node stays under the mouse at any zoom;
		// y is subtracted because screen y grows down and world y grows up
		selectedNode.position.x += dxScreen / $camera.zoom;
		selectedNode.position.y -= dyScreen / $camera.zoom;

		// reactivity
		jsonData = { ...jsonData, data: { ...jsonData.data, nodes: [...jsonData.data.nodes] } };
	}

	// import export functions
	// -----------------------------------------------------------------------------------
	function exportJSON(): void {
		// always written as the current format version, see docs/graph-format.md
		const jsonString = JSON.stringify(stampCurrentVersion(jsonData as any), null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'graph_data.json'; // File name
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
	// Lifecycle functions
	// -----------------------------------------------------------------------------------
	onMount(() => {
		const stopTracking = trackViewport();
		(async () => {
			try {
				const response = await fetch('data/test-node-graph.json');
				// older format versions are upgraded on load; say so, never silently
				const { graph, fromVersion, applied } = migrateGraph(await response.json());
				if (applied.length > 0) {
					console.info(
						`graph upgraded from v${fromVersion} to v${CURRENT_GRAPH_VERSION}:\n  ` +
							applied.join('\n  ')
					);
				}
				jsonData = graph;
			} catch (error) {
				// includes GraphFormatError: not a graph file, or from a newer app version
				console.error('Error loading graph:', error);
			}
		})();
		return stopTracking;
	});

	// world origin on screen; the world layer is scaled around its top-left corner (0, 0).
	// Inside it CSS y grows down, so nodes are placed at (x, -y) to make world y grow up.
	$: worldTranslateX = $viewport.width / 2 - $camera.x * $camera.zoom;
	$: worldTranslateY = $viewport.height / 2 + $camera.y * $camera.zoom;
</script>

<!-- window-level move/up so a drag keeps working when the mouse leaves the viewport -->
<svelte:window on:mousemove={handleMouseMove} on:mouseup={handleMouseUp} />

<div
	class="viewport no-scroll"
	role="presentation"
	on:mousedown={handleMouseDown}
	on:wheel|nonpassive|preventDefault={handleWheel}
>
	<div class="content-wrapper">
		<div
			class="world"
			style="transform: translate({worldTranslateX}px, {worldTranslateY}px) scale({$camera.zoom});"
		>
			{#each jsonData?.data?.nodes ?? [] as node}
				<div
					class="node"
					data-id={node._id}
					style="transform: translate({node.position.x}px, {-node.position.y}px);"
				>
					<div class="node-title">{node.data.title}</div>
					<!-- Render Inputs -->
					<div class="inputs">
						{#each node.data.inputs ?? [] as input}
							<div id={'node' + node._id + '_' + input.id} class="node-input"></div>
						{/each}
						<div class="indicator-io add-input hover-visible"></div>
					</div>

					<!-- Render Outputs -->
					<div class="outputs">
						{#each node.data.outputs ?? [] as output}
							<div id={'node' + node._id + '_' + output.id} class="node-output"></div>
						{/each}
						<div class="indicator-io add-output hover-visible"></div>
					</div>

					<!-- Content Section -->
					<div class="content">
						<div class="add-content hover-visible"></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<UI_GraphEditor on:requestExport={exportJSON} />
<CoordTracker />
<AssistanceMsg />
<PolkaDots />
<OriginAxes />

<style>
	/* .centered {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		} */
</style>
