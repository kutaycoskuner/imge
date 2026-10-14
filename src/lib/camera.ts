// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// camera.ts -- the graph editor's single camera: the one place that maps world <-> screen.
//
// World space: canvas units, origin (0, 0), x right, y up (like maths and Blender, so
// moving the mouse up increases y). Screen space: CSS pixels of the browser window, y down.
// The camera stores the world point shown at the screen center plus the zoom; every layer
// (nodes, dots, origin marker, coordinate tracker) derives its position from these
// formulas so they can never disagree (y flips sign between the two spaces):
//     screen.x =  (world.x - camera.x) * zoom + screenCenter.x
//     screen.y = -(world.y - camera.y) * zoom + screenCenter.y
//     world.x  =  (screen.x - screenCenter.x) / zoom + camera.x
//     world.y  = -(screen.y - screenCenter.y) / zoom + camera.y
//
// Used by: routes/graph_editor/+page.svelte, PolkaDots, CoordTracker, UI_GraphEditor.
// Details: docs/graph-editor-canvas.md
// -----------------------------------------------------------------------------------------

import { writable, get } from 'svelte/store';

export interface Camera {
	x: number; // world x at the screen center
	y: number; // world y at the screen center
	zoom: number; // screen px per world unit
}

export interface Point {
	x: number;
	y: number;
}

export const MIN_ZOOM = 0.04;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 1.2; // factor per zoom button press; multiplicative so every step feels the same

export const camera = writable<Camera>({ x: 0, y: 0, zoom: 1 });
export const viewport = writable<{ width: number; height: number }>({ width: 0, height: 0 });

const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Converts a screen point (e.g. event.clientX/Y) to world coordinates. */
export function screenToWorld(screen: Point, cam: Camera, vp = get(viewport)): Point {
	return {
		x: (screen.x - vp.width / 2) / cam.zoom + cam.x,
		y: -(screen.y - vp.height / 2) / cam.zoom + cam.y
	};
}

/** Converts a world point to screen coordinates. */
export function worldToScreen(world: Point, cam: Camera, vp = get(viewport)): Point {
	return {
		x: (world.x - cam.x) * cam.zoom + vp.width / 2,
		y: -(world.y - cam.y) * cam.zoom + vp.height / 2
	};
}

/** Moves the view by a screen-pixel delta, so the canvas follows the mouse at any zoom. */
export function panBy(dxScreen: number, dyScreen: number): void {
	camera.update((cam) => ({
		...cam,
		x: cam.x - dxScreen / cam.zoom,
		y: cam.y + dyScreen / cam.zoom // screen y is down, world y is up
	}));
}

/**
 * Multiplies the zoom by `factor`, keeping the world point under `anchor` (screen px) fixed.
 *
 * Args:
 *     anchor: screen point to zoom toward; defaults to the screen center.
 */
export function zoomAt(factor: number, anchor?: Point): void {
	const vp = get(viewport);
	const a = anchor ?? { x: vp.width / 2, y: vp.height / 2 };
	camera.update((cam) => {
		const zoom = clampZoom(cam.zoom * factor);
		const w = screenToWorld(a, cam, vp);
		return {
			zoom,
			x: w.x - (a.x - vp.width / 2) / zoom,
			y: w.y + (a.y - vp.height / 2) / zoom
		};
	});
}

/** Back to the origin at the screen center, zoom 1. */
export function resetCamera(): void {
	camera.set({ x: 0, y: 0, zoom: 1 });
}

/**
 * Keeps `viewport` in sync with the window size.
 *
 * Returns:
 *     A cleanup function that removes the resize listener.
 */
export function trackViewport(): () => void {
	const update = () => viewport.set({ width: window.innerWidth, height: window.innerHeight });
	update();
	window.addEventListener('resize', update);
	return () => window.removeEventListener('resize', update);
}
