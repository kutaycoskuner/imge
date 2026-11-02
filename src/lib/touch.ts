// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-02
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// touch.ts -- touch gestures for the graph editor's canvas (phones, tablets), as a Svelte
// action on the viewport: `<div use:touchGestures>`.
//
// One finger is turned into the mouse events the page already handles, so every mouse tool
// works by touch without its own code: dragging nodes, panning, linking from a port,
// resizing groups, scaling text and image nodes, moving a link's corner.
//   tap                  click (select; on empty space: clear the selection)
//   double tap           double-click (edit a node's name / text, a link's name)
//   drag                 mouse drag (what it does depends on where it starts, as with a mouse)
//   long press, then     the same with Shift held: on empty space a box selection, on a node
//   drag or release      adding it to / taking it out of the selection (a short vibration
//                        says the long press was recognised)
// Two fingers pinch to zoom around their middle and pan by moving it ($lib/camera).
//
// Mouse events are sent to the element under the finger (mousemove / mouseup bubble up to
// the window, where the page listens), so a link drag ends on the port the finger is over.
// The browser's own touch behaviour (scrolling, page zoom) is off on the canvas
// (touch-action: none in imge.css); fields and buttons keep their normal touch handling.
//
// Used by: routes/+page.svelte. Details: docs/graph-touch.md
// -----------------------------------------------------------------------------------------

import { panBy, zoomAt } from './camera';

/** Time a finger must rest before it counts as a long press (Shift), ms. */
export const LONG_PRESS_MS = 450;
/** Movement (px) a finger may make and still count as a tap or a long press. */
export const MOVE_SLOP = 8;
/** Longest time between the two taps of a double tap, ms. */
export const DOUBLE_TAP_MS = 320;

type Point = { x: number; y: number };

const at = (t: Touch): Point => ({ x: t.clientX, y: t.clientY });
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const middle = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
// fields and buttons keep the browser's own touch handling (focus, typing, pressing)
const native = (target: EventTarget | null) => target instanceof Element && !!target.closest('input, textarea, select, button, a');

/** The Svelte action: touch gestures on `el` (the canvas viewport). */
export function touchGestures(el: HTMLElement): { destroy: () => void } {
	// pending: one finger down, not yet a drag / long press; one: a mouse gesture running;
	// pinch: two fingers; done: a pinch ended with a finger still down (ignored until lifted)
	let mode: 'idle' | 'pending' | 'one' | 'pinch' | 'done' = 'idle';
	let start: Point = { x: 0, y: 0 };
	let last: Point = { x: 0, y: 0 };
	let target: Element = el;
	let shift = false;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let pinch = { dist: 1, mid: { x: 0, y: 0 } };
	let lastTap = { time: 0, at: { x: 0, y: 0 } };

	// a mouse event as the page expects it: left button, Shift for a long press
	function fire(type: string, p: Point, on: Element): void {
		on.dispatchEvent(
			new MouseEvent(type, { bubbles: true, cancelable: true, view: window, button: 0, buttons: type === 'mouseup' ? 0 : 1, clientX: p.x, clientY: p.y, shiftKey: shift })
		);
	}
	const under = (p: Point): Element => document.elementFromPoint(p.x, p.y) ?? el;

	function begin(): void {
		clearTimeout(timer);
		mode = 'one';
		fire('mousedown', start, target);
	}

	function onStart(event: TouchEvent): void {
		if (native(event.target)) return;
		event.preventDefault(); // no emulated mouse events, no page scroll or zoom
		if (event.touches.length === 1 && mode === 'idle') {
			start = last = at(event.touches[0]);
			target = event.target as Element;
			shift = false;
			mode = 'pending';
			timer = setTimeout(() => {
				if (mode !== 'pending') return;
				shift = true;
				navigator.vibrate?.(15);
				begin();
			}, LONG_PRESS_MS);
		} else if (event.touches.length === 2) {
			clearTimeout(timer);
			if (mode === 'one') fire('mouseup', last, under(last)); // the one-finger gesture ends here
			const a = at(event.touches[0]);
			const b = at(event.touches[1]);
			pinch = { dist: Math.max(1, distance(a, b)), mid: middle(a, b) };
			mode = 'pinch';
		}
	}

	function onMove(event: TouchEvent): void {
		if (mode === 'idle' || mode === 'done') return;
		event.preventDefault();
		if (mode === 'pinch') {
			if (event.touches.length < 2) return;
			const a = at(event.touches[0]);
			const b = at(event.touches[1]);
			const dist = Math.max(1, distance(a, b));
			const mid = middle(a, b);
			zoomAt(dist / pinch.dist, mid);
			panBy(mid.x - pinch.mid.x, mid.y - pinch.mid.y);
			pinch = { dist, mid };
			return;
		}
		last = at(event.touches[0]);
		if (mode === 'pending') {
			if (distance(last, start) <= MOVE_SLOP) return;
			begin();
		}
		fire('mousemove', last, under(last));
	}

	function onEnd(event: TouchEvent): void {
		if (mode === 'idle') return;
		event.preventDefault();
		if (mode === 'pinch' || mode === 'done') {
			mode = event.touches.length ? 'done' : 'idle';
			return;
		}
		if (mode === 'pending') {
			// a tap: press and release where the finger was; a second tap soon after is a double tap
			begin();
			fire('mouseup', start, target);
			const now = performance.now();
			if (now - lastTap.time < DOUBLE_TAP_MS && distance(start, lastTap.at) < MOVE_SLOP * 3) {
				fire('dblclick', start, target);
				lastTap = { time: 0, at: start };
			} else lastTap = { time: now, at: start };
		} else fire('mouseup', last, under(last));
		mode = 'idle';
	}

	function onCancel(): void {
		clearTimeout(timer);
		if (mode === 'one') fire('mouseup', last, under(last));
		mode = 'idle';
	}

	// not passive: preventDefault keeps the browser from scrolling or zooming the page
	el.addEventListener('touchstart', onStart, { passive: false });
	el.addEventListener('touchmove', onMove, { passive: false });
	el.addEventListener('touchend', onEnd, { passive: false });
	el.addEventListener('touchcancel', onCancel);
	return {
		destroy() {
			clearTimeout(timer);
			el.removeEventListener('touchstart', onStart);
			el.removeEventListener('touchmove', onMove);
			el.removeEventListener('touchend', onEnd);
			el.removeEventListener('touchcancel', onCancel);
		}
	};
}
