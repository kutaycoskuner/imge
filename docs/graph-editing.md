# Node and link editing

How to create, edit and delete nodes and links in the graph editor, the rules links follow, and a reference for the functions behind it.

State as of 2026-10-14.

- [Using it](#using-it)
    - [Mouse and keys](#mouse-and-keys)
    - [Link rules](#link-rules)
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
- A node can't link to itself.
- Any number of links may meet at a port, in both directions (many-to-many): linking into a connected input adds a link.
- No exact duplicates: one link per output-port → input-port pair.
- An output can feed any number of inputs.

Every link has its own id (`l1`, `l2` ...), which never changes, even when the link is re-routed (see [graph-format.md](graph-format.md)).

### Messages

When an action is refused or changes something you might not expect, a short message appears at the bottom of the screen for 2.5 s:

| Situation | Message |
|---|---|
| The same output-to-input link already exists | That link already exists |
| Link from a node to itself | A node cannot link to itself |
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
| `addLink(g, { source, target, type?, name?, id? })` | Connects an output (`source`) to an input (`target`), following the [link rules](#link-rules). Gets the next id, or the given `id` when re-routing (if no other link uses it). | `{ graph, outcome, link? }`, see below |
| `removeLink(g, linkId)` | Removes one link by its id. | `Graph` |
| `findLink(g, source, target)` | The link from this output to this input, if any. | `Link \| undefined` |
| `linksInto(g, target)` | All links going into an input port, oldest first. | `Link[]` |
| `quickLink(g, nodeIdA, nodeIdB)` | The ends of the link the F key makes: first output of one node into the first input of the other, left to right first, then right to left; skips a link that already exists. Doesn't change the graph. | `{ source, target } \| null` |

`addLink` outcomes:

| Outcome | Meaning | Graph |
|---|---|---|
| `'added'` | New link (returned as `link`). | changed |
| `'exists'` | Exactly this link is already there. | unchanged |
| `'self-link'` | Source and target are the same node. | unchanged |
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
    - links carry `data-link-id` on an invisible 12 px wide path, so a thin curve is easy to click; a link's `name` shows as its tooltip
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

- 2026-10-15 — ids follow the scheme nodes `n1`, links `l1`, inputs `i1`, outputs `o1`
- 2026-10-15 — new keys: + / = and - zoom, Home fits the graph, Ctrl+S saves, Ctrl+Shift+S downloads; hints and menu buttons show keys as key caps
- 2026-10-14 — graph format v2: many links may meet at a port (linking into a connected input adds instead of replacing), exact duplicates refused, links selected / deleted / re-routed by their own id (re-routing keeps it), nodes have a `name`; function reference updated (`nextLinkId`, `findLink`, `linksInto`; `findLinkInto` / `isLinkKey` removed)
- 2026-10-14 — page path updated: the graph editor is now `src/routes/+page.svelte` (home page `/`)
- 2026-10-14 — Esc no longer clears the selection: it cancels a link drag or title edit, otherwise opens the menu (click empty space to clear the selection)
- 2026-10-14 — first version: mouse and keys, link rules and messages (taken over from graph-editor-canvas.md), function reference for `store.ts`, how the parts fit together
