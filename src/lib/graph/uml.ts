// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-21
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// uml.ts -- reads the member lines of a UML class node (node type "uml-class"): one function
// for attribute lines, one for method lines. Each returns the line cut into tokens for syntax
// highlighting (visibility, name, type, default value, punctuation ...) and, when the line
// doesn't follow the notation, an error message for the format check. Nothing is ever
// rejected: a line with an error is still stored and drawn, just marked.
//
// Notation (UML class diagrams):
//   attribute   [visibility] [/] name [: Type] [= default]        e.g. "- count: int = 0"
//   method      [visibility] name([param, ...]) [: ReturnType]    e.g. "+ area(scale: double): double"
//   parameter   [in | out | inout] name [: Type] [= default]
//   visibility  + public, - private, # protected, ~ package;  / = derived attribute
//   Type        a name, optionally with dots, generics <...>, [] and a trailing ?
//               (e.g. List<String>, int[], Map<String, List<int>>, Date?)
//
// Used by: GraphNode.svelte (drawing), properties/PropsUmlMembers.svelte (editing, check).
// Details: docs/graph-uml.md
// -----------------------------------------------------------------------------------------

export type UmlTokenKind = 'visibility' | 'modifier' | 'name' | 'type' | 'default' | 'param' | 'punct' | 'text';

export interface UmlToken {
	text: string;
	kind: UmlTokenKind;
}

export interface UmlLine {
	tokens: UmlToken[]; // joined, they give back the line exactly
	error: string | null; // why the line doesn't follow the notation, or null
}

/** The visibility marks and what they mean. */
export const VISIBILITY: Record<string, string> = { '+': 'public', '-': 'private', '#': 'protected', '~': 'package' };

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*/;

/** Whether text is a type name: letters, digits, _ and dots, balanced <...>, [] and a trailing ?. */
export function isTypeName(text: string): boolean {
	const t = text.trim();
	if (!/^[A-Za-z_][\w.]*(?:<[\w.<>\[\], ?]*>)?(?:\[\])*\??$/.test(t)) return false;
	let depth = 0;
	for (const c of t) {
		if (c === '<') depth++;
		if (c === '>' && --depth < 0) return false;
	}
	return depth === 0;
}

// A small cursor over one line: takes pieces off the front and records them as tokens.
class Reader {
	tokens: UmlToken[] = [];
	constructor(private rest: string) {}
	get left(): string {
		return this.rest;
	}
	take(length: number, kind: UmlTokenKind): string {
		const text = this.rest.slice(0, length);
		if (text) this.tokens.push({ text, kind });
		this.rest = this.rest.slice(length);
		return text;
	}
	// moves past text without a token (the caller adds tokens for it itself)
	skip(length: number): void {
		this.rest = this.rest.slice(length);
	}
	space(): void {
		this.take(this.rest.length - this.rest.trimStart().length, 'text');
	}
	match(pattern: RegExp, kind: UmlTokenKind): string | null {
		const m = pattern.exec(this.rest);
		return m ? this.take(m[0].length, kind) : null;
	}
	// the remaining text, unread, marked as plain text (after an error)
	done(error: string | null): UmlLine {
		this.take(this.rest.length, 'text');
		return { tokens: this.tokens, error };
	}
}

// ": Type" at the cursor, tokens added; returns an error or null
function readType(r: Reader, stop: RegExp, what: string): string | null {
	r.take(1, 'punct'); // ':'
	r.space();
	const end = r.left.search(stop);
	const raw = end < 0 ? r.left : r.left.slice(0, end);
	const type = raw.trimEnd();
	if (!type) return `a type is missing after ':' (${what})`;
	if (!isTypeName(type)) return `"${type}" isn't a type name (${what})`;
	r.take(type.length, 'type');
	r.space();
	return null;
}

// leading visibility mark, if any
function readVisibility(r: Reader): void {
	r.space();
	if (r.left[0] && r.left[0] in VISIBILITY) {
		r.take(1, 'visibility');
		r.space();
	}
}

