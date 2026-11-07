// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-06
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// keyboards.ts -- the physical keyboards the layout page draws, as data: every key with its
// KeyboardEvent.code, a default label (US layout), and its place and size in key units
// (1 unit = one letter key). A full-size keyboard: function row, main block, the navigation
// block with the arrows, and the numpad (shown or not).
//
// Two shapes of the main block: ANSI (US: wide left Shift, a Backslash key above Enter) and
// ISO (most of Europe, e.g. Turkish Q, German: an extra key left of Z (IntlBackslash), a tall
// Enter, the Backslash code on the key left of Enter).
//
// Labels: the page shows the user's own layout's characters where the browser tells them
// (navigator.keyboard.getLayoutMap, Chrome / Edge); these labels are the fallback.
//
// Used by: $lib/keymap/KeyboardView.svelte, the page (key names in lists).
// -----------------------------------------------------------------------------------------

import type { Physical } from './keymap';

export interface KeyCap {
	code: string;
	label: string;
	x: number; // key units from the left
	y: number; // key units from the top
	w: number;
	h: number;
}

// one row of keys from x, each "code|label" or "code|label|width"; "~||0.5" is a gap
function row(y: number, x: number, keys: string[]): KeyCap[] {
	const out: KeyCap[] = [];
	for (const spec of keys) {
		const [code, label, width] = spec.split('|');
		const w = Number(width ?? 1);
		if (code !== '~') out.push({ code, label, x, y, w, h: 1 });
		x += w;
	}
	return out;
}

const DIGITS = ['Backquote|`', 'Digit1|1', 'Digit2|2', 'Digit3|3', 'Digit4|4', 'Digit5|5', 'Digit6|6', 'Digit7|7', 'Digit8|8', 'Digit9|9', 'Digit0|0', 'Minus|-', 'Equal|='];
const letters = (s: string) => s.split('').map((c) => `Key${c}|${c}`);

const FUNCTION_ROW = row(0, 0, [
	'Escape|Esc', '~||1', 'F1|F1', 'F2|F2', 'F3|F3', 'F4|F4', '~||0.5', 'F5|F5', 'F6|F6', 'F7|F7', 'F8|F8', '~||0.5', 'F9|F9', 'F10|F10', 'F11|F11', 'F12|F12'
]);
const BOTTOM_ROW = row(5.5, 0, [
	'ControlLeft|Ctrl|1.25', 'MetaLeft|Win|1.25', 'AltLeft|Alt|1.25', 'Space|Space|6.25', 'AltRight|AltGr|1.25', 'MetaRight|Win|1.25', 'ContextMenu|Menu|1.25', 'ControlRight|Ctrl|1.25'
]);

const ANSI: KeyCap[] = [
	...row(1.5, 0, [...DIGITS, 'Backspace|Backspace|2']),
	...row(2.5, 0, ['Tab|Tab|1.5', ...letters('QWERTYUIOP'), 'BracketLeft|[', 'BracketRight|]', 'Backslash|\\|1.5']),
	...row(3.5, 0, ['CapsLock|Caps|1.75', ...letters('ASDFGHJKL'), 'Semicolon|;', "Quote|'", 'Enter|Enter|2.25']),
	...row(4.5, 0, ['ShiftLeft|Shift|2.25', ...letters('ZXCVBNM'), 'Comma|,', 'Period|.', 'Slash|/', 'ShiftRight|Shift|2.75'])
];

const ISO: KeyCap[] = [
	...row(1.5, 0, [...DIGITS, 'Backspace|Backspace|2']),
	...row(2.5, 0, ['Tab|Tab|1.5', ...letters('QWERTYUIOP'), 'BracketLeft|[', 'BracketRight|]']),
	{ code: 'Enter', label: 'Enter', x: 13.75, y: 2.5, w: 1.25, h: 2 }, // the tall ISO Enter
	...row(3.5, 0, ['CapsLock|Caps|1.75', ...letters('ASDFGHJKL'), 'Semicolon|;', "Quote|'", 'Backslash|#']),
	...row(4.5, 0, ['ShiftLeft|Shift|1.25', 'IntlBackslash|\\', ...letters('ZXCVBNM'), 'Comma|,', 'Period|.', 'Slash|/', 'ShiftRight|Shift|2.75'])
];

// navigation block and arrows, right of the main block
const NAV_X = 15.25;
const NAVIGATION: KeyCap[] = [
	...row(0, NAV_X, ['PrintScreen|PrtSc', 'ScrollLock|ScrLk', 'Pause|Pause']),
	...row(1.5, NAV_X, ['Insert|Ins', 'Home|Home', 'PageUp|PgUp']),
	...row(2.5, NAV_X, ['Delete|Del', 'End|End', 'PageDown|PgDn']),
	...row(4.5, NAV_X + 1, ['ArrowUp|↑']),
	...row(5.5, NAV_X, ['ArrowLeft|←', 'ArrowDown|↓', 'ArrowRight|→'])
];

const PAD_X = NAV_X + 3.25;
const NUMPAD: KeyCap[] = [
	...row(1.5, PAD_X, ['NumLock|Num', 'NumpadDivide|/', 'NumpadMultiply|*', 'NumpadSubtract|-']),
	...row(2.5, PAD_X, ['Numpad7|7', 'Numpad8|8', 'Numpad9|9']),
	{ code: 'NumpadAdd', label: '+', x: PAD_X + 3, y: 2.5, w: 1, h: 2 },
	...row(3.5, PAD_X, ['Numpad4|4', 'Numpad5|5', 'Numpad6|6']),
	...row(4.5, PAD_X, ['Numpad1|1', 'Numpad2|2', 'Numpad3|3']),
	{ code: 'NumpadEnter', label: 'Enter', x: PAD_X + 3, y: 4.5, w: 1, h: 2 },
	...row(5.5, PAD_X, ['Numpad0|0|2', 'NumpadDecimal|.'])
];

/** The keys of a keyboard of the given shape, with or without the numpad. */
export function keyboardKeys(physical: Physical, numpad: boolean): KeyCap[] {
	return [...FUNCTION_ROW, ...(physical === 'iso' ? ISO : ANSI), ...BOTTOM_ROW, ...NAVIGATION, ...(numpad ? NUMPAD : [])];
}

/** The keyboard's size in key units. */
export function keyboardSize(keys: KeyCap[]): { w: number; h: number } {
	return { w: Math.max(...keys.map((k) => k.x + k.w)), h: Math.max(...keys.map((k) => k.y + k.h)) };
}

// every key code any shape has, with its default label (ISO's "#" for Backslash loses to ANSI's "\")
const DEFAULT_LABELS = new Map<string, string>();
for (const k of [...keyboardKeys('iso', true), ...keyboardKeys('ansi', true)]) DEFAULT_LABELS.set(k.code, k.label);

/**
 * A key's label: the user's own layout's character when known (upper case in the user's
 * language, so Turkish i / ı become İ / I), else the default (US).
 */
export function keyLabel(code: string, layout?: Map<string, string> | null, locale?: string): string {
	const own = layout?.get(code);
	if (own && own.trim()) return own.length === 1 ? own.toLocaleUpperCase(locale) : own;
	return DEFAULT_LABELS.get(code) ?? code.replace(/^(Key|Digit)/, '');
}

/** Whether a key code is one of the drawn keys. */
export const isKnownKey = (code: string): boolean => DEFAULT_LABELS.has(code);
