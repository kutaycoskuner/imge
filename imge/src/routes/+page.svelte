<script lang="ts">
	import PolkaDots from '$lib/components/PolkaDots.svelte';
	import UI_GraphEditor from '$lib/components/UI_GraphEditor.svelte';
	import CoordTracker from '$lib/components/CoordTracker.svelte';
	import AssistanceMsg from '$lib/components/AssistanceMsg.svelte';
	import { onMount, onDestroy } from 'svelte';
	import {
		zoomLevel,
		coordsStateXOffset,
		coordsStateYOffset,
		coordsBaseXOffset,
		coordsBaseYOffset
	} from '../stores/imge_main';
	import { json } from '@sveltejs/kit';

	let _coordsBaseXOffset: number;
	let _coordsBaseYOffset: number;
	let _coordsStateXOffset: number;
	let _coordsStateYOffset: number;
	let _zoomLevel: number;
	let jsonData: Record<string, any> = {};

	coordsBaseXOffset.subscribe((value) => (_coordsBaseXOffset = value));
	coordsBaseYOffset.subscribe((value) => (_coordsBaseYOffset = value));
	coordsStateXOffset.subscribe((value) => (_coordsStateXOffset = value));
	coordsStateYOffset.subscribe((value) => (_coordsStateYOffset = value));
	zoomLevel.subscribe((value) => (_zoomLevel = value));

	let isPanningSpace: boolean = false;
	let isDraggingNode: boolean = false;
	let selectedNode: any = null;

	let startX: number = 0,
		startY: number = 0;

	let _dragOffsetX: number = 0,
		_dragOffsetY: number = 0;

	let _startStateXOffset: number = 0,
		_startStateYOffset: number = 0;

	// Mouse event functions
	// -----------------------------------------------------------------------------------
	function handleMouseDown(event: MouseEvent): void {
		const target = event.target as HTMLElement;
		const nodeElement = target.closest('.node') as HTMLElement | null;

		startX = event.clientX - _coordsBaseXOffset;
		startY = -(event.clientY - _coordsBaseYOffset);

		if (!nodeElement) {
			panSpaceStart(event);
		} else {
			moveNodeStart(event, nodeElement);
		}
	}

	function handleMouseMove(event: MouseEvent): void {
		if (isPanningSpace) panSpaceMove(event);
		else if (isDraggingNode) moveNode(event);
	}

	function handleMouseUp(): void {
		isPanningSpace = false;
		isDraggingNode = false;
	}

	// Space panning functions
	// -----------------------------------------------------------------------------------
	function panSpaceStart(event: MouseEvent): void {
		isPanningSpace = true;
		_startStateXOffset = _coordsStateXOffset;
		_startStateYOffset = _coordsStateYOffset;
	}

	function panSpaceMove(event: MouseEvent): void {
		if (!isPanningSpace) return;

		let mouseX = event.clientX - _coordsBaseXOffset;
		let mouseY = -(event.clientY - _coordsBaseYOffset);

		_dragOffsetX = mouseX - startX;
		_dragOffsetY = mouseY - startY;

		coordsStateXOffset.set(_startStateXOffset - _dragOffsetX);
		coordsStateYOffset.set(_startStateYOffset - _dragOffsetY);
	}

	// Move node
	// -----------------------------------------------------------------------------------
	function moveNodeStart(event: MouseEvent, nodeElement: HTMLElement): void {
		isDraggingNode = true;
		selectedNode = jsonData.data.nodes.find((n: any) => n._id == nodeElement.dataset.id);
	}

	function moveNode(event: MouseEvent): void {
		if (!selectedNode) return;

		// calculate the current mouse position relative to the base offsets
		let mouseX = event.clientX - _coordsBaseXOffset;
		let mouseY = -(event.clientY - _coordsBaseYOffset);

		// calculate the drag offset based on the current mouse position and the initial start position
		_dragOffsetX = mouseX - startX;
		_dragOffsetY = mouseY - startY;

		// update the node's position by adding the drag offset
		selectedNode.position.x += _dragOffsetX;
		selectedNode.position.y += -_dragOffsetY;

		// update the start position to the current mouse position for the next move event
		startX = mouseX;
		startY = mouseY;

		// reactivity
		jsonData = { ...jsonData, data: { ...jsonData.data, nodes: [...jsonData.data.nodes] } };
	}

	// import export functions
	// -----------------------------------------------------------------------------------
	function exportJSON(): void {
		const jsonString = JSON.stringify(jsonData, null, 2);
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
	onMount(async () => {
		try {
			const response = await fetch('data/test-node-graph.json');
			jsonData = await response.json();
		} catch (error) {
			console.error('Error fetching JSON:', error);
		}
	});

	$: contentTranslateX = _coordsBaseXOffset / 1.5 - _coordsStateXOffset;
	$: contentTranslateY = _coordsBaseYOffset / 1.5 + _coordsStateYOffset;
</script>

<div
	class="viewport no-scroll"
	role="presentation"
	on:mousedown={handleMouseDown}
	on:mousemove={handleMouseMove}
	on:mouseup={handleMouseUp}
>
	<div class="content-wrapper">
		<div
			class="content"
			style="transform: translate({contentTranslateX}px, {contentTranslateY}px); scale: {_zoomLevel};"
		>
			{#each jsonData?.data?.nodes ?? [] as node}
				<div
					class="node"
					data-id={node._id}
					style="transform: translate({node.position.x}px, {node.position.y}px);"
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

<style>
	/* .centered {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		} */
</style>
