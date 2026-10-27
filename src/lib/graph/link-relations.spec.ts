// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// link-relations.spec.ts -- checks the UML relations: each is its own look, it is read back
// from a link whichever single end its mark is at, and applying one keeps the link's end.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { UML_RELATIONS, relationOf, relationStyle } from './link-relations';
import { LINK_LINES, LINK_MARKS } from './types';

const relation = (id: string) => UML_RELATIONS.find((r) => r.id === id)!;

describe('UML relations', () => {
	it('every relation is a different look, made of known lines and marks', () => {
		const looks = UML_RELATIONS.map((r) => `${r.line} ${r.mark}`);
		expect(new Set(looks).size).toBe(looks.length);
		for (const r of UML_RELATIONS) {
			expect(LINK_LINES).toContain(r.line);
			expect(LINK_MARKS).toContain(r.mark);
		}
	});

	it('reads the relation back from a link, with the mark at either one end', () => {
		expect(relationOf({ line: 'solid', mark: 'triangle', arrow: 'forward' })?.id).toBe('inheritance');
		expect(relationOf({ line: 'solid', mark: 'triangle', arrow: 'backward' })?.id).toBe('inheritance');
		expect(relationOf({ line: 'dashed', mark: 'triangle', arrow: 'forward' })?.id).toBe('realization');
	});

	it('a mark at both ends or none, or a look no relation has, is custom', () => {
		expect(relationOf({ line: 'solid', mark: 'triangle', arrow: 'both' })).toBeUndefined();
		expect(relationOf({ line: 'solid', mark: 'triangle', arrow: 'none' })).toBeUndefined();
		expect(relationOf({ line: 'dotted', mark: 'arrow', arrow: 'forward' })).toBeUndefined();
	});

	it("applying a relation keeps the link's own end, else uses the relation's", () => {
		expect(relationStyle(relation('composition'), { arrow: 'forward' })).toEqual({ line: 'solid', mark: 'filled-diamond', arrow: 'forward' });
		expect(relationStyle(relation('composition'), { arrow: 'none' }).arrow).toBe('backward');
		expect(relationStyle(relation('inheritance'), { arrow: 'both' }).arrow).toBe('forward');
	});
});
