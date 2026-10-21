// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// color.ts -- node colours: reading what someone typed as a hex colour, how much of the
// colour a node's fill gets, the preset colours, hex <-> HSV for the colour picker (a
// saturation / brightness square and a hue bar, like htmlcolorcodes.com) and the tints and
// shades row (the colour mixed toward white / black).
//
// A node's `color` (format v3+) is "#rrggbb" or null (the theme's default look). The border
// is drawn in the colour itself (vibrant), the fill in a dim version of it: the colour mixed
// into the theme background, so text stays readable in light and dark themes. A `color`
// that isn't a hex colour (e.g. hand-written into a file) is kept but not drawn.
//
// Used by: GraphNode.svelte (drawing), properties/PropColor.svelte (hex field, presets),
// properties/ColorPicker.svelte (HSV, tints and shades).
// -----------------------------------------------------------------------------------------

/** Share of the node colour in a coloured node's fill; the rest is the theme background. */
export const NODE_FILL_SHARE = 0.2;

/**
 * Reads a hex colour as typed: "#abc", "abc", "#aabbcc" or "aabbcc", any case, spaces
 * around ignored.
 *
 * Returns:
 *     The colour as lowercase "#rrggbb", or null when the text isn't a hex colour.
 */
export function parseHexColor(text: string): string | null {
	const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
	if (!match) return null;
	const hex = match[1].toLowerCase();
	const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
	return `#${full}`;
}

/** CSS for a dim version of a colour: mixed into the theme background (var(--bg)). */
export const dimColor = (color: string): string =>
	`color-mix(in srgb, ${color} ${NODE_FILL_SHARE * 100}%, var(--bg))`;

/** Preset colours offered in the colour picker, as data (change freely). */
export const NODE_COLOR_PRESETS: { color: string; name: string }[] = [
	{ color: '#e5484d', name: 'red' },
	{ color: '#f76b15', name: 'orange' },
	{ color: '#ffc53d', name: 'amber' },
	{ color: '#46a758', name: 'green' },
	{ color: '#12a594', name: 'teal' },
	{ color: '#2a9fd6', name: 'cerulean' },
	{ color: '#3e63dd', name: 'indigo' },
	{ color: '#8e4ec6', name: 'violet' },
	{ color: '#d6409f', name: 'pink' },
	{ color: '#8d8d8d', name: 'grey' }
];

/** A colour as hue (0..360, degrees), saturation (0..1) and value / brightness (0..1). */
export interface Hsv {
	h: number;
	s: number;
	v: number;
}

/** "#rrggbb" -> HSV. Greys get hue 0 (the caller keeps its own hue when that matters). */
export function hexToHsv(hex: string): Hsv {
	const n = parseInt(hex.slice(1), 16);
	const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => c / 255);
	const max = Math.max(r, g, b);
	const d = max - Math.min(r, g, b);
	let h = 0;
	if (d > 0) {
		if (max === r) h = ((g - b) / d) % 6;
		else if (max === g) h = (b - r) / d + 2;
		else h = (r - g) / d + 4;
		h = (h * 60 + 360) % 360;
	}
	return { h, s: max === 0 ? 0 : d / max, v: max };
}

/** HSV -> "#rrggbb". */
export function hsvToHex({ h, s, v }: Hsv): string {
	const f = (k: number): number => {
		const x = (k + h / 60) % 6;
		return v - v * s * Math.max(0, Math.min(x, 4 - x, 1));
	};
	return '#' + [f(5), f(3), f(1)].map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}

/** Mixes two "#rrggbb" colours: t = 0 gives `a`, t = 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
	const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const [ca, cb] = [channels(a), channels(b)];
	return '#' + ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, '0')).join('');
}

/** How far each tint (toward white) and shade (toward black) of the picker's row goes. */
export const TINT_STEPS = [0.75, 0.5, 0.25];
export const SHADE_STEPS = [0.25, 0.5, 0.75];

/** The tints and shades row: lightest tint, ..., the colour itself, ..., darkest shade. */
export function tintsAndShades(hex: string): string[] {
	return [
		...TINT_STEPS.map((t) => mixHex(hex, '#ffffff', t)),
		hex,
		...SHADE_STEPS.map((t) => mixHex(hex, '#000000', t))
	];
}
