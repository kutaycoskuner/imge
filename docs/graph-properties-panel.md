# Properties panel

The graph editor's docked panel on the right that shows and edits whatever is selected, like Blender's sidebar (<kbd>N</kbd>).

State as of 2026-10-23.

- [Why a panel](#why-a-panel)
- [Using it](#using-it)
- [What it shows](#what-it-shows)
- [Adding a section](#adding-a-section)
- [Files](#files)
- [Known limits](#known-limits)
- [Changes](#changes)

## Why a panel

- A graph is for seeing the big picture. Every option drawn on the node itself (fields, dropdowns, buttons) makes nodes bigger and the graph harder to read.
- So nodes keep only what is needed to read and wire them: their name and their ports. Everything else (colour, exact position, link look, later type-specific content) is shown and edited in one place, the Properties panel, for the current selection.
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
| One node | Node | What every node has (graph format v6 top level): id, type (dropdown, see below), position of the top-left corner X and Y (world units, y up; editable), the **group** it is in (a click selects the group, **Leave** takes it out), Delete node. |
| One node of a type with a name and a colour (basic, group, UML class) | Content | Name (editable), colour (see below) and, for types that allow it, **Shape** (square / circle; see below): the type's own `content`. For a group also Width and Height. Other node types will bring their own content sections. |
| One UML class | Attributes and methods | One field per compartment, one member per line in UML notation, highlighted while typing, with the lines that don't follow the notation listed under the field; leaving a field saves it (see [graph-uml.md](graph-uml.md)). |
| One group | Contents | The nodes it holds, by label and id (a click selects one, × takes it out of the group), how to add nodes, and **Ungroup** (removes the group; what it held stays). |
| One node with ports | Ports and links | Its ports by kind (inputs, outputs, and two-way ports when it has any), by label; links coming in and going out, by the node at the other end (and the link's name); a click selects the link. |
| Several nodes | Selection | How many nodes and how many links between them; one colour for all of them whose type has a colour (empty with "mixed" when they differ; × resets all); their labels (a click selects only that one); Delete all of them. |
| One link | Link | Name (editable; empty removes it), id, From and To as node label · port label (a click selects the node), Delete link. |

Node names in lists and link ends come from the node's type (`nodeLabel(node)` in `node-types.ts`: basic and group show their name, a type without one e.g. "AND gate (n4)"), never from reading `content` directly.
| One link | Look | Shape, arrow and route (the same values as <kbd>L</kbd>, <kbd>D</kbd>, <kbd>R</kbd>); the corner (manhattan) or lane (link going around its nodes) position from 0 to 1, the same as dragging the highlighted segment. When the Esc menu's display override hides a link's own shape or arrow, the panel says so; route says when it isn't used. |

### Node shape

- **Square** (the default: a rectangle with rounded corners) or **Circle**, chosen in the Content section's Shape dropdown; stored in the node's content (`shape`).
- Which shapes a type allows is part of its template (`shapes` in `node-types.ts`): Basic and Group allow both; a UML class keeps its fixed shape (no dropdown). Images (e.g. circuit symbols as SVG) are planned as more shapes later.
- A circle **node** has its own size rules: as wide as its name plus a small padding (0.5em), at least 3.5em, at most 9em (longer names wrap), as tall as wide; its name in the middle, its ports on the left and right (top and bottom in top-to-bottom graphs). Good for lattices, trees, set elements, flowchart start / end.
- A circle **group** is a round frame: the circle through its children's box corners plus a 32-unit margin (half a square group's 64, since the circle already leaves room at the sides), at least as wide as its stored size; Width / Height and the corner mark set one diameter.
- The list of shapes is data: `NODE_SHAPES` in `node-types.ts`.

### Node colour

- **Look on the canvas:** the border in the colour itself (vibrant), the fill a dim version of it (20 % colour mixed into the theme background, so the name stays readable in light and dark). A selected node still gets the orange selection border.
- **The Color row:** a preview swatch drawn like the node, a hex field and **×** (back to the default look). A click on the swatch opens the colour picker under the row (click again or Esc to close it).
    - Type `#abc`, `abc`, `#aabbcc` or `aabbcc` (any case); it is stored as `#aabbcc`. The swatch follows what you type right away; Enter or leaving the field applies it.
    - While the text isn't a hex colour the field turns red and the swatch is crossed out; leaving the field then puts the old value back. An empty field means the default look.
    - One edit is one undo step.
- **The colour picker** (in the style of htmlcolorcodes.com, drawn with CSS gradients, no library):
    - a square: saturation from left (grey) to right (full colour), brightness from bottom (black) to top, in the current hue; drag the round handle, or use the arrow keys when it is focused (Shift = bigger steps)
    - a hue bar (the rainbow) under it; drag it, or arrow keys
    - a row of tints and shades of the current colour (three toward white, the colour, three toward black) and a row of preset colours (`NODE_COLOR_PRESETS`, data in `color.ts`); a click picks one
    - the node on the canvas follows live while you drag; the whole drag is one undo step (`holdHistory` / `releaseHistory`, like a node drag)
- Stored in the node's `color` (graph format v3+, see [graph-format.md](graph-format.md)); `null` = default look. Reading typed hex and the fill share live in `src/lib/graph/color.ts`.

### Node types

The Type dropdown lists `NODE_TYPES` from `src/lib/graph/node-types.ts`: `id`, `title` (the dropdown text), hover `description`, `ready`; for ready types also the template: `version`, the `ports` a new node gets (one list, each with a `kind`), its `content` with default values (basic / group: `name`, `color`) and `label(node)` for generic UI. **Basic**, **Group** and **UML class** ([graph-uml.md](graph-uml.md)) are drawn and can be chosen; **Note** and **Decision** are listed greyed out with "(later)" to show what is planned.

- **Changing the type reshapes the node** to the new type's template, port kind by port kind: a kind the type has no ports of is removed from the node with the links on those ports; a kind it has keeps the node's own ports, or gets the template's when the node has none (Group → Basic gets a fresh input and output). `content` gets the template's keys it lacks and keeps what it has, so a name and colour survive Basic → Group → Basic; `typeVersion` follows the type. When links would go, the panel asks first; one Ctrl+Z restores everything.
- **Versions and samples:** every ready type has a sample node per version in `static/data/node-types/<type>/<type>-v<n>.json` (like the graph format samples): a header (`format: "imge-node-type"`, `type`, `version`, `graphFormat`) and the node as it appears in a graph file of that format; a sample written in an older graph format is upgraded before it is compared (the v1 samples of basic and group are written in graph format 5; their template didn't change with graph format 6, so they stay version 1). `node-types.spec.ts` checks that each version has its sample, the newest matches the template, new nodes and type changes produce exactly that shape, and every sample loads as part of a graph. Changing a type's template means a new `version` and a new sample file, **and bringing the editor's own graphs (the start graph and every example) to that version**: a test checks that every node there has its type's newest version and every key of its template's content.
- **Group:** a frame drawn behind the other nodes and the links, its name centred in a gap of the top edge in the frame's colour, no ports. A colour tints the frame, the name and, lightly, the inside.
    - Only the name and the corner mark take the mouse: click the name to select, drag it to move, double-click it to rename. Clicks inside the frame reach the canvas and the nodes on top of it (panning, box selection and clicking nodes work there as usual).
    - A box selection takes a group only when the whole group is inside the box, so a box drawn inside a group selects the nodes in it.
    - Groups have no ports, so links never start or end at one (dragging, F). A group's panel has no "Ports and links" section.
    - **Holds nodes:** a group is the parent of the nodes in it (its content's `children`, group type version 2). Its frame always wraps them with a **64-unit margin** (4rem at zoom 1): when a child is dragged outwards the frame grows with it, so the frame is never smaller than what it holds.
    - **Keys:** **Ctrl+G** puts the selected nodes in a new group, or, when exactly one group is among them, adds the others to that group; **Ctrl+Shift+G** ungroups (dissolves a selected group, or takes selected nodes out of their group).
    - **Adding nodes to an existing group:** drop them inside its frame; make them there (Shift+A at the mouse, the toolbar's Add Node at the screen centre) or paste them there (Ctrl+V at the mouse; a pasted group keeps its own contents); or select them together with the group and press Ctrl+G. The group's **Contents** section lists what it holds.
    - **Joining and leaving:** drop a node inside a group's frame and it joins that group (the innermost one, when groups are nested). A node in a group stays in it when dragged; drag it with **Ctrl** (Cmd) held to take it out: on release it leaves its group, or joins the group it was dropped in. Moving a group moves everything it holds, nested groups included; deleting a group keeps its children; copying a group copies what it holds.
    - **Size:** drag the small corner mark at the frame's bottom right (snapped to half grid squares; Alt = free), or set **Width** and **Height** in the **Content** section. Both stop at the children plus the margin (an empty group at 100 × 100). The size is stored in the group's content (`width`, `height`); without it a group is 320 × 192 (20 × 12 em), grown around its children.

A node whose `type` isn't in the list (e.g. from a newer file) shows that type as an extra option. A type becomes choosable (`ready: true`) once the canvas can draw it and it has its own panel section.

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
| `src/lib/components/properties/GraphPropertiesPanel.svelte` | The dock: header (title "Properties (N)", hide chevron), the folding section headers, the tab while hidden, and the shared styles of all sections. |
| `src/lib/components/properties/sections.ts` | `PANEL_SECTIONS` (which sections, when), `PanelContext`, and `LINK_ARROW_LABELS` (shared with the Esc menu). |
| `src/lib/components/properties/PropText.svelte` | Text / number field that applies on Enter or blur, Esc cancels; follows the value while not focused (so undo shows up). |
| `src/lib/components/properties/PropsGraph.svelte`, `PropsNode.svelte`, `PropsNodeLinks.svelte`, `PropsNodes.svelte`, `PropsLink.svelte`, `PropsLinkStyle.svelte` | The sections in the table above. |
| `src/lib/graph/store.ts` | `showPropertiesPanel`, and the operations the panel uses, among them `setNodePosition`, `setNodeType`, `setNodeColor` and `setLinkStyle`. |
| `src/lib/components/properties/PropColor.svelte` | The colour field: preview swatch (opens the picker), hex text field, reset; makes a picker drag one undo step. |
| `src/lib/components/properties/ColorPicker.svelte` | The colour picker: saturation / brightness square, hue bar, tints and shades, presets; mouse, touch and arrow keys. |
| `src/lib/graph/color.ts` | `parseHexColor` (typed hex to `#rrggbb`), `dimColor` and `NODE_FILL_SHARE` (the fill), `hexToHsv` / `hsvToHex`, `mixHex` / `tintsAndShades`, `NODE_COLOR_PRESETS`. Tests in `color.spec.ts`. |
| `src/lib/graph/node-types.ts` | `NODE_TYPES`: the Type dropdown's list, and for ready types their template (version, ports, content, label); `nodeType(id)`, `nodeLabel(node)`, `nodeName`, `nodeColor`, `hasNamedContent`, `portSide`. |
| `src/lib/components/properties/PropsGroupContents.svelte` | The Contents section of groups: children (select, take out), how to add, Ungroup. |
| `src/lib/components/properties/PropsUmlMembers.svelte`, `PropUmlLines.svelte` | The Attributes and methods section of UML classes; a member field with highlighting and format check. |
| `src/lib/components/properties/PropsContent.svelte` | The Content section of basic / group nodes: name and colour. |
| `static/data/node-types/<type>/<type>-v<n>.json` | One sample node per ready type and version (basic-v1, group-v1); checked by `src/lib/graph/node-types.spec.ts`. |
| `src/lib/icons/icon-sidebar-right.svelte`, `icon-chevron-left.svelte`, `icon-chevron-right.svelte` | The toolbar button's icon and the hide / show chevrons. |

## Known limits

- The panel floats over the right side of the canvas; fitting the graph (Home) doesn't leave room for it, so the rightmost nodes can sit under it. Hide it with <kbd>N</kbd> to see them.
- Fixed width (17em); it can't be dragged wider yet, and it docks only on the right.
- On a phone-sized window it covers about half of the canvas; hide it there.
- Ports can't be added, removed or renamed from the panel yet; the Basic, Group and UML class node types can be chosen.
- Groups can't be resized yet and don't carry their contents when moved.

## Changes

- 2026-10-23 — the start graph and all examples follow the newest type versions (basic 2, group 3), checked by a test
- 2026-10-23 — circles have their own size rules: circle nodes fit their name (3.5em to 9em), circle groups use a 32-unit margin around their children's corners
- 2026-10-23 — node shape: Square / Circle in the Content section (basic, group); circle groups are round frames
- 2026-10-23 — groups: Contents section (children, take out, Ungroup); the Node section shows the group a node is in (Leave); nodes made or pasted inside a frame join it; Ctrl+G adds to the one selected group
- 2026-10-23 — groups hold their nodes: the frame wraps its children with a 64-unit margin, a dropped node joins, Ctrl+drag takes it out, moving a group moves its children; resize by the corner mark or Width / Height, never smaller than the children
- 2026-10-21 — groups get a size: Width and Height in the Content section (content `width` / `height`, default 320 × 192)
- 2026-10-21 — UML class type: Attributes and methods section (highlighting while typing, format check)
- 2026-10-21 — graph format v6: Node section keeps what every node has (id, type, position); name and colour moved to a new Content section shown for types that have them; Ports and links lists ports by kind; labels come from the node's type (`nodeLabel`); the duplicated sentence in Node types fixed
- 2026-10-21 — node types carry a version, default name and ports template; changing the type reshapes the node's ports (asks when links would go); versioned samples per type in `static/data/node-types/`; a group's name takes its frame's colour
- 2026-10-21 — node type Group (frame behind other nodes, name in the top edge, no ports); Ports and links section hidden for groups; a linked node can become a group (asks, removes its links, one undo step); title reads "Properties (N)" instead of a separate key cap
- 2026-10-21 — node colour: Color row (preview swatch, hex field, reset) with a colour picker in the style of htmlcolorcodes.com (saturation / brightness square, hue bar, tints and shades, presets; live on the canvas, one undo step per drag), for one node and for several; new function `setNodeColor`
- 2026-10-17 — node Type dropdown (placeholder list in `node-types.ts`: Basic choosable, Note / UML class / Decision planned); new function `setNodeType`
- 2026-10-17 — no sideways scroll bar (Firefox): fields shrink to the panel, long names wrap, rows include their padding in their width
- 2026-10-17 — first version: Graph, Node, Ports and links, Selection, Link and Look sections; N, toolbar button, hide chevron and edge tab; folding remembered; new store functions `setNodePosition`, `setLinkStyle`
