// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-15
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// site.spec.ts -- checks reading the keyboard site's support link from its server's answer
// (site-config.json): an https address is taken, empty or unsafe values are not.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { parseSupportLink } from './site';

describe('support link', () => {
	it('takes an https address and its label', () => {
		expect(parseSupportLink({ support: { url: ' https://example.org/page ', label: 'Buy me a coffee' } })).toEqual({
			url: 'https://example.org/page',
			label: 'Buy me a coffee'
		});
	});
	it('falls back to "Support" without a label', () => {
		expect(parseSupportLink({ support: { url: 'https://example.org', label: '' } })?.label).toBe('Support');
	});
	it('shows nothing when the server has no address (empty setting)', () => {
		expect(parseSupportLink({ support: { url: '', label: '' } })).toBeNull();
		expect(parseSupportLink(null)).toBeNull();
		expect(parseSupportLink({})).toBeNull();
	});
	it('refuses addresses that are not plain https', () => {
		expect(parseSupportLink({ support: { url: 'http://example.org' } })).toBeNull();
		expect(parseSupportLink({ support: { url: 'javascript:alert(1)' } })).toBeNull();
		expect(parseSupportLink({ support: { url: 'https://example.org/"><script>' } })).toBeNull();
	});
});
