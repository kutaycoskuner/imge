// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// color.spec.ts -- checks reading typed hex colours (short / long, with or without #, case),
// hex <-> HSV for the colour picker, mixing (tints and shades), and that the presets are
// valid colours.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { parseHexColor, dimColor, hexToHsv, hsvToHex, mixHex, tintsAndShades, NODE_COLOR_PRESETS } from './color';

describe('parseHexColor', () => {
	it('reads long and short hex, with or without #, any case', () => {
		expect(parseHexColor('#2A9FD6')).toBe('#2a9fd6');
		expect(parseHexColor('2a9fd6')).toBe('#2a9fd6');
		expect(parseHexColor('#f80')).toBe('#ff8800');
		expect(parseHexColor('  F80 ')).toBe('#ff8800');
	});

	it('refuses anything else', () => {
		for (const text of ['', '#', '#ff', '#ffff', '#gggggg', 'red', 'rgb(0,0,0)', '#12345678']) {
			expect(parseHexColor(text)).toBeNull();
		}
	});
});

describe('dimColor', () => {
	it('mixes the colour into the theme background', () => {
		expect(dimColor('#ff8800')).toBe('color-mix(in srgb, #ff8800 20%, var(--bg))');
	});
});

describe('hex <-> HSV', () => {
	it('reads primary colours, white, black and grey', () => {
		expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
		expect(hexToHsv('#00ff00')).toEqual({ h: 120, s: 1, v: 1 });
		expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
		expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 });
		expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
		expect(hexToHsv('#808080').s).toBe(0);
	});

	it('round-trips every preset and a few other colours exactly', () => {
		for (const hex of [...NODE_COLOR_PRESETS.map((p) => p.color), '#123456', '#fedcba', '#ffffff', '#000000']) {
			expect(hsvToHex(hexToHsv(hex))).toBe(hex);
		}
	});

	it('presets are stored-form hex colours', () => {
		for (const { color } of NODE_COLOR_PRESETS) expect(parseHexColor(color)).toBe(color);
	});
});

describe('tints and shades', () => {
	it('mixes two colours by a share', () => {
		expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
		expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
		expect(mixHex('#ff0000', '#0000ff', 0.5)).toBe('#800080');
	});

	it('runs from the lightest tint through the colour to the darkest shade', () => {
		const row = tintsAndShades('#ff0000');
		expect(row).toHaveLength(7);
		expect(row[3]).toBe('#ff0000');
		expect(row[0]).toBe('#ffbfbf');
		expect(row[6]).toBe('#400000');
	});
});
