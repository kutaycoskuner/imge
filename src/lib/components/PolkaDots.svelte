<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-16
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Endless dot grid behind the graph editor: one fixed full-screen layer whose repeating
	// background follows the camera, so it never runs out and lines up with the nodes.
	// Dots sit on world multiples of the spacing; when zoomed out so far that they would
	// crowd together, the spacing doubles instead of the grid disappearing.
	// Hidden with the toolbar's dot grid button (showDotGrid, a display setting).
	import { camera, viewport, gridSpacing } from '$lib/camera';
	import { showDotGrid } from '$lib/graph/store';

	const DOT_OPACITY = 0.32; // the grid is a hint of space, it should stay in the background

	// spacing (and its doubling when zoomed out) lives in camera.ts, shared with node snapping
	$: worldSpacing = gridSpacing($camera.zoom);
	$: tile = worldSpacing * $camera.zoom;

	// screen position of world (0, 0); the gradient draws each dot at its tile's center,
	// so the tiles start half a tile earlier to put a dot exactly on the origin
	$: originX = $viewport.width / 2 - $camera.x * $camera.zoom;
	$: originY = $viewport.height / 2 + $camera.y * $camera.zoom; // world y is up

	// dots grow a little with zoom but stay readable at both ends
	$: dotRadius = Math.min(1.2, Math.max(0.6, 0.8 * $camera.zoom));
</script>

{#if $showDotGrid}
<div
	class="polka-dots"
	style={`background-image: radial-gradient(circle, var(--col-transparent) ${dotRadius}px, transparent ${dotRadius + 0.8}px);` +
		` background-size: ${tile}px ${tile}px;` +
		` background-position: ${originX - tile / 2}px ${originY - tile / 2}px;` +
		` opacity: ${DOT_OPACITY};`}
></div>
{/if}
