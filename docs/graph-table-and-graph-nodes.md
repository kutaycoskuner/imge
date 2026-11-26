# Table and graph nodes

Two node types for the graph editor: a **table** (tabular text inside a node, each row and column with its own look) and a **graph** node (another graph shown small inside this one, embedded in it or linked to it). Both are node types in graph format 7 (see [graph-format.md](graph-format.md#why-typeversion-is-its-own-field)): no new file format version, a template version 1 each, samples in `static/data/node-types/table/table-v1.json` and `static/data/node-types/graph/graph-v1.json`.

State as of 2026-11-26.

**In the start graph** (the feature map): the violet "Types v1" group holds one of each, a table "Node types at a glance" (bold header row, an italic column) and an embedded graph node "Graph (embedded)" (Open file → Upgrade format → Draw); double-click its preview to open it, Back to return.

- [Table node](#table-node)
- [Graph node](#graph-node)
- [In the text view and image export](#in-the-text-view-and-image-export)
- [Code](#code)
- [Changes](#changes)

## Table node

Make one by choosing **Table** in the Properties panel's Type list (Node section).

```text
┌────────────────┐
│     Prices     │   name (shown or hidden)
├────────────────┤
│ Item   │ Price │   row 1: bold (its row style)
├────────────────┤
│ Tea    │     3 │   column 2: right-aligned (its column style)
│ Coffee │    12 │
└────────────────┘
```

| To | Do |
|---|---|
| type in a cell | **double-click** it; Enter or clicking away saves, **Tab** / Shift+Tab save and move to the next / previous cell, Esc cancels |
| rename the table | double-click its name (or F2), or the Content section |
| add or remove rows and columns | Properties, **Table** section: choose a row or column under **Edit**, then **Insert above / below** (left / right) or **Remove**; at most 60 rows and 20 columns, the last row and column stay |
| style a row or column | the same section, **Look of row / column n**: text size (0.5 to 3), opacity (0.1 to 1), bold, italic, underline (each —, on, off), alignment (—, left, centre, right), colour |
| show or hide the name | **Show the name above the table** |
| lines between the cells | **Show lines between the cells** (off by default: a plain table; content `showLines`) |
| make it bigger or smaller | **Scale** (also the corner handle): the whole table |

**Which style wins:** a cell is drawn with its **column's** style, then its **row's** style on top, and a row only overrides what it actually sets ("—" = not set). So a bold header row stays bold in every column, and a right-aligned number column keeps its alignment in every other row. A row can also switch a column's setting off ("off").

**Content** (node type `table`, version 1):

| Key | Meaning |
|---|---|
| `name`, `showName`, `color`, `scale` | title above the table, whether it shows, the box's colour, the size |
| `showLines` | optional: `true` draws lines between the cells; missing or `false` = none |
| `cells` | rows of text: `[["Item", "Price"], ["Tea", "3"]]` |
| `rowStyles`, `colStyles` | one style or `null` per row / column: `{ "size": 1.2, "opacity": 0.8, "bold": true, "italic": false, "underline": false, "align": "right", "color": "#336699" }`, every key optional |

Odd content is read leniently: rows padded to the widest one, missing styles `null`, values out of range brought into it, unknown keys dropped.

## Graph node

Make one by choosing **Graph** in the Type list. It shows its name, a badge with its mode, and a small preview of the graph: its nodes as boxes, groups as frames behind them, links as lines. **Double-click the preview**, or select the node and press **Tab**, to open that graph; **Shift+Tab** (or the Back button) goes back out.

### Two modes, chosen explicitly

Properties, **Graph** section, **Mode**:

| | Embedded (internal) | Linked (external) |
|---|---|---|
| Where the graph is | inside this node, so inside this graph's file (travels with it when shared) | elsewhere: a graph **saved in this browser** (Esc menu, Saved) or a **file in the open folder** |
| Preview | what it holds; "empty: double-click to draw it" while empty | the target's current state; "not found" (red frame) when it's gone, "open its folder to see it" when the folder isn't open |
| Double-click / Open | edits the embedded graph | opens the target itself (Save then writes it where it is) |
| Back | writes the changes into the node; the outer graph is then unsaved | returns; asks first if the target has unsaved changes |
| Ctrl+S inside | explains: Back puts the changes into the outer graph, then save that | saves the target where it is |

Switching the mode with the radio buttons only switches what the node shows. To carry the graph over:

- **Embed a copy** (linked → embedded): copies the target into the node as it is now (asks first); later changes to the original no longer show up.
- **Save as separate graph** (embedded → linked): saves what the node holds **in this browser** or **as a file in the open folder** (Chrome, Edge) under a name, and the node then links to it.

A linked node's target is chosen in the **Graph** list: the graphs saved in this browser and those in the open folder (with their subfolder).

### Opening and going back

Opening a graph node shows a bar at the top: **← Back to <outer graph>** and where you are (`feature map › Billing (embedded …)`). Graph nodes inside graph nodes can be opened in turn; Back returns one step at a time. The outer graph keeps its unsaved changes while you are inside (they come back with it). Opening any other graph (menu, file, example, New graph) leaves the trail, so Back no longer applies. The undo history starts again with each graph opened or returned to.

**Content** (node type `graph`, version 1):

| Key | Meaning |
|---|---|
| `name`, `color`, `scale` | the node's name, its box's colour, the preview's size (220 × 140 at scale 1) |
| `mode` | `internal` or `external` |
| `graph` | the embedded graph in the current file format (with its own `metadata` and `data`), or `null` while empty |
| `ref` | `{ "source": "browser", "id": "…", "name": "…" }` or `{ "source": "folder", "path": "uml/kugel.json", "name": "kugel" }`, or `null` |

A browser reference keeps working when the target is renamed (it goes by id); a folder reference goes by path, so moving or renaming the file breaks it (the node says "not found"; pick it again).

## In the text view and image export

- **Text view:** a table is drawn as its name, then its rows in padded columns (with its lines on: `│` between them and a line under the first row); bold, italic and underline carry over (size, opacity and colour aren't text). A graph node is its name with ▣ (embedded) or ↗ (linked), and where it links.
- **Image export (PNG / JPG / SVG):** both are drawn as on the page; the graph node's preview is placed where the node shows it.

## Code

| File | What it does |
|---|---|
| `src/lib/graph/table.ts` | table data: clean reading, the cell style (column, then row), cells, rows, columns, styles (tests: `table.spec.ts`) |
| `src/lib/graph/graph-node.ts` | graph node data: mode, reference, embedded graph, label, the preview layout (tests: `graph-node.spec.ts`) |
| `src/lib/graph/file-access.ts` | resolving targets (`resolveGraphRef`, `readFolderGraph`), opening and going back (`enterGraphNode`, `backFromGraph`, `graphTrail`), `linkGraphNode`, `embedGraphCopy`, `saveEmbeddedGraphSeparately` (tests: `graph-node-actions.spec.ts`) |
| `src/lib/graph/node-types.ts` | the two templates (`table`, `graph`) |
| `src/lib/components/NodeTable.svelte`, `NodeGraph.svelte` | the drawing inside the node; cell editing; the preview |
| `src/lib/components/properties/PropsTable.svelte`, `PropsGraphNode.svelte` | the Properties sections |
| `src/lib/graph/ascii.ts` | the text view drawing (tests: `ascii.spec.ts`) |
| `src/routes/+page.svelte` | the Back bar; Ctrl+S inside an embedded graph |
| `static/styles/imge.css` | `.table-*`, `.graph-*` |

## Changes

- 2026-11-26 — Tab opens the selected graph node, Shift+Tab goes back; tables without cell lines by default (Show lines between the cells)

- 2026-11-26 — first version: table node (cells, row and column styles, column then row), graph node (embedded or linked to a graph in this browser or the folder, preview, open and Back, embed a copy, save as separate graph)
