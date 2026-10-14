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
| Double-click title, or **F2** | Edit the title. Enter or clicking away saves; Esc cancels; an empty title keeps the old one. |
| **Delete** / **Backspace** | Remove the selected link, or the selected nodes together with all their links. |
| Drag from an output point | A dashed curve follows the mouse; release on an input point to link. |
| Drag from a free input point | The same, backwards; release on an output point. |
| Drag from a connected input point | Picks up its link from the output end: release on another input to re-route it, on empty space to remove it. |
| **F** | Link two selected nodes: first output into the first free input, left node into right node; if that isn't possible, right into left. |
| **Esc** | Cancel a link drag, or clear the selection. |

- Shortcuts are ignored while typing in a title, so Backspace there edits text instead of deleting the node.
- Shortcuts are also ignored while Ctrl, Cmd or Alt is held, so browser shortcuts keep working.
- A new node has the title "Node", one input and one output.

### Link rules

- A link always goes from an output (right side of a node) to an input (left side).
- A node can't link to itself.
- An input takes one link: linking into a connected input replaces its link.
- An output can feed any number of inputs.

Because an input has at most one link, a link is identified by its target node + target input; the file format needs no link ids (see [graph-format.md](graph-format.md)).

### Messages

When an action is refused or changes something you might not expect, a short message appears at the bottom of the screen for 2.5 s:

| Situation | Message |
|---|---|
| Link into an input that already had one | Link replaced: an input takes one link |
| Link from a node to itself | A node cannot link to itself |
| Output dropped on an output, or input on an input | Links go from an output (right) to an input (left) |
| F with fewer or more than two nodes selected | Select two nodes (Shift+click), then press F |
| F when no direction has a free input | No free input to link: each input takes one link |

## Functions

All in `src/lib/graph/store.ts`. Graph operations are **pure**: they take a graph and return a new one, never change the one they were given, and return it unchanged when there is nothing to do. Components apply them to the open graph with `graph.update((g) => op(g, ...))`.

Types: `Graph`, `GraphNode`, `Link` come from `src/lib/graph/types.ts`; `Point` is `{ x, y }` in world coordinates (y up); `LinkKey` is `{ targetNodeId, targetInputId }`.

### Stores

| Store | Holds |
|---|---|
| `graph` | The open graph (`Graph`). Starts as `emptyGraph()`; the page fills it after loading and upgrading the file. |
| `selection` | `{ nodes: number[], link: LinkKey \| null }`: selected node ids in selection order, or one selected link. Never both. |
| `editingNodeId` | Id of the node whose title is being edited, or `null`. `GraphNode` shows the text field for that node. |

### Nodes

| Function | Does | Returns |
|---|---|---|
| `emptyGraph()` | A graph with no nodes or links, stamped with the current format. | `Graph` |
| `nextNodeId(g)` | Highest node id + 1, so ids are never reused after a delete in the middle. | `number` |
| `addNode(g, at, title = 'Node')` | Adds a node with one input (`input_0`) and one output (`output_0`), roughly centered on `at`. Its position (top-left corner) is rounded to whole units. | `{ graph, node }` |
| `renameNode(g, nodeId, title)` | Sets the title, trimmed. A blank title keeps the old one. | `Graph` |
| `moveNodes(g, nodeIds, dx, dy)` | Moves the given nodes by a world-space delta. | `Graph` |
| `removeNodes(g, nodeIds)` | Removes the nodes and every link that starts or ends at them. | `Graph` |
| `createNodeAt(at)` | Store action: adds a node to the open graph centered on `at` and selects only it. Used by Shift+A and the toolbar. | the new `GraphNode` |

### Links

| Function | Does | Returns |
|---|---|---|
| `addLink(g, link)` | Connects an output to an input, following the [link rules](#link-rules). | `{ graph, outcome }`, see below |
| `removeLink(g, key)` | Removes the link going into `key`'s input. | `Graph` |
| `findLinkInto(g, key)` | The link going into an input, if any. | `Link \| undefined` |
| `isLinkKey(link, key)` | Whether a link goes into the input named by `key`; `false` for a `null` key. | `boolean` |
| `quickLink(g, nodeIdA, nodeIdB)` | The link the F key makes: first output of one node into the first free input of the other, left to right first, then right to left. Doesn't change the graph. | `Link \| null` |

`addLink` outcomes:

| Outcome | Meaning | Graph |
|---|---|---|
| `'added'` | New link. | changed |
| `'replaced'` | The input had a link from somewhere else; it was replaced. | changed |
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
| `src/routes/graph_editor/+page.svelte` | Turns mouse and keys into store calls: selecting, dragging, link drags, shortcuts, messages. |
| `src/lib/components/GraphNode.svelte` | Draws one node: title with inline editing, input and output points, selected highlight. |
| `src/lib/components/GraphLinks.svelte` | Draws the links and the dashed preview while a link is dragged. |
| `src/lib/components/UI_GraphEditor.svelte` | Toolbar; its "Add Node" button calls `createNodeAt`. |

- **Finding what was clicked:** the page reads `data-*` attributes from the element under the mouse:
    - ports carry `data-node-id`, `data-port-kind` (`input` / `output`) and `data-port-id`
    - nodes carry `data-id`
    - links carry `data-target-node-id` and `data-target-input-id` on an invisible 12 px wide path, so a thin curve is easy to click
- **Drawing links:** `GraphLinks` is an SVG layer inside the world layer, so it pans and zooms with the nodes.
    - Port positions are measured from the rendered nodes: each port's offset from its node's corner, using `offsetLeft`/`offsetTop`, which ignore pan and zoom.
    - They're measured again after every graph change, so a curve stays attached when a longer title makes a node bigger.
    - Curves leave an output to the right and enter an input from the left.
- **Coordinates:** node positions are world coordinates with y up; see [graph-editor-canvas.md](graph-editor-canvas.md) for the camera and the conversion to the screen.

## Known limits

- No undo: a deleted node or link is gone (export first if in doubt).
- Ports can't be added or removed; every new node has one input and one output.
- The old "add input/output" hover indicators were removed from the node markup because they were never wired up and sat on top of the ports; their CSS is still in `static/styles/imge.css` for when adding ports gets built.

## Changes

- 2026-10-14 — first version: mouse and keys, link rules and messages (taken over from graph-editor-canvas.md), function reference for `store.ts`, how the parts fit together
