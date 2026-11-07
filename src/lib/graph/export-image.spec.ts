// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-05
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// export-image.spec.ts -- checks the size rule for PNG / JPG exports: twice the size when the
// browser's canvas can hold it, else the largest scale within its side and area limits.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { rasterScale, PNG_SCALE, CANVAS_MAX_SIDE, CANVAS_MAX_AREA } from './export-image';

describe('PNG / JPG size', () => {
	it('is PNG_SCALE for graphs that fit', () => {
		expect(rasterScale(2000, 1500)).toBe(PNG_SCALE);
	});

	it('shrinks a very wide graph to the longest side the canvas allows', () => {
		const scale = rasterScale(40000, 400);
		expect(40000 * scale).toBeLessThanOrEqual(CANVAS_MAX_SIDE);
		expect(scale).toBeCloseTo(CANVAS_MAX_SIDE / 40000);
	});

	it('shrinks a large graph to the area the canvas allows', () => {
		const scale = rasterScale(12000, 12000);
		expect(12000 * scale * 12000 * scale).toBeLessThanOrEqual(CANVAS_MAX_AREA + 1);
		expect(scale).toBeLessThan(PNG_SCALE);
	});
});
