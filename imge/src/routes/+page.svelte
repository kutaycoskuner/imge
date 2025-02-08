<script lang="ts">
	import PolkaDots from '$lib/components/PolkaDots.svelte';
	import UI_GraphEditor from '$lib/components/UI_GraphEditor.svelte';
	import {
		zoomLevel,
		coordsStateXOffset,
		coordsStateYOffset,
		coordsBaseXOffset,
		coordsBaseYOffset
	} from '../stores/imge_main';

	let _coordsBaseXOffset: number;
	let _coordsBaseYOffset: number;
	let _coordsStateXOffset: number;
	let _coordsStateYOffset: number;

	coordsBaseXOffset.subscribe((value) => (_coordsBaseXOffset = value));
	coordsBaseYOffset.subscribe((value) => (_coordsBaseYOffset = value));
	coordsStateXOffset.subscribe((value) => (_coordsStateXOffset = value));
	coordsStateYOffset.subscribe((value) => (_coordsStateYOffset = value));

	let isDragging: boolean = false;
	let startX: number = 0,
		startY: number = 0;
	let _dragOffsetX: number = 0,
		_dragOffsetY: number = 0;
	let _startStateXOffset: number = 0,
		_startStateYOffset: number = 0;

	function handleMouseDown(event: MouseEvent): void {
		isDragging = true;
		startX = event.clientX - _coordsBaseXOffset;
		startY = -(event.clientY - _coordsBaseYOffset);

		_startStateXOffset = _coordsStateXOffset;
		_startStateYOffset = _coordsStateYOffset;
	}

	function handleMouseMove(event: MouseEvent): void {
		if (!isDragging) return;

		let mouseX = event.clientX - _coordsBaseXOffset;
		let mouseY = -(event.clientY - _coordsBaseYOffset);

		_dragOffsetX = mouseX - startX;
		_dragOffsetY = mouseY - startY;

		coordsStateXOffset.set(_startStateXOffset - _dragOffsetX);
		coordsStateYOffset.set(_startStateYOffset - _dragOffsetY);
	}

	function handleMouseUp(): void {
		if (!isDragging) return;
		isDragging = false;

		coordsStateXOffset.set(_startStateXOffset - _dragOffsetX);
		coordsStateYOffset.set(_startStateYOffset - _dragOffsetY);
	}

	$: contentTranslateX = (_coordsBaseXOffset / 1.5) + -_coordsStateXOffset;
	$: contentTranslateY = (_coordsBaseYOffset / 1.5) + _coordsStateYOffset;
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
			style="transform: translate({contentTranslateX}px, {contentTranslateY}px);"
		>
			<div class="node">a</div>
		</div>
	</div>
</div>

<UI_GraphEditor />
<PolkaDots />

<style>
	/* .centered {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	} */
</style>