/** Reads one attribute line: `[visibility] [/] name [: Type] [= default]`. */
export function parseAttribute(line: string): UmlLine {
	const r = new Reader(line);
	readVisibility(r);
	if (r.left.startsWith('/')) {
		r.take(1, 'modifier');
		r.space();
	}
	if (!r.match(IDENT, 'name')) {
		return r.done(r.left ? `"${r.left.trim()}" doesn't start with a name` : 'the name is missing');
	}
	r.space();
	if (r.left.startsWith('(')) return r.done('looks like a method: methods go in the methods list');
	if (r.left.startsWith(':')) {
		const error = readType(r, /=/, 'attribute');
		if (error) return r.done(error);
	}
	if (r.left.startsWith('=')) {
		r.take(1, 'punct');
		r.space();
		if (!r.left.trim()) return r.done("a value is missing after '='");
		r.take(r.left.trimEnd().length, 'default');
		r.space();
	}
	if (r.left) return r.done(`unexpected "${r.left.trim()}": write "name: Type = value"`);
	return r.done(null);
}

// one parameter: `[in | out | inout] name [: Type] [= default]`, tokens added
function readParam(r: Reader, text: string): string | null {
	const p = new Reader(text);
	p.space();
	p.match(/^(?:inout|in|out)(?=\s)/, 'modifier');
	p.space();
	if (!p.match(IDENT, 'param')) return `parameter "${text.trim()}" should be "name: Type"`;
	p.space();
	if (p.left.startsWith(':')) {
		const error = readType(p, /=/, `parameter`);
		if (error) {
			p.done(null);
			r.tokens.push(...p.tokens);
			return error;
		}
	}
	if (p.left.startsWith('=')) {
		p.take(1, 'punct');
		p.space();
		if (!p.left.trim()) return `a value is missing after '=' in parameter "${text.trim()}"`;
		p.take(p.left.length, 'default');
	}
	if (p.left.trim()) return `unexpected "${p.left.trim()}" in parameter "${text.trim()}"`;
	p.done(null);
	r.tokens.push(...p.tokens);
	return null;
}

// splits a parameter list at commas outside <...>
function splitParams(text: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === '<') depth++;
		if (text[i] === '>') depth--;
		if (text[i] === ',' && depth === 0) {
			parts.push(text.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(text.slice(start));
	return parts;
}

/** Reads one method line: `[visibility] name([param, ...]) [: ReturnType]`. */
export function parseMethod(line: string): UmlLine {
	const r = new Reader(line);
	readVisibility(r);
	if (!r.match(IDENT, 'name')) {
		return r.done(r.left ? `"${r.left.trim()}" doesn't start with a name` : 'the name is missing');
	}
	r.space();
	if (!r.left.startsWith('(')) {
		return r.done(r.left.startsWith(':') ? 'looks like an attribute: a method needs ( ) after its name' : 'a method needs ( ) after its name');
	}
	r.take(1, 'punct');
	const close = r.left.lastIndexOf(')');
	if (close < 0) return r.done("the parameter list isn't closed: ')' is missing");
	const inner = r.left.slice(0, close);
	r.skip(close); // the parameters get their own tokens below
	if (inner.trim()) {
		const params = splitParams(inner);
		for (let i = 0; i < params.length; i++) {
			if (i > 0) r.tokens.push({ text: ',', kind: 'punct' });
			const error = readParam(r, params[i]);
			if (error) {
				// the rest of the parameter list and the line as plain text
				const shown = r.tokens.map((t) => t.text).join('');
				const rest = line.slice(shown.length);
				return { tokens: [...r.tokens, ...(rest ? [{ text: rest, kind: 'text' as const }] : [])], error };
			}
		}
	} else if (inner) {
		r.tokens.push({ text: inner, kind: 'text' });
	}
	r.take(1, 'punct'); // ')'
	r.space();
	if (r.left.startsWith(':')) {
		const error = readType(r, /$/, 'return type');
		if (error) return r.done(error);
	}
	if (r.left) return r.done(`unexpected "${r.left.trim()}" after the method: write "name(param: Type): ReturnType"`);
	return r.done(null);
}
