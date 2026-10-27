// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
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
//   attribute   [markers] [visibility] [/] name [: Type] [= default] [{properties}]
//                                             e.g. "- count: int = 0", "- radius: double {readOnly}"
//   method      [markers] [visibility] name([param, ...]) [: ReturnType] [{properties}]
//                                             e.g. "+ area(scale: double): double", "+ size(): int {query}"
//   parameter   [in | out | inout] name [: Type] [= default]
//   visibility  + public, - private, # protected, ~ package;  / = derived attribute
//   markers     {static} (drawn underlined) and, methods only, {abstract} (drawn in italics),
//               before or after the visibility: "{static} + count: int", "+ {abstract} area(): double";
//               the node draws the line's style instead of the marker text
//   properties  a UML property string at the end, comma-separated words, drawn as text:
//               attributes {readOnly} (Java final), {ordered}, {unique}, {id}, {redefines x} ...
//               (ATTRIBUTE_PROPERTIES), methods {query} ... (METHOD_PROPERTIES); also accepted
//               at the start like a marker ("{readOnly} - x: int"), then drawn at the end
//   Type        a name, optionally with dots, generics <...>, [] and a trailing ?
//               (e.g. List<String>, int[], Map<String, List<int>>, Date?)
//
// Used by: GraphNode.svelte (drawing), properties/PropsUmlMembers.svelte (editing, check).
// Details: docs/graph-uml.md
// -----------------------------------------------------------------------------------------

export type UmlTokenKind = 'visibility' | 'marker' | 'property' | 'modifier' | 'name' | 'type' | 'default' | 'param' | 'punct' | 'text';

export interface UmlToken {
	text: string;
	kind: UmlTokenKind;
	front?: boolean; // a property string written at the start; drawn at the end (drawnTokens)
}

export interface UmlLine {
	tokens: UmlToken[]; // joined, they give back the line exactly
	error: string | null; // why the line doesn't follow the notation, or null
	static: boolean; // {static}: a class member, drawn underlined
	abstract: boolean; // {abstract}: a method without a body here, drawn in italics
	properties: string[]; // the property string's words, e.g. ["readOnly"] (first word of each item)
}

/** The member markers: written {static} / {abstract} at the start of a line. */
export const UML_MARKERS = ['static', 'abstract'] as const;

