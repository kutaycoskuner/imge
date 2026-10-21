# Node and link editing

How to create, edit and delete nodes and links in the graph editor, the rules links follow, and a reference for the functions behind it.

State as of 2026-10-21.

- [Using it](#using-it)
    - [Mouse and keys](#mouse-and-keys)
    - [Link rules](#link-rules)
    - [Link shapes](#link-shapes)
    - [Arrows and link names](#arrows-and-link-names)
    - [Cycles and self-loops](#cycles-and-self-loops)
    - [Direction and transpose](#direction-and-transpose)
    - [Undo and redo](#undo-and-redo)
    - [Messages](#messages)
- [Functions](#functions)
    - [Stores](#stores)
    - [Nodes](#nodes)
    - [Links](#links)
    - [Selection](#selection)
- [How it fits together](#how-it-fits-together)
- [Known limits](#known-limits)

## Using it

### Mouse and keys

| Input | Action |
|---|---|
| Click node / link | Select it (selected items turn orange). |
| Shift+click node | Add it to the selection, or remove it. |
| Click empty space | Clear the selection (and start panning). |
| Shift+drag empty space | Box selection: draws a rectangle and adds every node it touches (partly inside is enough; a group only when it is completely inside) to the selection; the selection updates while you drag, and nodes the box leaves again drop out. Esc cancels and restores the selection from before. A Shift+click without dragging keeps the selection. |
| Drag node | Move it, and every other selected node with it. Its top-left corner snaps to half grid squares (the dots and the midpoints between them); hold **Alt** to move freely, or turn snapping off with the toolbar's snap button. |
| Toolbar "Add Node" | New node at the screen center. |
| **Shift+A** | New node centered on the mouse. |
| Double-click the name, or **F2** | Edit the node's name. Enter or clicking away saves; Esc cancels (without opening the menu); an empty name keeps the old one. |
| **Delete** / **Backspace** | Remove the selected link, or the selected nodes together with all their links. |
| **Ctrl+C** (Cmd+C) | Copy the selected nodes and the links between them (links to nodes that aren't selected are left out). Kept in memory for this tab, so it can be pasted into another graph opened in the same tab; a reload forgets it. With no node selected, the browser's own copy runs. |
| **Ctrl+Z** (Cmd+Z) | Undo the last change; see [Undo and redo](#undo-and-redo). |
| **Ctrl+Y** or **Ctrl+Shift+Z** | Redo what was undone. |
| **Ctrl+V** (Cmd+V) | Paste the copied nodes as new nodes (new ids; names, ports and link looks kept), their layout unchanged, with the group's top-left corner at the mouse, snapped like a dragged node unless snapping is off. The pasted nodes become the selection, ready to drag. Pasting again without moving the mouse puts the next copy one grid square further down-right. |
| Drag from an output point | A dashed curve follows the mouse; release on an input point to link. |
| Drag from an input point without links | The same, backwards; release on an output point. |
| Drag from an input point that has links | Picks up its most recent link from the output end: release on another input to re-route it (it keeps its id and name), on empty space to remove it. |
| **F** | Link two selected nodes: first output into the first input, left node into right node; if that link already exists (or isn't possible), right into left. |
| **Shift+N** | New empty graph (asks first if the open one has unsaved changes); see [graph-saving.md](graph-saving.md). Ctrl+Shift+N can't be used: the browser keeps it (private window in Chrome / Edge, reopen closed window in Firefox). |
| **L** | Next shape for the selected link: spline → line → manhattan → spline (saved in the link). |
| **D** | Next arrow for the selected link: forward → both → backward → none (saved in the link). |
| **R** | Route the selected link above or below its nodes (used when it closes a cycle or is a self-loop). |
| Double-click a link, or **F2** with a link selected | Edit the link's name, shown in the middle of the link. Enter or clicking away saves; Esc cancels; an empty name removes it. |
| Drag a selected manhattan link's middle segment | Move its corner (the highlighted grab area); saved as the link's `bend`. |
| **+** / **=** and **-** | Zoom in / out by ×1.2 toward the screen center (the mouse wheel zooms toward the cursor). |
| **Home** | Fit the whole graph in the window (same as the toolbar's corner-brackets button). |
| **N** | Show or hide the Properties panel: the selection's details, all edited there; see [graph-properties-panel.md](graph-properties-panel.md). |
| **Ctrl+S** (Cmd+S) | Save the graph to its file; a graph without a file yet opens the menu (see [graph-saving.md](graph-saving.md)). Replaces the browser's "save page". |
| **Ctrl+Shift+S** (Cmd+Shift+S) | Download the graph as a `.json` file (same as the toolbar's export button). |
| **Esc** | Cancel a link drag; otherwise open the menu (open / save graphs, see [graph-saving.md](graph-saving.md)). |

- Shortcuts are ignored while typing a name, so Backspace there edits text instead of deleting the node.
- The Esc menu's **Keybindings** tab lists these keys as key caps (`GraphKeysMenu.svelte`; keep it in step with this table).
- Shortcuts are paused while the Esc menu is open, except Ctrl+S and Ctrl+Shift+S, which work everywhere.
- The toolbar's hover hints and the menu's buttons show their key as key caps, e.g. <kbd>Shift</kbd>+<kbd>A</kbd>: a hint text puts keys in square brackets (`"Add Node [Shift+A]"`) and `AssistanceMsg` draws them with `Kbd.svelte`.
- Other Ctrl / Cmd / Alt combinations are left to the browser.
- A new node is built from the Basic type's template: named "Node", with one input and one output.

### Link rules

- A link connects a port that gives links to one that takes them: an output (right side of a node) to an input (left side). Which port kinds may be linked is decided in one place, `CAN_LINK` (out → in, and two-way `any` ports with everything; no node type has `any` ports yet).
- A drag may start at either end: dragging from an input without links to an output makes the same link, stored from the output to the input.
- Cycles are allowed (1 → 2 → 1), and so is a link from a node to itself (a self-loop); see [Cycles and self-loops](#cycles-and-self-loops).
- Any number of links may meet at a port, in both directions (many-to-many): linking into a connected input adds a link.
- No exact duplicates: one link per output-port → input-port pair.
- An output can feed any number of inputs.

Every link has its own id (`l1`, `l2` ...), which never changes, even when the link is re-routed (see [graph-format.md](graph-format.md)).

### Link shapes

Every link stores its own `shape` (see [graph-format.md](graph-format.md)):

| Shape | Look |
|---|---|
| `spline` | Curve leaving the output to the right and entering the input from the left. New links start as spline. |
| `line` | Straight line. |
| `manhattan` | Right angles: out horizontally, one vertical segment, in horizontally. A backward link (input left of its output) goes out a short stub, across, and back in, so it doesn't run through its nodes. |

- **One link:** select it and press <kbd>L</kbd>.
- **The corner of a manhattan link:** select the link; its middle segment gets a highlighted grab area. Drag it sideways (or up and down for a backward link) to move the corner. It's stored as `bend`, a fraction of the gap, so it stays in proportion when nodes move.
- **All links**, in the Esc menu's **Links** section:
    - **Show all links as …**: a display-only override. Every link is drawn in that shape, but nothing in the graph changes; choose "their own shape" to see each link's own again. It is remembered in this browser (`localStorage` key `imge.graphEditor.linkShapeOverride`), never saved in the graph file.
    - **Apply shape to all links**: writes the chosen shape into every link (asks first) and turns the display override off. Bends are kept.
- While the override is on, <kbd>L</kbd> still changes the link's own shape; the message says it's hidden by the override.

### Arrows and link names

Every link stores its own `arrow`, relative to its direction (output → input):

| Arrow | Look |
|---|---|
| `forward` | → arrowhead at the input. New links start with it. |
| `backward` | ← arrowhead at the output. |
| `both` | ↔ arrowheads at both ends. |
| `none` | no arrowhead (graphs from before v4 open this way, so they look as before). |

- **Splines and arrowheads:** a spline leaves and enters its ports with a short straight piece (17 units, as long as an arrowhead reaches), and curves only in between. An arrowhead is drawn straight along the end of its line, so this keeps it on the line however the nodes are placed.
- **One link:** select it and press <kbd>D</kbd>.
- **All links**, in the Esc menu's **Links** section, the same way as shapes:
    - **Show all arrows as …**: display only, not saved (`localStorage` key `imge.graphEditor.linkArrowOverride`)
    - **Apply arrow to all links**: writes the arrow into every link (asks first) and turns the arrow override off
    - **Direction chevrons**: a display option (`imge.graphEditor.showChevrons`) that adds small chevrons in the middle of every link that has an arrow, pointing the same way. Useful where the ends are hidden behind other lines.
- Arrowheads end just outside the port square, so the port never covers them. Lines, arrowheads and chevrons share one solid colour (`--col-link` in `imge.css`: the text colour mixed into the background), so a line never shows through its arrowhead.
- **Names:** a link's `name` is drawn in the middle of the link, with an outline in the background colour so it stays readable over other lines. Double-click a link (or select it and press <kbd>F2</kbd>) to edit it.

### Cycles and self-loops

- **Cycles are allowed:** 1 → 2 → 1, 1 → 2 → 3 → 1, several at once.
- **Which link closes a cycle** is worked out on every change (`findBackLinks()`), not stored:
    - the editor walks the graph from the leftmost node, following links in left-to-right order of their targets
    - a link to a node that is already on the current walk path closes a cycle
    - so "left = earlier" is the reading direction; in 1 → 2 → 1 with 1 on the left, 2 → 1 closes it
- **That link goes around its nodes** instead of across them: out of the output, along a lane above (default) or below the nodes, and back into the input, in its own shape (spline, line or manhattan).
    - the lane starts just outside the link's own two nodes and moves further out only past nodes it would run through, so it takes the nearest free gap
    - links whose lanes would overlap get stacked lanes
- **Self-loops** (a node's output into its own input) are drawn the same way: a loop around the node.
- **Changing the route:** select the link and press <kbd>R</kbd> (above ↔ below, saved as `route`). The selected link's lane gets a highlighted grab area: drag it to move the lane closer or further (saved as `bend`).
- Links that only point backwards on screen without forming a cycle (an input placed left of its output) keep their normal drawing.

### Direction and transpose

A graph's **direction** is **left-to-right** (the default) or **top-to-bottom**; it's stored in the graph file (`metadata.direction`). **Transpose** switches it and turns the layout: with the toolbar's Transpose button (crossed arrows: the current direction is drawn strong, the other faded) or the **Direction** choice in the Esc menu's **Graph** section.

| | left-to-right | top-to-bottom |
|---|---|---|
| Ports | inputs on the left edge, outputs on the right | inputs on the top edge, outputs on the bottom |
| Links | leave rightwards, enter from the left | leave downwards, enter from above |
| Manhattan | out horizontally, vertical segment, in horizontally | out vertically, horizontal segment, in vertically |
| Links around their nodes (`route`) | above / below | left / right |
| Reading order (F key, which link closes a cycle) | left to right | top to bottom |

- **Transpose turns the layout:** every node's centre (x, y) moves to (−y · k, −x / k), so a left-to-right chain becomes a top-to-bottom one, and nodes stacked from top to bottom end up side by side from left to right, in the same order. The view then fits the whole graph again.
    - k is the nodes' average (width + 30) / height: nodes are much wider than tall, so siblings need more room side by side than they had stacked; without it they would overlap
    - the same k applies both ways, so switching back gives exactly the original positions
    - it turns the layout, it doesn't re-arrange it: a layout built for one direction can come out wide and flat in the other (the feature map, whose branches are stacked, spreads out sideways in top-to-bottom)
- Links are drawn by the same geometry in both directions: for top-to-bottom it runs with x and y swapped (`GraphLinks.svelte`, `flow`).

### Undo and redo

- **Ctrl+Z** (Cmd+Z) undoes the last change to the graph; **Ctrl+Y** or **Ctrl+Shift+Z** redoes it. Up to 100 steps are kept.
- **What is one step:** every edit: add, paste, delete, rename, link, shape / arrow / route, transpose, the menu's "apply to all". A mouse gesture is one step however far it goes: dragging nodes, dragging or re-routing a link, moving a link's corner or lane.
- **Not steps:** selection, camera (pan / zoom) and display settings (dot grid, snapping, link overrides) aren't part of the graph and aren't undone.
- **Loading clears it:** opening a graph or an example, or Shift+N, starts a fresh history; undo never goes back into the previous graph.
- **Unsaved marker:** undoing back to the graph as it was opened or last saved clears the "unsaved changes" marker again; redoing sets it.
- A new edit after undoing drops the steps that could have been redone. The history is kept in memory only, not in the file; a reload forgets it.
- While typing a name, Ctrl+Z undoes typing in the field (the browser's own), not graph changes.

### Messages

When an action is refused or changes something you might not expect, a short message appears at the bottom of the screen for 2.5 s:

| Situation | Message |
|---|---|
| The same output-to-input link already exists | That link already exists |
| Output dropped on an output, or input on an input (kinds `CAN_LINK` doesn't allow) | Links go from an output (right) to an input (left) |
| F with fewer or more than two nodes selected | Select two nodes (Shift+click), then press F |
| F when both directions are already linked (or a node has no output / input) | These nodes are already linked (or have no output / input) |
| Ctrl+Z / Ctrl+Y with nothing left | Nothing to undo / Nothing to redo |

## Functions

All in `src/lib/graph/store.ts`. Graph operations are **pure**: they take a graph and return a new one, never change the one they were given, and return it unchanged when there is nothing to do. Components apply them to the open graph with `graph.update((g) => op(g, ...))`.

Types: `Graph`, `GraphNode`, `Link` come from `src/lib/graph/types.ts`; `Point` is `{ x, y }` in world coordinates (y up); `LinkEnd` is `{ node, port }` (node id + port id). Ids are strings.

### Stores

| Store | Holds |
|---|---|
| `graph` | The open graph (`Graph`). Starts as `emptyGraph()`; the page fills it after loading and upgrading the file. |
| `selection` | `{ nodes: string[], link: string \| null }`: selected node ids in selection order, or one selected link id. Never both. |
| `nodeClipboard` | `{ nodes, links } \| null`: what Ctrl+C copied, in memory for this tab (not saved). |
| `editingNodeId` | Id of the node whose name is being edited, or `null`. `GraphNode` shows the text field for that node. |
| `editingLinkId` | Id of the link whose name is being edited, or `null`. `GraphLinks` shows the text field in the middle of that link. |
| `linkShapeOverride` / `linkArrowOverride` | Display-only shape / arrow for all links, or `null` for each link's own; never written into the graph. |
| `showChevrons` | Display-only: direction chevrons in the middle of links. |
| `showDotGrid` / `snapToGrid` / `showPropertiesPanel` | Display settings: dot grid, snapping, and the Properties panel shown or hidden. |

`persistViewSettings()` (called by the page on mount) restores the three display settings from this browser and saves every change there.

### Nodes

| Function | Does | Returns |
|---|---|---|
| `emptyGraph()` | A graph with no nodes or links, stamped with the current format. | `Graph` |
| `nextNodeId(g)` | `n` + highest `n<number>` id + 1 (ids in another form are ignored), so ids are never reused after a delete in the middle. | `string` |
| `nextLinkId(g)` | `l` + highest `l<number>` link id + 1; never reused either. | `string` |
| `addNode(g, at, name?)` | Adds a basic node built from the basic template (`node-types.ts`): ports `i1` (in) and `o1` (out), `content` `{ name: "Node", color: null }` (`name` replaces the default), `typeVersion` of the template; roughly centered on `at`, its position (top-left corner) rounded to whole units. | `{ graph, node }` |
| `renameNode(g, nodeId, name)` | Sets `content.name`, trimmed, for a node whose content has a name. A blank name keeps the old one. | `Graph` |
| `setNodeColor(g, nodeIds, color)` | Sets `content.color` of the given nodes whose content has a colour (`"#rrggbb"`, or `null` for the default look); the same graph back when all already have it. | `Graph` |
| `setNodeType(g, nodeId, type)` | Sets a node's `type` (Properties panel's Type dropdown) and reshapes it to the type's template, port kind by port kind: a kind the type has no ports of is removed with its links, a kind the node lacks comes from the template; `content` gets the template's missing keys (existing ones kept); `typeVersion` follows the type. The same graph back when unchanged; one undo restores everything. | `Graph` |
| `isGroup(node)` / `hasLinks(g, nodeId)` | Whether a node is a group (frame without ports; `addLink` and `quickLink` never use it) / whether any link starts or ends at it. | `boolean` |
| `setNodePosition(g, nodeId, at)` | Puts one node's top-left corner at a world point (Properties panel); the same graph back when it is already there. | `Graph` |
| `moveNodes(g, nodeIds, dx, dy)` | Moves the given nodes by a world-space delta. | `Graph` |
| `removeNodes(g, nodeIds)` | Removes the nodes and every link that starts or ends at them. | `Graph` |
| `createNodeAt(at)` | Store action: adds a node to the open graph centered on `at` and selects only it. Used by Shift+A and the toolbar. | the new `GraphNode` |

### Links

| Function | Does | Returns |
|---|---|---|
| `CAN_LINK` | Which port kinds may be linked: `{ out: [in, any], in: [out, any], any: [in, out, any] }`. The only place this is decided. | constant |
| `portOf(g, end)` | The port a link end points at; `undefined` for a missing node / port or a group's. | `Port \| undefined` |
| `addLink(g, { source, target, type?, name?, shape?, bend?, arrow?, route?, id? })` | Connects two ports whose kinds `CAN_LINK` allows, following the [link rules](#link-rules); the ends may come in either order and the link is stored from the giving end (out / any) to the taking end (in / any); source and target may be the same node. Defaults: shape `spline`, arrow `forward`, route `above`. Gets the next id, or the given `id` when re-routing (if no other link uses it); re-routing also passes the old shape, bend, arrow and route. | `{ graph, outcome, link? }`, see below |
| `removeLink(g, linkId)` | Removes one link by its id. | `Graph` |
| `cycleLinkShape(g, linkId)` | Next shape for one link: spline → line → manhattan → spline. | `Graph` |
| `setAllLinkShapes(g, shape)` | Writes one shape into every link ("Apply shape to all links"); bends are kept. | `Graph` |
| `setLinkStyle(g, linkId, style)` | Sets any of `shape`, `arrow`, `route` of one link (Properties panel); the same graph back when nothing changes, so no undo step. | `Graph` |
| `setLinkBend(g, linkId, bend)` | Sets a link's `bend`, clamped to 0..1 (a manhattan corner, or the lane distance of a link going around). | `Graph` |
| `cycleLinkArrow(g, linkId)` | Next arrow for one link: forward → both → backward → none → forward. | `Graph` |
| `setAllLinkArrows(g, arrow)` | Writes one arrow into every link ("Apply arrow to all links"). | `Graph` |
| `toggleLinkRoute(g, linkId)` | Flips a link's route: above ↔ below. | `Graph` |
| `renameLink(g, linkId, name)` | Sets a link's name (trimmed); an empty name removes it. | `Graph` |
| `transposeGraph(g, sizes)` | Turns the layout between the directions: node centres (x, y) → (−y · k, −x / k), k = average (width + 30) / height from `sizes`; its own inverse. | `Graph` |
| `setDirection(g, direction, sizes)` | Sets `metadata.direction` and turns the layout with `transposeGraph` (Transpose); unchanged when it's already that direction. | `Graph` |
| `measureNodeSizes()` | Rendered width / height of every node, in world units (from the DOM; for `setDirection`). | `Record<id, { w, h }>` |
| `findBackLinks(g)` | Ids of the links that close a cycle (see [Cycles and self-loops](#cycles-and-self-loops)); self-loops are not included. Doesn't change the graph. | `Set<string>` |
| `findLink(g, source, target)` | The link from this output to this input, if any. | `Link \| undefined` |
| `linksInto(g, target)` | All links going into an input port, oldest first. | `Link[]` |
| `quickLink(g, nodeIdA, nodeIdB)` | The ends of the link the F key makes: first output of one node into the first input of the other, left to right first, then right to left; skips a link that already exists. Doesn't change the graph. | `{ source, target } \| null` |

`addLink` outcomes:

| Outcome | Meaning | Graph |
|---|---|---|
| `'added'` | New link (returned as `link`). | changed |
| `'exists'` | Exactly this link is already there. | unchanged |
| `'unknown-port'` | A node or port doesn't exist, or an input was given as the source (or an output as the target). | unchanged |

### Selection

| Function | Does | Returns |
|---|---|---|
| `copyNodes(g, nodeIds)` | Ctrl+C: deep copies of the nodes (graph order) and the links whose both ends are among them, for the `nodeClipboard` store. Doesn't change the graph. | `NodeClipboard` (`{ nodes, links }`) |
| `pasteNodes(g, clip, at)` | Ctrl+V: adds the clipboard's nodes and links with new ids (n…, l…), moved so the group's top-left (lowest x, highest y of the corners) is at `at`. Works on any graph, also one other than the copied one. | `{ graph, nodeIds }` |
| `selectBox(base, hitIds)` | Box selection: the nodes of `base` (selected when the drag began) followed by the `hitIds` the box touches now, without duplicates. Clears a selected link. The page measures which nodes the box touches (screen rectangles of the rendered nodes). | `Selection` |
| `selectNode(sel, nodeId, additive)` | With `additive` (Shift+click): toggles the node in the selection. Without: selects only this node, unless it's already selected, in which case the selection is kept so a group can be dragged. Always clears a selected link. | `Selection` |

## How it fits together

| Part | Role |
|---|---|
| `src/lib/graph/store.ts` | Stores and the functions above; the only place that changes the graph. |
| `src/lib/graph/store.spec.ts` | Unit tests for every operation and link rule (`npm run test:unit -- --run`). |
| `src/lib/graph/history.ts` | Undo / redo: keeps the graph objects from before each change (operations never change a graph, so no copies are needed); `holdHistory` / `releaseHistory` make a mouse gesture one step; `clearHistory` runs on every load. Tests in `history.spec.ts`. |
| `src/routes/+page.svelte` | Turns mouse and keys into store calls: selecting, dragging, link drags, shortcuts, messages. |
| `src/lib/components/GraphNode.svelte` | Draws one node: name with inline editing, input and output points, selected highlight. |
| `src/lib/components/GraphLinks.svelte` | Draws the links and the dashed preview while a link is dragged. |
| `src/lib/components/UI_GraphEditor.svelte` | Toolbar; its "Add Node" button calls `createNodeAt`. |

- **Finding what was clicked:** the page reads `data-*` attributes from the element under the mouse:
    - ports carry `data-node-id`, `data-port-kind` (`input` / `output`) and `data-port-id`
    - nodes carry `data-id`
    - links carry `data-link-id` on an invisible 12 px wide path, so a thin curve is easy to click; double-clicking it edits the link's name
- **Drawing links:** `GraphLinks` is an SVG layer inside the world layer, so it pans and zooms with the nodes.
    - Port positions are measured from the rendered nodes: each port's offset from its node's corner, using `offsetLeft`/`offsetTop`, which ignore pan and zoom.
    - They're measured again after every graph change, so a curve stays attached when a longer name makes a node bigger.
    - Curves leave an output to the right and enter an input from the left.
- **Coordinates:** node positions are world coordinates with y up; see [graph-editor-canvas.md](graph-editor-canvas.md) for the camera and the conversion to the screen.

## Known limits

- Undo covers only the open graph in this tab and is lost on reload or when another graph is opened.
- Ports can't be added or removed; every new node has one input and one output.
- The old "add input/output" hover indicators were removed from the node markup because they were never wired up and sat on top of the ports; their CSS is still in `static/styles/imge.css` for when adding ports gets built.

## Changes

- 2026-10-21 — graph format v6: nodes keep name and colour in `content` and their ports in one list with `kind`; `addNode` builds from the basic template, `setNodeType` reshapes by port kind and fills `content`; one link rule `CAN_LINK`, `addLink` takes the ends in either order (a drag from an input works) and stores giving → taking; new `portOf`
- 2026-10-21 — groups: no links to or from a group (`addLink` outcome `unknown-port`, F skips it), a box takes a group only when it is fully inside; new `isGroup`, `hasLinks`
- 2026-10-21 — node colours (Properties panel); new function `setNodeColor`
- 2026-10-21 — spline arrowheads stay on their line: splines start and end with a short straight piece the arrowhead lies on
- 2026-10-17 — Properties panel (N): the selection's details and editing, see graph-properties-panel.md; new functions `setNodePosition`, `setLinkStyle`; shortcuts also pause while a dropdown has the keyboard
- 2026-10-17 — undo / redo (Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z), one step per edit or mouse gesture; undoing back to the saved graph clears the unsaved marker; new `history.ts`
- 2026-10-17 — Ctrl+C / Ctrl+V copy and paste nodes with the links between them; new functions `copyNodes`, `pasteNodes`, store `nodeClipboard`
- 2026-10-17 — box selection: Shift+drag on empty space selects every node the box touches; new function `selectBox`
- 2026-10-16 — dragged nodes snap to half grid squares (Alt = free move); toolbar button turns snapping on / off
- 2026-10-16 — the Esc menu's Keybindings tab lists the shortcuts as key caps
- 2026-10-16 — "orientation" renamed to "direction" (`metadata.direction`, `setDirection`); the toolbar button and its action are called Transpose

- 2026-10-16 — toolbar button to switch the orientation; messages are drawn above the graph on a solid panel
- 2026-10-16 — orientation (left-to-right / top-to-bottom) in the menu's Graph section: ports, links, routes and reading order follow it; switching turns the layout reversibly; new functions `transposeGraph`, `setOrientation`, `measureNodeSizes`
- 2026-10-16 — links, arrowheads and chevrons use one solid colour, so lines no longer show through arrowheads
- 2026-10-16 — arrows per link (D, menu override and apply to all, mid-link chevrons), link names drawn mid-link (double-click / F2), cycles and self-loops allowed and drawn around their nodes (R route, lane drag); new functions `cycleLinkArrow`, `setAllLinkArrows`, `toggleLinkRoute`, `renameLink`, `findBackLinks`, `persistViewSettings`; "self-link" outcome removed
- 2026-10-15 — Shift+N starts a new empty graph
- 2026-10-15 — link shapes (spline / line / manhattan): L cycles the selected link, drag a manhattan link's corner, display-only override and "apply to all links" in the menu; new functions `cycleLinkShape`, `setAllLinkShapes`, `setLinkBend`, store `linkShapeOverride`
- 2026-10-15 — ids follow the scheme nodes `n1`, links `l1`, inputs `i1`, outputs `o1`
- 2026-10-15 — new keys: + / = and - zoom, Home fits the graph, Ctrl+S saves, Ctrl+Shift+S downloads; hints and menu buttons show keys as key caps
- 2026-10-14 — graph format v2: many links may meet at a port (linking into a connected input adds instead of replacing), exact duplicates refused, links selected / deleted / re-routed by their own id (re-routing keeps it), nodes have a `name`; function reference updated (`nextLinkId`, `findLink`, `linksInto`; `findLinkInto` / `isLinkKey` removed)
- 2026-10-14 — page path updated: the graph editor is now `src/routes/+page.svelte` (home page `/`)
- 2026-10-14 — Esc no longer clears the selection: it cancels a link drag or title edit, otherwise opens the menu (click empty space to clear the selection)
- 2026-10-14 — first version: mouse and keys, link rules and messages (taken over from graph-editor-canvas.md), function reference for `store.ts`, how the parts fit together
