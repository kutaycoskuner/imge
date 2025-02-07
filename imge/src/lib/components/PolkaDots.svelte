<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { zoomLevel, coordsStateXOffset, coordsStateYOffset } from '../../stores/imge_main';

	// Reactive store values
	$: _zoomLevel = $zoomLevel;
	$: panOffsetX = $coordsStateXOffset;
	$: panOffsetY = $coordsStateYOffset;
	$: isVisible = _zoomLevel >= 0.4;

	interface Offset {
		x: number;
		y: number;
	}

	const bgMaxOffset: number = 41;
	let bgOffset: Offset = { x: 0, y: 0 };

	$: bgOffset = (() => {
		const newX = Math.abs(panOffsetX) % bgMaxOffset;
		const newY = Math.abs(panOffsetY) % bgMaxOffset;
		return { x: newX, y: newY };
	})();

	// Lifecycle hooks
	onMount(() => {});

	onDestroy(() => {});
</script>

<!-- Apply the background offset and zoom level to the polka-dots div -->
<div
	class="polka-dots"
	style={`transform: translate(${bgOffset.x}px, ${bgOffset.y}px) scale(${_zoomLevel}); visibility: ${isVisible};`}
></div>