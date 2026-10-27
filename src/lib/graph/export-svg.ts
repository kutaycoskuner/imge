// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// export-svg.ts -- draws the graph as it is shown into a plain vector SVG: rectangles,
// ellipses, paths and text, no HTML inside (so vector editors such as Inkscape and Illustrator
// open it as shapes), with a transparent background.
//
// It reads what the browser drew, element by element, in drawing order:
//   - the link layer is SVG already: copied, with its computed styles written as attributes
// drawTextViewSvg does the same for the text view (experimental): the characters on their
// columns in the view's font and styles.
//   - every other element: its background and borders (rounded corners, circles via
//     border-radius 50%, single sides such as the UML compartment lines), its text placed
//     line by line where the browser put each character (font, colour, weight; the baseline
//     from the font's measured ascent), a red wavy line for an underlined (invalid UML) line
//   - a group's frame (fieldset + legend): its border with the gap for the name, on a
//     rectangle or a circle
// Shadows are left out. Colours of any CSS form (also color-mix) are turned into rgb / rgba by
// painting them on a 1 x 1 canvas.
//
// Coordinates: the world layer's own (CSS px at zoom 1, y down), shifted so the given bounds
// start at `padding`.
//
// Requires: a browser; the graph drawn on screen. Used by: export-image.ts.
// Details: docs/graph-saving.md#exporting-an-image
// -----------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';
/** Parts of the drawing that are only there for editing, left out of the image. */
export const EDITING_AIDS = '.group-resize, .link-bend, .link-hit, .link-preview, .hover-visible';
/** SVG presentation properties copied from the computed style of the link layer's parts. */
const SVG_PROPS = [
	'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap',
	'stroke-linejoin', 'opacity', 'paint-order', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor',
	'dominant-baseline', 'visibility'
];

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (v: number) => Math.round(v * 100) / 100;

// any CSS colour -> "rgb(r,g,b)" plus its alpha (0 = transparent), by painting it on a canvas
const colours = new Map<string, { rgb: string; a: number }>();
// made on first use: this module is imported by the toolbar, also during server-side prerendering
let canvas: CanvasRenderingContext2D | null = null;
const painter = () => (canvas ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true })!);
function colour(css: string): { rgb: string; a: number } {
	const paint = painter();
	let c = colours.get(css);
	if (!c) {
		paint.clearRect(0, 0, 1, 1);
		paint.fillStyle = '#000';
		paint.fillStyle = css;
		paint.fillRect(0, 0, 1, 1);
		const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
		c = { rgb: `rgb(${r},${g},${b})`, a: Math.round((a / 255) * 1000) / 1000 };
		if (css === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(css)) c = { rgb: c.rgb, a: 0 };
		colours.set(css, c);
	}
	return c;
}
const fillAttr = (css: string, attr = 'fill') => {
	const c = colour(css);
	return c.a < 1 ? `${attr}="${c.rgb}" ${attr}-opacity="${c.a}"` : `${attr}="${c.rgb}"`;
};

// font metrics: the share of a text box's height above the baseline, per font
const ascents = new Map<string, number>();
function ascentShare(font: string): number {
	let share = ascents.get(font);
	if (share === undefined) {
		const paint = painter();
		paint.font = font;
		const m = paint.measureText('Hg');
		const asc = m.fontBoundingBoxAscent || m.actualBoundingBoxAscent;
		const desc = m.fontBoundingBoxDescent || m.actualBoundingBoxDescent;
		share = asc + desc > 0 ? asc / (asc + desc) : 0.8;
		ascents.set(font, share);
	}
	return share;
}

interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface DrawOptions {
	world: HTMLElement; // the drawn world layer
	zoom: number; // the camera zoom it is drawn at
	bounds: { minX: number; maxX: number; minY: number; maxY: number }; // world coords, y up
	padding: number;
	background?: string | null; // CSS colour behind everything, or none (transparent)
}

