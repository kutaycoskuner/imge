<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Origin marker for the graph editor: an L at world (0, 0) whose arms point toward +x
	// (red, right) and +y (green, up), in Blender's axis colors. The arms keep a fixed
	// screen length like a gizmo, so the marker stays readable at every zoom.
	// Development aid only: the graph editor page renders it only when `dev` is true.
	import { camera, viewport, worldToScreen } from '$lib/camera';

	const ARM_LENGTH = 40; // px on screen, one dot spacing at zoom 1

	$: origin = worldToScreen({ x: 0, y: 0 }, $camera, $viewport);
</script>

<div class="origin-axes" aria-hidden="true">
	<div
		class="axis axis-x"
		style="left: {origin.x}px; top: {origin.y - 1}px; width: {ARM_LENGTH}px;"
	></div>
	<div
		class="axis axis-y"
		style="left: {origin.x - 1}px; top: {origin.y - ARM_LENGTH}px; height: {ARM_LENGTH}px;"
	></div>
</div>

<style>
	/* above the dots (-10), below the nodes (10); never catches the mouse, so drags still pan */
	.origin-axes {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 5;
		opacity: 0.5;
	}

	.axis {
		position: absolute;
		border-radius: 1px;
	}

	/* Blender default theme axis colors */
	.axis-x {
		height: 2px;
		background: #ff3352;
	}

	.axis-y {
		width: 2px;
		background: #8bdc00;
	}
</style>
