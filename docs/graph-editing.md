# Node and link editing

How to create, edit and delete nodes and links in the graph editor, the rules links follow, and a reference for the functions behind it.

State as of 2026-10-14.

- [Using it](#using-it)
    - [Mouse and keys](#mouse-and-keys)
    - [Link rules](#link-rules)
    - [Link shapes](#link-shapes)
    - [Arrows and link names](#arrows-and-link-names)
    - [Cycles and self-loops](#cycles-and-self-loops)
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
| Drag node | Move it, and every other selected node with it. |
| Toolbar "Add Node" | New node at the screen center. |
| **Shift+A** | New node centered on the mouse. |
| Double-click the name, or **F2** | Edit the node's name. Enter or clicking away saves; Esc cancels (without opening the menu); an empty name keeps the old one. |
| **Delete** / **Backspace** | Remove the selected link, or the selected nodes together with all their links. |
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
| **Ctrl+S** (Cmd+S) | Save the graph to its file; a graph without a file yet opens the menu (see [graph-saving.md](graph-saving.md)). Replaces the browser's "save page". |
| **Ctrl+Shift+S** (Cmd+Shift+S) | Download the graph as a `.json` file (same as the toolbar's export button). |
| **Esc** | Cancel a link drag; otherwise open the menu (open / save graphs, see [graph-saving.md](graph-saving.md)). |

- Shortcuts are ignored while typing a name, so Backspace there edits text instead of deleting the node.
- Shortcuts are paused while the Esc menu is open, except Ctrl+S and Ctrl+Shift+S, which work everywhere.
- The toolbar's hover hints and the menu's buttons show their key as key caps, e.g. <kbd>Shift</kbd>+<kbd>A</kbd>: a hint text puts keys in square brackets (`"Add Node [Shift+A]"`) and `AssistanceMsg` draws them with `Kbd.svelte`.
- Other Ctrl / Cmd / Alt combinations are left to the browser.
- A new node is named "Node" and has one input and one output.

### Link rules

- A link always goes from an output (right side of a node) to an input (left side).
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

### Messages

When an action is refused or changes something you might not expect, a short message appears at the bottom of the screen for 2.5 s:

| Situation | Message |
|---|---|
| The same output-to-input link already exists | That link already exists |
| Output dropped on an output, or input on an input | Links go from an output (right) to an input (left) |
| F with fewer or more than two nodes selected | Select two nodes (Shift+click), then press F |
| F when both directions are already linked (or a node has no output / input) | These nodes are already linked (or have no output / input) |

## Functions

All in `src/lib/graph/store.ts`. Graph operations are **pure**: they take a graph and return a new one, never change the one they were given, and return it unchanged when there is nothing to do. Components apply them to the open graph with `graph.update((g) => op(g, ...))`.

Types: `Graph`, `GraphNode`, `Link` come from `src/lib/graph/types.ts`; `Point` is `{ x, y }` in world coordinates (y up); `LinkEnd` is `{ node, port }` (node id + port id). Ids are strings.

### Stores

| Store | Holds |
|---|---|
| `graph` | The open graph (`Graph`). Starts as `emptyGraph()`; the page fills it after loading and upgrading the file. |
| `selection` | `{ nodes: string[], link: string \| null }`: selected node ids in selection order, or one selected link id. Never both. |
| `editingNodeId` | Id of the node whose name is being edited, or `null`. `GraphNode` shows the text field for that node. |
| `editingLinkId` | Id of the link whose name is being edited, or `null`. `GraphLinks` shows the text field in the middle of that link. |
| `linkShapeOverride` / `linkArrowOverride` | Display-only shape / arrow for all links, or `null` for each link's own; never written into the graph. |
| `showChevrons` | Display-only: direction chevrons in the middle of links. |

`persistViewSettings()` (called by the page on mount) restores the three display settings from this browser and saves every change there.

### Nodes

| Function | Does | Returns |
|---|---|---|
| `emptyGraph()` | A graph with no nodes or links, stamped with the current format. | `Graph` |
| `nextNodeId(g)` | `n` + highest `n<number>` id + 1 (ids in another form are ignored), so ids are never reused after a delete in the middle. | `string` |
| `nextLinkId(g)` | `l` + highest `l<number>` link id + 1; never reused either. | `string` |
| `addNode(g, at, name = 'Node')` | Adds a node with one input (`i1`) and one output (`o1`), roughly centered on `at`. Its position (top-left corner) is rounded to whole units. | `{ graph, node }` |
| `renameNode(g, nodeId, name)` | Sets the name, trimmed. A blank name keeps the old one. | `Graph` |
| `moveNodes(g, nodeIds, dx, dy)` | Moves the given nodes by a world-space delta. | `Graph` |
| `removeNodes(g, nodeIds)` | Removes the nodes and every link that starts or ends at them. | `Graph` |
| `createNodeAt(at)` | Store action: adds a node to the open graph centered on `at` and selects only it. Used by Shift+A and the toolbar. | the new `GraphNode` |

### Links

| Function | Does | Returns |
|---|---|---|
| `addLink(g, { source, target, type?, name?, shape?, bend?, arrow?, route?, id? })` | Connects an output (`source`) to an input (`target`), following the [link rules](#link-rules); source and target may be the same node. Defaults: shape `spline`, arrow `forward`, route `above`. Gets the next id, or the given `id` when re-routing (if no other link uses it); re-routing also passes the old shape, bend, arrow and route. | `{ graph, outcome, link? }`, see below |
| `removeLink(g, linkId)` | Removes one link by its id. | `Graph` |
| `cycleLinkShape(g, linkId)` | Next shape for one link: spline → line → manhattan → spline. | `Graph` |
| `setAllLinkShapes(g, shape)` | Writes one shape into every link ("Apply shape to all links"); bends are kept. | `Graph` |
| `setLinkBend(g, linkId, bend)` | Sets a link's `bend`, clamped to 0..1 (a manhattan corner, or the lane distance of a link going around). | `Graph` |
| `cycleLinkArrow(g, linkId)` | Next arrow for one link: forward → both → backward → none → forward. | `Graph` |
| `setAllLinkArrows(g, arrow)` | Writes one arrow into every link ("Apply arrow to all links"). | `Graph` |
| `toggleLinkRoute(g, linkId)` | Flips a link's route: above ↔ below. | `Graph` |
| `renameLink(g, linkId, name)` | Sets a link's name (trimmed); an empty name removes it. | `Graph` |
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
| `selectNode(sel, nodeId, additive)` | With `additive` (Shift+click): toggles the node in the selection. Without: selects only this node, unless it's already selected, in which case the selection is kept so a group can be dragged. Always clears a selected link. | `Selection` |

## How it fits together

| Part | Role |
|---|---|
| `src/lib/graph/store.ts` | Stores and the functions above; the only place that changes the graph. |
| `src/lib/graph/store.spec.ts` | Unit tests for every operation and link rule (`npm run test:unit -- --run`). |
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

- No undo: a deleted node or link is gone (export first if in doubt).
- Ports can't be added or removed; every new node has one input and one output.
- The old "add input/output" hover indicators were removed from the node markup because they were never wired up and sat on top of the ports; their CSS is still in `static/styles/imge.css` for when adding ports gets built.

## Changes

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
