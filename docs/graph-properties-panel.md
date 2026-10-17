# Properties panel

The graph editor's docked panel on the right that shows and edits whatever is selected, like Blender's sidebar (<kbd>N</kbd>).

State as of 2026-10-17.

- [Why a panel](#why-a-panel)
- [Using it](#using-it)
- [What it shows](#what-it-shows)
- [Adding a section](#adding-a-section)
- [Files](#files)
- [Known limits](#known-limits)
- [Changes](#changes)

## Why a panel

- A graph is for seeing the big picture. Every option drawn on the node itself (fields, dropdowns, buttons) makes nodes bigger and the graph harder to read.
- So nodes keep only what is needed to read and wire them: their name and their ports. Everything else (exact position, link look, later node colour and type-specific content) is shown and edited in one place, the Properties panel, for the current selection.
- Node types to come (e.g. a UML class with its three blocks: name, attributes, operations) bring their own sections to the panel instead of their own editing controls on the canvas.

## Using it

| Input | Action |
|---|---|
| **N** | Show or hide the panel (when not typing in a field). |
| Toolbar button (window with a right column) | The same; the column is filled while the panel is shown. |
| Chevron **›** in the panel's header | Hide it. |
| Tab **‹** on the right edge | Show it again (visible while the panel is hidden). |
| Click a section header | Fold or unfold that section; remembered in this browser. |
| Type in a field, then **Enter** or click elsewhere | Applies the edit. **Esc** puts the old value back (and doesn't open the menu). |
| Number field arrows | Apply each step right away (position steps by 20 units, half a grid square at zoom 1). |
| Click a node or link named in the panel | Selects it; the panel then shows that one. |

- Every edit goes through the graph store, so <kbd>Ctrl</kbd>+<kbd>Z</kbd> undoes it like any other edit. A text edit is one undo step, not one per key.
- Shown or hidden is a display setting remembered in this browser (`localStorage` key `imge.graphEditor.hidePropertiesPanel`, stored only while hidden). It is shown by default.
- While a field or dropdown in the panel has the keyboard, the editor's shortcuts (Delete, L, D, R …) are paused, so typing and choosing never edit the graph by accident.

## What it shows

The panel shows the sections whose condition matches the selection, top to bottom:

| Selection | Section | Contents |
|---|---|---|
| Nothing | Graph | File name (or "not saved yet") with the unsaved marker, direction (changes it like the Esc menu and the transpose button), number of nodes and links. |
| One node | Node | Name (editable), id, type (dropdown, see below), position of the top-left corner X and Y (world units, y up; editable), Delete node. |
| One node | Ports and links | Input and output ports by label; links coming in and going out, by the node at the other end (and the link's name); a click selects the link. |
| Several nodes | Selection | How many nodes and how many links between them; their names (a click selects only that one); Delete all of them. |
| One link | Link | Name (editable; empty removes it), id, From and To as node · port (a click selects the node), Delete link. |
| One link | Look | Shape, arrow and route (the same values as <kbd>L</kbd>, <kbd>D</kbd>, <kbd>R</kbd>); the corner (manhattan) or lane (link going around its nodes) position from 0 to 1, the same as dragging the highlighted segment. When the Esc menu's display override hides a link's own shape or arrow, the panel says so; route says when it isn't used. |

### Node types

The Type dropdown lists `NODE_TYPES` from `src/lib/graph/node-types.ts` (id, label, hover description, `ready`). For now it is a placeholder: only **Basic** is drawn and can be chosen; **Note**, **UML class** and **Decision** are listed greyed out with "(later)" to show what is planned. A node whose `type` isn't in the list (e.g. from a newer file) shows that type as an extra option. A type becomes choosable (`ready: true`) once the canvas can draw it and it has its own panel section.

## Adding a section

Sections are data: `PANEL_SECTIONS` in `src/lib/components/properties/sections.ts`. Each entry has an `id`, a `title`, a `component` and a `show(ctx)` condition. The panel itself knows nothing about nodes or links.

1. Write a component in `src/lib/components/properties/` that takes `export let ctx: PanelContext` (the graph, the selection, the selected nodes and the selected link, already resolved).
2. Make every change with `graph.update((g) => operation(g, …))` using a pure function from `store.ts`, so it is undoable and testable.
3. Use the shared classes for a consistent look: `props` (a `<dl>` of label / value rows), `prop-input`, `prop-button`, `prop-row` (a clickable row), `prop-list`, `prop-note`, `prop-faint`, `prop-subtitle`, `prop-actions`. They are styled once in `GraphPropertiesPanel.svelte`. Text and number fields that should apply on Enter / blur use `PropText.svelte`.
4. Add an entry to `PANEL_SECTIONS`, for example for a future node type:

```ts
{ id: 'uml-blocks', title: 'Class', component: PropsUmlClass, show: (ctx) => ctx.nodes.length === 1 && ctx.nodes[0].type === 'uml-class' }
```

## Files

| File | Role |
|---|---|
| `src/lib/components/properties/GraphPropertiesPanel.svelte` | The dock: header (title, N key cap, hide chevron), the folding section headers, the tab while hidden, and the shared styles of all sections. |
| `src/lib/components/properties/sections.ts` | `PANEL_SECTIONS` (which sections, when), `PanelContext`, and `LINK_ARROW_LABELS` (shared with the Esc menu). |
| `src/lib/components/properties/PropText.svelte` | Text / number field that applies on Enter or blur, Esc cancels; follows the value while not focused (so undo shows up). |
| `src/lib/components/properties/PropsGraph.svelte`, `PropsNode.svelte`, `PropsNodeLinks.svelte`, `PropsNodes.svelte`, `PropsLink.svelte`, `PropsLinkStyle.svelte` | The sections in the table above. |
| `src/lib/graph/store.ts` | `showPropertiesPanel`, and the operations the panel uses, among them `setNodePosition`, `setNodeType` and `setLinkStyle`. |
| `src/lib/graph/node-types.ts` | `NODE_TYPES`: the Type dropdown's list (placeholder; only `basic` is ready). |
| `src/lib/icons/icon-sidebar-right.svelte`, `icon-chevron-left.svelte`, `icon-chevron-right.svelte` | The toolbar button's icon and the hide / show chevrons. |

## Known limits

- The panel floats over the right side of the canvas; fitting the graph (Home) doesn't leave room for it, so the rightmost nodes can sit under it. Hide it with <kbd>N</kbd> to see them.
- Fixed width (17em); it can't be dragged wider yet, and it docks only on the right.
- On a phone-sized window it covers about half of the canvas; hide it there.
- Ports can't be added, removed or renamed from the panel yet; node colour isn't editable yet (or drawn); only the Basic node type can be chosen.

## Changes

- 2026-10-17 — node Type dropdown (placeholder list in `node-types.ts`: Basic choosable, Note / UML class / Decision planned); new function `setNodeType`
- 2026-10-17 — no sideways scroll bar (Firefox): fields shrink to the panel, long names wrap, rows include their padding in their width
- 2026-10-17 — first version: Graph, Node, Ports and links, Selection, Link and Look sections; N, toolbar button, hide chevron and edge tab; folding remembered; new store functions `setNodePosition`, `setLinkStyle`