/** Property strings an attribute may carry (UML 2: the first word of each item counts). */
export const ATTRIBUTE_PROPERTIES = ['readOnly', 'ordered', 'unordered', 'unique', 'nonunique', 'seq', 'sequence', 'id', 'union', 'composite', 'redefines', 'subsets'];
/** Property strings a method may carry. */
export const METHOD_PROPERTIES = ['query', 'ordered', 'unordered', 'unique', 'nonunique', 'redefines'];

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
	markers = new Set<string>(); // the {static} / {abstract} markers read
	properties: string[] = []; // property strings written at the start ({readOnly} - x: int)
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
		return this.line(this.tokens, error);
	}
	line(tokens: UmlToken[], error: string | null): UmlLine {
		return { tokens, error, static: this.markers.has('static'), abstract: this.markers.has('abstract'), properties: this.properties };
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

// {static} / {abstract} markers at the cursor, recorded in r.markers (a property string
// written there, {readOnly}, in r.properties); returns an error or null
function readMarkers(r: Reader): string | null {
	for (;;) {
		r.space();
		const m = /^\{\s*([A-Za-z]*)\s*\}/.exec(r.left);
		if (!m) return null;
		if ((UML_MARKERS as readonly string[]).includes(m[1])) {
			r.take(m[0].length, 'marker');
			r.markers.add(m[1]);
		} else if ([...ATTRIBUTE_PROPERTIES, ...METHOD_PROPERTIES].includes(m[1])) {
			r.take(m[0].length, 'property');
			r.tokens[r.tokens.length - 1].front = true;
			r.properties.push(m[1]);
		} else return `unknown marker "${m[0]}": write {static} or {abstract} (a property string such as {readOnly} goes at the end)`;
	}
}

// one item of a property string: a word, optionally with one argument ("redefines size")
const PROPERTY_ITEM = /^[A-Za-z]\w*(?:\s+[A-Za-z_][\w:.]*)?$/;

/**
 * The property string at the end of a line ("{readOnly}", "{ordered, unique}"), with its
 * tokens; null when the line doesn't end in one. Only words count, so a default value in
 * braces ("= {1, 2}") stays a default.
 */
function trailingProperties(line: string): { start: number; tokens: UmlToken[]; names: string[] } | null {
	const m = /\{([^{}]*)\}(\s*)$/.exec(line);
	if (!m || !line.slice(0, m.index).trim()) return null;
	const items = m[1].split(',');
	if (!items.every((item) => PROPERTY_ITEM.test(item.trim()))) return null;
	let start = m.index;
	while (start > 0 && /\s/.test(line[start - 1])) start--;
	const tokens: UmlToken[] = [];
	const add = (text: string, kind: UmlTokenKind) => text && tokens.push({ text, kind });
	add(line.slice(start, m.index), 'text');
	add('{', 'punct');
	items.forEach((item, i) => {
		if (i > 0) add(',', 'punct');
		const lead = item.length - item.trimStart().length;
		add(item.slice(0, lead), 'text');
		add(item.trim(), 'property');
		add(item.slice(lead + item.trim().length), 'text');
	});
	add('}', 'punct');
	add(m[2], 'text');
	return { start, tokens, names: items.map((item) => item.trim().split(/\s+/)[0]) };
}

// whether the property words fit the member; returns an error or null
function checkProperties(names: string[], member: 'attribute' | 'method'): string | null {
	const allowed = member === 'attribute' ? ATTRIBUTE_PROPERTIES : METHOD_PROPERTIES;
	for (const name of names) {
		if (allowed.includes(name)) continue;
		if (name === 'readOnly') return 'only attributes can be {readOnly}';
		if ((UML_MARKERS as readonly string[]).includes(name)) return `{${name}} goes at the start of the line`;
		return `unknown property "{${name}}": e.g. ${member === 'attribute' ? '{readOnly}, {ordered}, {unique}' : '{query}'}`;
	}
	return null;
}

// a "{" the line still has where only a property string could be: never closed, or not one
function braceError(rest: string): string {
	return rest.includes('}') ? `"${rest.trim()}" isn't a property string: write e.g. {readOnly}` : "the property string isn't closed: '}' is missing";
}

// a member line with its property string at the end read separately: the part before it by
// `body`, then the property tokens added and checked
function withProperties(line: string, member: 'attribute' | 'method', body: (text: string) => UmlLine): UmlLine {
	const props = trailingProperties(line);
	const read = body(props ? line.slice(0, props.start) : line);
	if (!props) return read;
	return {
		...read,
		tokens: [...read.tokens, ...props.tokens],
		properties: [...read.properties, ...props.names],
		error: read.error ?? checkProperties(props.names, member)
	};
}

// markers, visibility, markers again (both orders are common); returns an error or null
function readStart(r: Reader): string | null {
	return readMarkers(r) ?? (readVisibility(r), readMarkers(r));
}

/**
 * The tokens a node draws: without the markers and the space after them (the node shows
 * them as the line's style instead); a property string written at the start moves to the
 * end, where UML writes it.
 */
export function drawnTokens(line: UmlLine): UmlToken[] {
	const out: UmlToken[] = [];
	const moved: string[] = [];
	for (let i = 0; i < line.tokens.length; i++) {
		const token = line.tokens[i];
		if (token.kind !== 'marker' && !token.front) {
			out.push(token);
			continue;
		}
		if (token.front) moved.push(token.text.replace(/[{}\s]/g, ''));
		if (line.tokens[i + 1]?.kind === 'text' && !line.tokens[i + 1].text.trim()) i++;
	}
	if (moved.length) {
		out.push({ text: ' ', kind: 'text' }, { text: '{', kind: 'punct' });
		moved.forEach((name, i) => {
			if (i > 0) out.push({ text: ', ', kind: 'punct' });
			out.push({ text: name, kind: 'property' });
		});
		out.push({ text: '}', kind: 'punct' });
	}
	return out;
}

/** Reads one attribute line: `[markers] [visibility] [/] name [: Type] [= default] [{properties}]`. */
export const parseAttribute = (line: string): UmlLine => withProperties(line, 'attribute', attributeBody);

function attributeBody(line: string): UmlLine {
	const r = new Reader(line);
	const markerError = readStart(r) ?? checkProperties(r.properties, 'attribute');
	if (markerError) return r.done(markerError);
	if (r.markers.has('abstract')) return r.done('only methods (and classes) can be {abstract}');
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
		const error = readType(r, /[={]/, 'attribute');
		if (error) return r.done(error);
	}
	if (r.left.startsWith('=')) {
		r.take(1, 'punct');
		r.space();
		if (!r.left.trim()) return r.done("a value is missing after '='");
		const open = /\{[^}]*$/.exec(r.left); // "= 0 {readOnly": a property string never closed
		if (open) return r.done(braceError(open[0]));
		r.take(r.left.trimEnd().length, 'default');
		r.space();
	}
	if (r.left.startsWith('{')) return r.done(braceError(r.left));
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

/** Reads one method line: `[markers] [visibility] name([param, ...]) [: ReturnType] [{properties}]`. */
export const parseMethod = (line: string): UmlLine => withProperties(line, 'method', methodBody);

function methodBody(line: string): UmlLine {
	const r = new Reader(line);
	const markerError = readStart(r) ?? checkProperties(r.properties, 'method');
	if (markerError) return r.done(markerError);
	if (r.markers.has('static') && r.markers.has('abstract')) return r.done("a method can't be both {static} and {abstract}");
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
				return r.line([...r.tokens, ...(rest ? [{ text: rest, kind: 'text' as const }] : [])], error);
			}
		}
	} else if (inner) {
		r.tokens.push({ text: inner, kind: 'text' });
	}
	r.take(1, 'punct'); // ')'
	r.space();
	if (r.left.startsWith(':')) {
		const error = readType(r, /\{/, 'return type');
		if (error) return r.done(error);
	}
	if (r.left.startsWith('{')) return r.done(braceError(r.left));
	if (r.left) return r.done(`unexpected "${r.left.trim()}" after the method: write "name(param: Type): ReturnType"`);
	return r.done(null);
}
