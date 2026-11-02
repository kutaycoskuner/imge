# Touch screens (phones, tablets)

The graph editor works with fingers as well as with a mouse and keyboard: one finger does what the mouse does, two fingers zoom and pan, and the Properties panel becomes a drawer on phones.

State as of 2026-11-02.

## Gestures

| Gesture | Does | Mouse equivalent |
|---|---|---|
| Tap a node or link | Select it | click |
| Tap empty space | Clear the selection | click |
| Drag a node | Move it (and the rest of the selection); snaps like a mouse drag | drag |
| Drag empty space | Pan the canvas | drag |
| Drag from a port to another port | Link them (also from an input, backwards) | drag |
| Drag a group's corner mark, a text / image node's scale handle, a link's highlighted segment | Resize, scale, move the corner / lane | drag |
| **Long press**, then drag on empty space | Box selection | Shift+drag |
| **Long press** on a node | Add it to the selection, or take it out | Shift+click |
| **Double tap** a node's name, a text node, a link | Edit the name / text | double-click |
| **Two fingers**: spread / pinch | Zoom in / out around the fingers | mouse wheel |
| **Two fingers**: move together | Pan | – |

- A long press is recognised after 0.45 s without moving (a short vibration where the device supports it); a finger that moves more than 8 px before that starts a normal drag.
- A second finger ends the one-finger gesture and starts zooming.
- On the canvas the browser's own scrolling and page zoom are off; the menu, the panel and their fields scroll and take typing as usual.

## Layout on small screens

- **Properties panel:** on screens up to 640 px wide it is a **drawer** from the right edge, as tall as the window, and starts **closed**; the tab on the right edge (finger-sized on touch screens) opens it, the chevron in its header closes it. Opening or closing it there isn't remembered, so a phone doesn't change the choice made on a wider screen.
- **Toolbar:** **Undo** and **Redo** buttons (a phone has no Ctrl+Z); on short screens (a phone held sideways, up to 560 px high) the toolbar has two columns so it stays on screen; on touch screens its buttons are bigger.
- **Finger-sized targets:** ports, group corner marks and scale handles take touches 12 px around them (they look the same).
- **Hidden ports** (Esc menu → Ports → hidden) show on the selected node, since a touch screen has no hover.

## What needs the panel or the menu instead of a key

| Key | On a touch screen |
|---|---|
| Delete | Delete node / Delete link in the Properties panel |
| L, D, R (link shape, arrow, route) | the link's Look section in the panel |
| N | the panel tab |
| Shift+A (add node) | the toolbar's Add Node (adds at the screen centre) |
| Esc (menu) | the toolbar's Open Graph button |
| Ctrl+Z / Ctrl+Y | the toolbar's Undo / Redo |
| F2 | double tap |

Not on touch screens yet: grouping (Ctrl+G / Ctrl+Shift+G), copy / paste (Ctrl+C / Ctrl+V), F (link two selected nodes), saving with Ctrl+S (the menu's Save works).

## How it works

`src/lib/touch.ts` is a Svelte action on the canvas (`use:touchGestures` in `routes/+page.svelte`). It turns one finger into the mouse events the page already handles (`mousedown` on what the finger touched, `mousemove` / `mouseup` on the element under the finger, Shift for a long press, `dblclick` for a double tap), so every mouse tool works by touch without code of its own; two fingers go straight to the camera (`zoomAt`, `panBy`). The styles for touch screens are `@media (pointer: coarse)` and `(hover: none)` rules in `static/styles/imge.css`, the panel's and the toolbar's components.

## Files

| File | Role |
|---|---|
| `src/lib/touch.ts` | The gestures (`touchGestures`; `LONG_PRESS_MS`, `MOVE_SLOP`, `DOUBLE_TAP_MS`). |
| `src/routes/+page.svelte` | Uses it on the canvas. |
| `src/lib/graph/store.ts` | `NARROW_WIDTH`: the panel starts closed, not remembered, on narrow screens. |
| `src/lib/components/properties/GraphPropertiesPanel.svelte` | The drawer and the finger-sized tab. |
| `src/lib/components/UI_GraphEditor.svelte` | Undo / Redo buttons, two columns on short screens. |

## Changes

- 2026-11-02 — first version: touch gestures (tap, double tap, drag, long press as Shift, pinch zoom and pan), the panel as a drawer on phones, Undo / Redo in the toolbar, finger-sized targets
