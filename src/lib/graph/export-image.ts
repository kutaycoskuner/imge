// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// export-image.ts -- downloads the open graph as an image (toolbar's image button):
//   SVG  full vector (shapes and text, export-svg.ts), transparent background
//   PNG  that drawing as a picture at PNG_SCALE times the size, transparent background
//   JPG  the same with the theme's background colour (JPG has no transparency)
// Always the whole graph (not only the part in view), at zoom 1 with PADDING around it; the
// selection is cleared for a moment so no highlight is in the picture, and editing aids
// (resize marks, link grab areas) are left out; the world layer gets the class `exporting`
// meanwhile (hidden ports stay hidden under the mouse).
//
// Requires: a browser (DOM, canvas). Used by: UI_GraphEditor.svelte (toolbar).
// Details: docs/graph-saving.md#exporting-an-image
// -----------------------------------------------------------------------------------------

import { get } from 'svelte/store';
import { tick } from 'svelte';
import { graph, selection, frames, nodeSizes } from './store';
import { camera } from '$lib/camera';
import { workspace } from './file-access';
import { drawGraphSvg } from './export-svg';

export type ImageFormat = 'svg' | 'png' | 'jpg';

/** Space around the graph in the image (world units = px at zoom 1). */
const PADDING = 40;
/** PNG / JPG pixels per world unit: 2 for sharp text on high-density screens and in documents. */
export const PNG_SCALE = 2;
/** JPG quality (0..1). */
const JPG_QUALITY = 0.92;

/** The box around every node and group (world coords, y up), from the drawn sizes. */
function graphBounds(): { minX: number; maxX: number; minY: number; maxY: number } | null {
	const g = get(graph);
	const f = get(frames);
	const sizes = get(nodeSizes);
	if (!g.data.nodes.length) return null;
	let minX = Infinity;
	let maxX = -Infinity;
	let minY = Infinity;
	let maxY = -Infinity;
	for (const node of g.data.nodes) {
		const frame = f[node.id];
		const size = sizes[node.id] ?? { w: 0, h: 0 };
		const x = frame?.x ?? node.position.x;
		const y = frame?.y ?? node.position.y;
		minX = Math.min(minX, x);
		maxX = Math.max(maxX, x + (frame?.w ?? size.w));
		maxY = Math.max(maxY, y);
		minY = Math.min(minY, y - (frame?.h ?? size.h));
	}
	return { minX, maxX, minY, maxY };
}

/**
 * The graph as a vector SVG (text), transparent unless `background` is given; null when the
 * graph is empty or not drawn. Clears the selection while it reads the drawing.
 */
export async function graphToSvg(
	background: string | null = null
): Promise<{ svg: string; width: number; height: number } | null> {
	const bounds = graphBounds();
	const world = document.querySelector<HTMLElement>('.world');
	if (!bounds || !world) return null;
	const kept = get(selection);
	selection.set({ nodes: [], link: null });
	world.classList.add('exporting'); // e.g. hidden ports stay hidden under the mouse (imge.css)
	await tick();
	try {
		const result = drawGraphSvg({ world, zoom: get(camera).zoom, bounds, padding: PADDING, background });
		// a broken SVG would be refused by every viewer: say so instead of saving it
		const error = new DOMParser().parseFromString(result.svg, 'image/svg+xml').querySelector('parsererror');
		if (error) throw new Error(`the drawing is not valid SVG (${error.textContent?.trim().slice(0, 120)})`);
		return result;
	} finally {
		world.classList.remove('exporting');
		selection.set(kept);
	}
}

/** The SVG painted on a canvas at PNG_SCALE, as a PNG (transparent) or JPG (on `background`). */
async function rasterise(svg: string, width: number, height: number, format: 'png' | 'jpg', background: string): Promise<Blob> {
	const image = new Image();
	image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
	await image.decode();
	const canvas = document.createElement('canvas');
	canvas.width = width * PNG_SCALE;
	canvas.height = height * PNG_SCALE;
	const context = canvas.getContext('2d')!;
	if (format === 'jpg') {
		context.fillStyle = background;
		context.fillRect(0, 0, canvas.width, canvas.height);
	}
	context.scale(PNG_SCALE, PNG_SCALE);
	context.drawImage(image, 0, 0, width, height);
	const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
	return new Promise((resolve, reject) =>
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error(`the browser could not make a ${format.toUpperCase()}`))),
			type,
			JPG_QUALITY
		)
	);
}

/** File name: the graph file's name with the image's extension, or a dated default. */
function imageName(format: ImageFormat): string {
	const fileName = get(workspace).fileName;
	const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
	const base = fileName ? fileName.replace(/\.json$/i, '') : `imgegraph-${date}`;
	return `${base}.${format}`;
}

function download(blob: Blob, name: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = name;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * Downloads the open graph as an SVG, PNG or JPG image.
 *
 * Returns:
 *     The file name, or null when there is nothing to export (empty graph).
 *
 * Raises:
 *     Error: the browser couldn't draw the image (the toolbar shows the message).
 */
export async function exportGraphImage(format: ImageFormat): Promise<string | null> {
	const result = await graphToSvg();
	if (!result) return null;
	const name = imageName(format);
	const background = getComputedStyle(document.body).backgroundColor;
	const blob =
		format === 'svg'
			? new Blob([result.svg], { type: 'image/svg+xml' })
			: await rasterise(result.svg, result.width, result.height, format, background);
	download(blob, name);
	return name;
}
