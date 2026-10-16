# Graph editor canvas

How the graph editor's endless canvas works: the camera, the two coordinate spaces, zoom, the dot grid and node rendering. Editing nodes and links: [graph-editing.md](graph-editing.md).

State as of 2026-10-14.

## Current feature set

| Feature | State |
|---|---|
| Endless canvas | Done. One camera `{x, y, zoom}` in `src/lib/camera.ts`; no fixed canvas size. |
| Coordinate system | World units, x to the right, y up (moving the mouse up increases y). (0, 0) is at the screen center after a reset; 1 unit = 1 px at zoom 1. |
| Pan | Drag empty space; the canvas follows the mouse at any zoom. |
| Zoom | Mouse wheel zooms toward the cursor; +/− buttons zoom ×1.2 toward the screen center. Range 0.04–4. |
| Fit graph | On load, and with the toolbar's corner-brackets button: the whole graph is centered and zoomed to fit the window (zoom at most 1). |
| Dot grid | Endless, faint background; 40-unit spacing that doubles when zoomed out; stays lined up with the nodes. Shown or hidden with the toolbar's dot grid button. |
| Origin marker | Development only: red/green L at (0, 0) pointing toward +x and +y, Blender axis colors, fixed 40 px size. |
| Coordinate tracker | Bottom right; whole world coordinates under the mouse. |
| Nodes | Loaded from `static/data/test-node-graph.json`: title, input points (left), output points (right). |
| Node and link editing | Select, add, rename, move, delete, link, detach: see [graph-editing.md](graph-editing.md). |
| Export | Downloads the graph as `graph_data.json`. |
| Assistance message | Toolbar buttons show a hint on hover; refused edits show a short message. |
| Test button | Pans the canvas 10 px to the right (click or Enter). |
| Not wired up yet | Import, adding/removing ports, undo. |

## Files

| File | Role |
|---|---|
| `src/lib/camera.ts` | The camera store, viewport size and all world/screen conversions. The only place with that math. |
| `src/routes/+page.svelte` | Loads the graph; turns mouse and keys into camera moves and graph edits (pan, zoom, select, drag, link, shortcuts). |
| `src/lib/graph/store.ts` | The open graph, the selection, and every node/link operation; the link rules live here. |
| `src/lib/components/GraphNode.svelte` | One node: title (with inline editing), ports, selected highlight. |
| `src/lib/components/GraphLinks.svelte` | SVG layer that draws the links and the preview while dragging a new one. |
| `src/lib/components/PolkaDots.svelte` | Endless dot grid that follows the camera. |
| `src/lib/components/OriginAxes.svelte` | Origin marker: red/green L at world (0, 0). |
| `src/lib/components/CoordTracker.svelte` | Shows the world coordinates under the mouse. |
| `src/lib/components/UI_GraphEditor.svelte` | Toolbar: zoom in/out, add node, fit graph, open (menu), export. |
| `static/styles/imge.css` | `.viewport`, `.world`, `.polka-dots`, `.node`, port, selection and link styles. |
| `static/data/test-node-graph.json` | Test graph; node `position` values are world coordinates. File structure and versions: [graph-format.md](graph-format.md). |

## Two coordinate spaces

- **Screen space:** CSS pixels of the browser window, `(0, 0)` at the top-left (what `event.clientX/Y` gives).
- **World space:** canvas units, the space the graph lives in.
    - origin `(0, 0)` is at the screen center when the view is reset
    - **x grows to the right, y grows upward**, like maths and Blender, so moving the mouse up increases y
        - screen space has y growing down, so y changes sign between the two spaces
        - node positions in the graph JSON are world coordinates, so a node with a larger y is drawn higher
    - at zoom 1, one world unit is one screen pixel

## The camera

The camera is one store, `camera = { x, y, zoom }`:

- `x`, `y`: the world point shown at the screen center
- `zoom`: screen pixels per world unit, limited to `0.04 .. 4`

Everything converts with the same formulas (`screenCenter` = half the window size, kept in the `viewport` store); y has a minus sign because world y grows up and screen y grows down:

```
screen.x =  (world.x - camera.x) * zoom + screenCenter.x
screen.y = -(world.y - camera.y) * zoom + screenCenter.y
world.x  =  (screen.x - screenCenter.x) / zoom + camera.x
world.y  = -(screen.y - screenCenter.y) / zoom + camera.y
```

Because the nodes, the dots, the origin marker and the coordinate tracker all use these formulas, they always agree. There is no fixed canvas size: the canvas is endless because only the camera moves, and the dots are drawn for whatever is on screen.

## Rendering the nodes

- `.world` is a 0×0 element at the window's top-left, with `transform-origin: 0 0`.
- The page gives it one transform: `translate(screenCenter.x - camera.x * zoom, screenCenter.y + camera.y * zoom) scale(zoom)`.
    - this puts world `(0, 0)` at the right screen position and scales everything inside around it
- Each `.node` is `position: absolute` at `top: 0; left: 0` and moved by `translate(position.x, -position.y)` in world units; the minus turns CSS's downward y into world's upward y. A node's position is its top-left corner.

## Panning and dragging

- Drag on empty space: the camera moves by the mouse delta divided by the zoom (`panBy`), so the canvas stays under the mouse at any zoom.
- Drag a node: its position (and that of every other selected node) changes by the mouse delta divided by the zoom, so the nodes stay under the mouse; dragging up increases y.
- Mouse move and mouse up are listened to on the window, so a drag doesn't get stuck when the mouse leaves the canvas.

## Zoom

