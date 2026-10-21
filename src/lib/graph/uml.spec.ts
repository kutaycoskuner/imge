// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// uml.spec.ts -- checks reading UML attribute and method lines: the tokens for highlighting
// (they always join back to the line), and the format check's error messages.
// Run: npm run test:unit -- --run
// -----------------------------------------------------------------------------------------

import { describe, it, expect } from 'vitest';
import { parseAttribute, parseMethod, isTypeName, type UmlLine } from './uml';

// the tokens as "kind:text" without spaces, for short expectations
const kinds = (l: UmlLine) => l.tokens.filter((t) => t.text.trim()).map((t) => `${t.kind}:${t.text}`);
const joined = (l: UmlLine) => l.tokens.map((t) => t.text).join('');

describe('type names', () => {
	it('accepts plain, dotted, generic, array and nullable types', () => {
		for (const t of ['int', 'String', 'java.util.Date', 'List<String>', 'Map<String, List<int>>', 'int[]', 'Date?', 'T']) {
			expect(isTypeName(t), t).toBe(true);
		}
	});

	it('refuses things that are not type names', () => {
		for (const t of ['', '1abc', 'List<String', 'a b', 'int)', 'Map<>>']) expect(isTypeName(t), t).toBe(false);
	});
});

describe('attributes', () => {
	it('reads visibility, name, type and default', () => {
		const l = parseAttribute('- count: int = 0');
		expect(l.error).toBeNull();
		expect(kinds(l)).toEqual(['visibility:-', 'name:count', 'punct::', 'type:int', 'punct:=', 'default:0']);
	});

	it('allows no visibility, no type, a derived mark and generic types', () => {
		expect(parseAttribute('name').error).toBeNull();
		expect(kinds(parseAttribute('+ /area: double'))).toEqual(['visibility:+', 'modifier:/', 'name:area', 'punct::', 'type:double']);
		expect(parseAttribute('# items: List<Map<String, int>>').error).toBeNull();
	});

	it('explains what is wrong', () => {
		expect(parseAttribute('+ : int').error).toMatch(/doesn't start with a name/);
		expect(parseAttribute('+ count:').error).toMatch(/type is missing/);
		expect(parseAttribute('+ count: 12x').error).toMatch(/isn't a type name/);
		expect(parseAttribute('+ count = ').error).toMatch(/value is missing/);
		expect(parseAttribute('+ area(): double').error).toMatch(/methods go in the methods list/);
		expect(parseAttribute('+ count int').error).toMatch(/unexpected "int"/);
	});

	it('always gives back the whole line in its tokens', () => {
		for (const line of ['- count: int = 0', '  +  /x : T  ', '+ count:', '+ : int', 'a b c']) {
			expect(joined(parseAttribute(line))).toBe(line);
		}
	});
});

describe('methods', () => {
	it('reads visibility, name, parameters and return type', () => {
		const l = parseMethod('+ area(scale: double, unit: String = "cm"): double');
		expect(l.error).toBeNull();
		expect(kinds(l)).toEqual([
			'visibility:+', 'name:area', 'punct:(',
			'param:scale', 'punct::', 'type:double', 'punct:,',
			'param:unit', 'punct::', 'type:String', 'punct:=', 'default:"cm"',
			'punct:)', 'punct::', 'type:double'
		]);
	});

	it('allows no parameters, no return type, direction words and generic parameters', () => {
		expect(parseMethod('draw()').error).toBeNull();
		expect(parseMethod('- reset( )').error).toBeNull();
		expect(kinds(parseMethod('~ copy(in from: List<Map<String, int>>)'))).toContain('modifier:in');
		expect(parseMethod('~ copy(in from: List<Map<String, int>>)').error).toBeNull();
	});

	it('explains what is wrong', () => {
		expect(parseMethod('+ area: double').error).toMatch(/looks like an attribute/);
		expect(parseMethod('+ area').error).toMatch(/needs \( \) after its name/);
		expect(parseMethod('+ area(scale: double').error).toMatch(/'\)' is missing/);
		expect(parseMethod('+ area(1scale)').error).toMatch(/should be "name: Type"/);
		expect(parseMethod('+ area(): ').error).toMatch(/type is missing/);
		expect(parseMethod('+ area() double').error).toMatch(/unexpected "double"/);
	});

	it('always gives back the whole line in its tokens', () => {
		for (const line of ['+ area(scale: double): double', 'draw()', '+ area(1scale): x', '+ area(scale: double', ' f( a , b ) : T ']) {
			expect(joined(parseMethod(line))).toBe(line);
		}
	});
});