/** The graph as drawn, as a vector SVG document (text) and its size. */
export function drawGraphSvg(o: DrawOptions): { svg: string; width: number; height: number } {
	const origin = o.world.getBoundingClientRect();
	// screen rect -> world layer coords (zoom 1)
	const box = (r: DOMRect | { left: number; top: number; width: number; height: number }): Box => ({
		x: (r.left - origin.left) / o.zoom,
		y: (r.top - origin.top) / o.zoom,
		w: r.width / o.zoom,
		h: r.height / o.zoom
	});
	const out: string[] = [];

	// ---- text ------------------------------------------------------------------------------
	function drawText(node: Text, cs: CSSStyleDeclaration, opacity: number): void {
		const text = node.data;
		if (!text.trim()) return;
		const range = document.createRange();
		const lines: { text: string; left: number; right: number; top: number; height: number }[] = [];
		for (let i = 0; i < text.length; i++) {
			range.setStart(node, i);
			range.setEnd(node, i + 1);
			const r = range.getClientRects()[0];
			if (!r || (r.width === 0 && text[i] !== ' ')) continue;
			const line = lines[lines.length - 1];
			if (line && Math.abs(r.top - line.top) < r.height / 2) {
				line.text += text[i];
				line.right = r.right;
			} else {
				lines.push({ text: text[i], left: r.left, right: r.right, top: r.top, height: r.height });
			}
		}
		const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
		const share = ascentShare(font);
		const ink = colour(cs.color);
		const alpha = ink.a * opacity;
		for (const line of lines) {
			const content = line.text.replace(/\s+$/, '');
			if (!content.trim()) continue;
			const b = box({ left: line.left, top: line.top, width: line.right - line.left, height: line.height });
			out.push(
				`<text x="${num(b.x)}" y="${num(b.y + b.h * share)}" font-family="${esc(cs.fontFamily)}" font-size="${cs.fontSize}"` +
					`${cs.fontWeight !== '400' ? ` font-weight="${cs.fontWeight}"` : ''}${cs.fontStyle !== 'normal' ? ` font-style="${cs.fontStyle}"` : ''}` +
					` fill="${ink.rgb}"${alpha < 1 ? ` fill-opacity="${num(alpha)}"` : ''} xml:space="preserve">${esc(content)}</text>`
			);
		}
	}

	// red wavy line under an element's text (text-decoration: underline wavy; invalid UML lines)
	// an underlined element's line under its text: wavy (UML format check) or straight ({static})
	function drawUnderline(el: Element, cs: CSSStyleDeclaration): void {
		const range = document.createRange();
		range.selectNodeContents(el);
		const r = box(range.getBoundingClientRect());
		if (r.w <= 0) return;
		if (cs.textDecorationStyle !== 'wavy') {
			const y = num(r.y + r.h - 2);
			out.push(`<line x1="${num(r.x)}" y1="${y}" x2="${num(r.x + r.w)}" y2="${y}" ${fillAttr(cs.textDecorationColor, 'stroke')} stroke-width="1"/>`);
			return;
		}
		const y = r.y + r.h - 1;
		let d = `M ${num(r.x)} ${num(y)}`;
		for (let x = r.x, up = true; x < r.x + r.w; x += 2, up = !up) d += ` L ${num(Math.min(x + 2, r.x + r.w))} ${num(up ? y - 1.5 : y + 0.5)}`;
		out.push(`<path d="${d}" fill="none" ${fillAttr(cs.textDecorationColor, 'stroke')} stroke-width="1"/>`);
	}

	// ---- boxes -----------------------------------------------------------------------------
	const px = (v: string) => parseFloat(v) || 0;

	function drawBox(el: HTMLElement, cs: CSSStyleDeclaration, opacity: number): void {
		const b = box(el.getBoundingClientRect());
		if (b.w <= 0 || b.h <= 0) return;
		// a percentage radius is relative to the box (ports: 15%); 50% or more makes an ellipse
		const radius = cs.borderTopLeftRadius;
		const percent = radius.endsWith('%');
		const round = percent && parseFloat(radius) >= 50;
		const r = round ? 0 : Math.min(percent ? (parseFloat(radius) / 100) * Math.min(b.w, b.h) : px(radius), b.w / 2, b.h / 2);
		const op = opacity < 1 ? ` opacity="${num(opacity)}"` : '';
		const sides = (['Top', 'Right', 'Bottom', 'Left'] as const).map((s) => ({
			w: cs.getPropertyValue(`border-${s.toLowerCase()}-style`) === 'none' ? 0 : px(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)),
			c: cs.getPropertyValue(`border-${s.toLowerCase()}-color`)
		}));
		const legend = el.localName === 'fieldset' ? el.querySelector(':scope > legend') : null;

		// a fieldset's border line runs through the middle of its legend
		const top = legend ? box(legend.getBoundingClientRect()).y + box(legend.getBoundingClientRect()).h / 2 : b.y;
		const area = { x: b.x, y: top, w: b.w, h: b.y + b.h - top };

		const bg = colour(cs.backgroundColor);
		if (bg.a > 0) {
			out.push(
				round
					? `<ellipse cx="${num(area.x + area.w / 2)}" cy="${num(area.y + area.h / 2)}" rx="${num(area.w / 2)}" ry="${num(area.h / 2)}" ${fillAttr(cs.backgroundColor)}${op}/>`
					: `<rect x="${num(area.x)}" y="${num(area.y)}" width="${num(area.w)}" height="${num(area.h)}"${r ? ` rx="${num(r)}"` : ''} ${fillAttr(cs.backgroundColor)}${op}/>`
			);
		}

		const same = sides.every((s) => s.w === sides[0].w && s.c === sides[0].c);
		if (same && sides[0].w > 0 && colour(sides[0].c).a > 0) {
			const w = sides[0].w;
			const stroke = `fill="none" ${fillAttr(sides[0].c, 'stroke')} stroke-width="${num(w)}"${op}`;
			const x1 = area.x + w / 2;
			const y1 = area.y + w / 2;
			const x2 = area.x + area.w - w / 2;
			const y2 = area.y + area.h - w / 2;
			if (legend) {
				// the border with a gap where the name sits
				const lg = box(legend.getBoundingClientRect());
				if (round) {
					const cx = (x1 + x2) / 2;
					const cy = (y1 + y2) / 2;
					const rx = (x2 - x1) / 2;
					const ry = (y2 - y1) / 2;
					const a = Math.asin(Math.min(1, lg.w / 2 / rx));
					const sx = cx + rx * Math.sin(a);
					const ex = cx - rx * Math.sin(a);
					const ey = cy - ry * Math.cos(a);
					out.push(`<path d="M ${num(sx)} ${num(ey)} A ${num(rx)} ${num(ry)} 0 1 1 ${num(ex)} ${num(ey)}" ${stroke}/>`);
				} else {
					const rr = Math.max(0, r - w / 2);
					const g1 = Math.max(x1 + rr, lg.x);
					const g2 = Math.min(x2 - rr, lg.x + lg.w);
					out.push(
						`<path d="M ${num(g2)} ${num(y1)} H ${num(x2 - rr)} A ${num(rr)} ${num(rr)} 0 0 1 ${num(x2)} ${num(y1 + rr)} V ${num(y2 - rr)}` +
							` A ${num(rr)} ${num(rr)} 0 0 1 ${num(x2 - rr)} ${num(y2)} H ${num(x1 + rr)} A ${num(rr)} ${num(rr)} 0 0 1 ${num(x1)} ${num(y2 - rr)}` +
							` V ${num(y1 + rr)} A ${num(rr)} ${num(rr)} 0 0 1 ${num(x1 + rr)} ${num(y1)} H ${num(g1)}" ${stroke}/>`
					);
				}
			} else if (round) {
				out.push(`<ellipse cx="${num((x1 + x2) / 2)}" cy="${num((y1 + y2) / 2)}" rx="${num((x2 - x1) / 2)}" ry="${num((y2 - y1) / 2)}" ${stroke}/>`);
			} else {
				const rr = Math.max(0, r - w / 2);
				out.push(`<rect x="${num(x1)}" y="${num(y1)}" width="${num(x2 - x1)}" height="${num(y2 - y1)}"${rr ? ` rx="${num(rr)}"` : ''} ${stroke}/>`);
			}
		} else {
			// single sides (e.g. the line above a UML compartment)
			const lines = [
				[b.x, b.y + sides[0].w / 2, b.x + b.w, b.y + sides[0].w / 2],
				[b.x + b.w - sides[1].w / 2, b.y, b.x + b.w - sides[1].w / 2, b.y + b.h],
				[b.x, b.y + b.h - sides[2].w / 2, b.x + b.w, b.y + b.h - sides[2].w / 2],
				[b.x + sides[3].w / 2, b.y, b.x + sides[3].w / 2, b.y + b.h]
			];
			sides.forEach((s, i) => {
				if (s.w <= 0 || colour(s.c).a === 0) return;
				const [xa, ya, xb, yb] = lines[i];
				out.push(`<line x1="${num(xa)}" y1="${num(ya)}" x2="${num(xb)}" y2="${num(yb)}" ${fillAttr(s.c, 'stroke')} stroke-width="${num(s.w)}"${op}/>`);
			});
		}
	}

	// ---- the link layer: SVG already, copied with its computed styles as attributes ---------------
	function copySvg(from: Element, opacity: number): string {
		if (from.matches(EDITING_AIDS)) return '';
		const cs = getComputedStyle(from);
		if (cs.display === 'none') return '';
		const name = from.localName;
		// one value per attribute name (a duplicate makes the SVG invalid XML, which browsers refuse)
		const attrs = new Map<string, string>();
		for (const a of Array.from(from.attributes)) {
			if (['class', 'style', 'aria-hidden'].includes(a.name) || a.name.startsWith('data-')) continue;
			attrs.set(a.name, a.value);
		}
		if (name !== 'svg' && name !== 'defs' && name !== 'marker') {
			for (const prop of SVG_PROPS) {
				const v = cs.getPropertyValue(prop);
				if (!v || v === 'normal' || v === 'auto' || (v === 'none' && prop !== 'fill' && prop !== 'stroke')) continue;
				if ((prop === 'fill' || prop === 'stroke') && v !== 'none' && !v.startsWith('url(')) {
					// a see-through colour: the colour's alpha times the element's own opacity for it
					const c = colour(v);
					const own = parseFloat(cs.getPropertyValue(`${prop}-opacity`)) || 1;
					attrs.set(prop, c.rgb);
					if (c.a * own < 1) attrs.set(`${prop}-opacity`, String(num(c.a * own)));
					continue;
				}
				if ((prop === 'fill-opacity' || prop === 'stroke-opacity') && attrs.has(prop)) continue; // set with the colour
				attrs.set(prop, v);
			}
		}
		const children = Array.from(from.childNodes)
			.map((c) => (c.nodeType === Node.TEXT_NODE ? esc(c.textContent ?? '') : c.nodeType === Node.ELEMENT_NODE ? copySvg(c as Element, opacity) : ''))
			.join('');
		if (name === 'svg') return children; // the layer's own <svg>: its content goes into ours
		const list = Array.from(attrs, ([k, v]) => `${k}="${esc(v)}"`).join(' ');
		return `<${name}${list ? ' ' + list : ''}>${children}</${name}>`;
	}

	// ---- walk the drawing in order ---------------------------------------------------------------
	function walk(el: Element, opacity: number): void {
		if (el.matches(EDITING_AIDS)) return;
		if (el.namespaceURI === SVG_NS) {
			out.push(copySvg(el, opacity));
			return;
		}
		const cs = getComputedStyle(el);
		if (cs.display === 'none' || cs.visibility === 'hidden') return;
		const alpha = opacity * (parseFloat(cs.opacity) || 0);
		if (alpha <= 0) return;
		if (el !== o.world) drawBox(el as HTMLElement, cs, alpha);
		for (const child of Array.from(el.childNodes)) {
			if (child.nodeType === Node.TEXT_NODE) drawText(child as Text, cs, alpha);
			else if (child.nodeType === Node.ELEMENT_NODE) walk(child as Element, alpha);
		}
		if (cs.textDecorationLine.includes('underline')) drawUnderline(el, cs);
	}
	walk(o.world, 1);

	const width = Math.ceil(o.bounds.maxX - o.bounds.minX + 2 * o.padding);
	const height = Math.ceil(o.bounds.maxY - o.bounds.minY + 2 * o.padding);
	const shift = `translate(${num(o.padding - o.bounds.minX)} ${num(o.padding + o.bounds.maxY)})`;
	const background = o.background ? `<rect width="100%" height="100%" ${fillAttr(o.background)}/>` : '';
	const svg =
		`<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
		`${background}<g transform="${shift}">${out.join('')}</g></svg>`;
	return { svg, width, height };
}

/**
 * The text view (GraphTextView's `<pre>`) as an SVG: every run of characters as `<text>` on
 * its own character column, in the view's font, colours, weights and italics; underlines
 * (straight or wavy) as lines. Columns stay aligned even where a font draws a glyph wider
 * (runs get their exact width with textLength, one-cell glyphs are centred in their cell).
 *
 * Args:
 *     pre: the text view's `<pre class="ascii">`, its children runs (`<span>`) and newlines.
 *     padding: space around the text, px.
 *     background: a CSS colour to fill behind it, or null for transparent.
 */
export function drawTextViewSvg(pre: HTMLElement, padding: number, background: string | null): { svg: string; width: number; height: number } {
	const cs = getComputedStyle(pre);
	const size = parseFloat(cs.fontSize) || 13;
	const lineHeight = parseFloat(cs.lineHeight) || size * 1.17;
	const font = `${size}px ${cs.fontFamily}`;
	const paint = painter();
	paint.font = font;
	const cell = paint.measureText('0').width || size * 0.6;
	const out: string[] = [];
	let row = 0;
	let col = 0;
	let cols = 0;
	for (const node of Array.from(pre.childNodes)) {
		const text = node.textContent ?? '';
		if (node.nodeType === Node.TEXT_NODE) {
			// the newlines between rows
			for (const ch of Array.from(text)) {
				if (ch === '\n') (row++, (col = 0));
				else col++;
			}
			continue;
		}
		const chars = Array.from(text);
		const x = padding + col * cell;
		const mid = padding + row * lineHeight + lineHeight / 2;
		col += chars.length;
		cols = Math.max(cols, col);
		if (!text.trim()) continue;
		const s = getComputedStyle(node as Element);
		const one = (node as Element).classList.contains('ascii-w');
		const place = one
			? `x="${num(x + cell / 2)}" text-anchor="middle"`
			: `x="${num(x)}"${chars.length > 1 ? ` textLength="${num(chars.length * cell)}" lengthAdjust="spacing"` : ''}`;
		const weight = s.fontWeight !== '400' ? ` font-weight="${s.fontWeight}"` : '';
		const italic = s.fontStyle !== 'normal' ? ` font-style="${s.fontStyle}"` : '';
		out.push(`<text ${place} y="${num(mid)}" dominant-baseline="central" ${fillAttr(s.color)}${weight}${italic} xml:space="preserve">${esc(text)}</text>`);
		if (s.textDecorationLine.includes('underline')) {
			const y = mid + size * 0.55;
			const end = x + chars.length * cell;
			if (s.textDecorationStyle === 'wavy') {
				let d = `M ${num(x)} ${num(y)}`;
				for (let at = x, up = true; at < end; at += 2, up = !up) d += ` L ${num(Math.min(at + 2, end))} ${num(up ? y - 1.5 : y + 0.5)}`;
				out.push(`<path d="${d}" fill="none" ${fillAttr(s.textDecorationColor, 'stroke')} stroke-width="1"/>`);
			} else {
				out.push(`<line x1="${num(x)}" y1="${num(y)}" x2="${num(end)}" y2="${num(y)}" ${fillAttr(s.textDecorationColor, 'stroke')} stroke-width="1"/>`);
			}
		}
	}
	const rows = col > 0 ? row + 1 : row;
	const width = Math.ceil(cols * cell + 2 * padding);
	const height = Math.ceil(rows * lineHeight + 2 * padding);
	const fill = background ? `<rect width="100%" height="100%" ${fillAttr(background)}/>` : '';
	const svg =
		`<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${esc(cs.fontFamily)}" font-size="${num(size)}">` +
		`${fill}${out.join('')}</svg>`;
	return { svg, width, height };
}