- **Mouse wheel:** zooms toward the cursor; the point under the mouse stays where it is (`zoomAt` with the mouse position). The wheel delta goes through `exp()`, so mouse wheels and trackpads both feel smooth.
- **+ / − buttons:** zoom toward the screen center by a factor of 1.2 per press.
- Zoom is multiplied, not added, so every step feels the same size at any zoom level.
- **Fit graph** (on every load, and the toolbar's corner-brackets button):
    - measures the box around all nodes (their rendered size, since titles change it)
    - centers the camera on it and picks the largest zoom that shows it with 60 px to spare on each side (`fitBounds` in `camera.ts`)
    - never zooms in past 1, so a small graph isn't blown up; an empty graph goes to `{ x: 0, y: 0, zoom: 1 }`

## Dot grid

- **On / off:** the toolbar's dot grid button (dots in perspective: strong at the bottom while shown, all faded while hidden). A display setting remembered in this browser (`localStorage` key `imge.graphEditor.hideDotGrid`, stored only while hidden), not saved in the graph.
- One fixed, full-screen layer with a repeating `radial-gradient` background. The browser repeats it forever, so it never runs out.
- Tile size = spacing × zoom. Background position = the screen position of world `(0, 0)` minus half a tile, so a dot sits exactly on the origin and on every multiple of the spacing.
- Spacing is 40 world units. When zooming out would put dots closer than 24 px, the spacing doubles (80, 160, ...), so the grid stays sparse instead of vanishing or crowding.
- The dots are kept faint on purpose; they hint at space and stay out of the way:
    - radius 0.8 px at zoom 1, growing slightly with zoom between 0.6 and 1.2 px
    - color `--col-transparent` (the theme's text color at 60%), with the whole layer at opacity 0.32 (`DOT_OPACITY` in `PolkaDots.svelte`), so about 19% visible

## Origin marker

- A development aid: it's shown with `npm run dev` and left out of production builds (the page renders it only when SvelteKit's `dev` flag is true).
- An L with its corner on world (0, 0); its arms point where coordinates grow:
    - red arm toward +x (right), `#FF3352`
    - green arm toward +y (up), `#8BDC00`
    - both are Blender's default axis colors
- Drawn in screen space at `worldToScreen(0, 0)`: it moves with pan and zoom but keeps a fixed 40 px arm length (one dot spacing at zoom 1), like a gizmo, so it stays readable at zoom 0.04.
- Sits above the dots and below the nodes, dimmed to opacity 0.5, and ignores the mouse, so dragging over it still pans.

## Coordinate tracker

- Shows `screenToWorld(mouse)`, rounded to whole units.
- It also updates when the view moves under a still mouse (wheel zoom, toolbar buttons).

## Editing nodes and links

Moved to [graph-editing.md](graph-editing.md): mouse and keys, link rules, messages, and the functions behind them.

## What was fixed (2026-10-14) and why

Before this change, the nodes, dots and coordinates each used their own formula, and none included zoom correctly:

- **Nodes:** `transform: translate(...)` was combined with the separate CSS `scale:` property. The browser applies `scale` after `transform`, so the pan offset (and a `base / 1.5` centering constant) got multiplied by the zoom, and the scale was centered on the `.content` element instead of the screen.
- **Panning and node drag:** mouse deltas in screen pixels were used without dividing by zoom, so the canvas moved faster or slower than the mouse.
- **Coordinate tracker:** ignored zoom, so the same spot showed different numbers at different zoom levels.
- **Dots:**
    - `Math.abs(pan) % 41` reversed direction when panning past 0
    - the 41 didn't match the 40 px dot spacing, so dots slipped by 1 px per cycle
    - the 41 didn't change with zoom, so dots jumped while zoomed
    - the dots scaled around a point that wasn't the screen center
    - the 200% layer showed its edges below about zoom 0.5
    - `visibility: true/false` isn't valid CSS, so the grid was never hidden
- **Node CSS:** `.node` set `position: absolute` and then `position: relative`, so nodes were stacked in page flow and each node's position was shifted by the nodes above it. The outer layer and each node's inner box were both named `.content`, so the outer layer's 100% size rules also applied inside every node; the layer is now `.world`.
- **Zoom steps:** `+0.1` per press built up rounding errors and felt uneven; it's now a factor.

## Known limits

- The test graph is loaded from `static/data/test-node-graph.json` (upgraded to the current format version on load, see [graph-format.md](graph-format.md)); Import isn't wired up yet.
- Editing limits (no undo, fixed ports): see [graph-editing.md](graph-editing.md#known-limits).
- Every node is a DOM element; very large graphs may need culling (skip nodes outside the screen) later.

## Changes

- 2026-10-16 — dot grid can be hidden with a toolbar button (remembered in the browser)
- 2026-10-14 — the view fits the whole graph on load; the toolbar's "Reset view" became "Fit graph"
- 2026-10-14 — the graph editor is now the home page: `src/routes/+page.svelte` (was `src/routes/graph_editor/+page.svelte`; `/graph_editor` redirects to `/`)
- 2026-10-14 — origin marker shown only in development (`npm run dev`), not in production builds
- 2026-10-14 — "Editing nodes and links" (mouse and keys, link rules, how links are drawn, ports) moved to graph-editing.md; feature table points there
- 2026-10-14 — node and link editing: select, add (button / Shift+A), rename (double-click / F2), delete, link by drag or F, detach; links drawn as curves; ports stack in columns
- 2026-10-14 — test graph is now loaded through the format-version upgrade; link to graph-format.md
- 2026-10-14 — origin marker added (red/green L, Blender axis colors); world y axis now points up; dots made fainter (opacity 0.32, 24 px minimum spacing)
- 2026-10-14 — first version: camera, coordinate spaces, zoom, dot grid, node rendering and dragging, fixes made and why
