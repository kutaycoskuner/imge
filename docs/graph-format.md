# Graph file format

The JSON structure the graph editor loads and exports, its version history with a sample per version, and how to add a new version with an adapter that upgrades older files.

Current version: **6**

## Files

| File | Role |
|---|---|
| `src/lib/graph/types.ts` | TypeScript shapes, one set per version; old versions stay frozen for their adapters. |
| `src/lib/graph/migrations.ts` | `CURRENT_GRAPH_VERSION`, the adapters and `migrateGraph()`. |
| `src/lib/graph/migrations.spec.ts` | Tests: every version sample upgrades to exactly the current sample; bad files are refused. |
| `static/data/samples/graph-v<n>.json` | The same tiny graph (2 nodes, 1 link) saved in each format version, to compare versions side by side; also the test fixtures. |
| `static/data/node-types/<type>/<type>-v<n>.json` | One sample node per node type and type version (`basic-v1`, `basic-v2`, `group-v1` to `group-v3`, `uml-class-v1`), with a small header (`format: "imge-node-type"`, `type`, `version`, `graphFormat`); test fixtures for the type templates. |
| `static/data/test-node-graph.json` | Base graph the editor loads, stored as the current version: a map of the editor's own features (camera, files & menu, graph data, node types; 48 nodes (one of them a circle), 51 links; the Node color node is coloured, and a violet group "Types v1" holds the node type templates and wraps them), laid out on the half grid (node corners on multiples of 20, so snapped drags keep it aligned), each link meaning "builds on". It also shows the format at work: each branch uses a different link shape (spline, line, manhattan), "Shortcuts & key caps" takes four links into one input, links carry arrows (one both ways), a cycle (Version samples → Graph format) and a self-loop (Autosave) go around their nodes, and three links have names. |

## Structure (version 6)

```json
{
    "metadata": { "format": "imge-graph", "version": 6, "direction": "left-to-right" },
    "data": {
        "nodes": [
            {
                "id": "n1",
                "type": "basic",
                "typeVersion": 1,
                "position": { "x": 0, "y": -140 },
                "ports": [
                    { "id": "i1", "kind": "in", "type": "basic", "label": "Input A" },
                    { "id": "o1", "kind": "out", "type": "basic", "label": "Output A" }
                ],
                "content": { "name": "First Node", "color": null }
            }
        ],
        "links": [
            {
                "id": "l1",
                "type": "basic",
                "name": "optional",
                "shape": "manhattan",
                "bend": 0.5,
                "arrow": "forward",
                "route": "above",
                "source": { "node": "n1", "port": "o1" },
                "target": { "node": "n2", "port": "i1" }
            }
        ]
    }
}
```

- `metadata`
    - `format`: always `"imge-graph"`; tells a graph file apart from any other JSON
    - `version`: whole number, the format version the file is written in
    - `direction`: `"left-to-right"` (default) or `"top-to-bottom"`; the graph's reading direction
        - left-to-right: inputs on a node's left edge, outputs on its right; links flow rightwards
        - top-to-bottom: inputs on the top edge, outputs on the bottom; links flow downwards
        - node positions are stored as they are drawn; Transpose in the editor switches the direction and turns them (see [graph-editing.md](graph-editing.md#direction-and-transpose))
    - other keys are allowed and carried over unchanged
- `data.nodes[]`: every node has the same top level, whatever its type; everything the type defines is in `content` (why: [Why nodes look like this](#why-nodes-look-like-this))
    - `id`: string, unique within the graph: `n1`, `n2` ...; the editor never reuses an id. It identifies the node; a human-readable label comes from the type (see `content`)
    - `type`: the node type's id: `"basic"` (a name and ports), `"group"` (a frame drawn behind other nodes, its name on the top edge, no ports) or `"uml-class"` (three compartments, see [graph-uml.md](graph-uml.md)); planned: notes, UML classes, decisions, circuit symbols. An unknown value is kept and drawn as basic. Types are defined in `src/lib/graph/node-types.ts`
    - `typeVersion`: whole number, the version of the type's template this node follows (`1` for every node so far). A type can change its `content` or ports in a later template version and upgrade its nodes on its own, without a new graph format version. Each version has a sample node in `static/data/node-types/<type>/<type>-v<n>.json`
    - `position`: world coordinates of the node's top-left corner; x right, **y up** (see [graph-editor-canvas.md](graph-editor-canvas.md))
    - `ports[]`: where links attach, in one list; `[]` for types without ports (group)
        - `id`: unique **within its node only**; inputs `i1`, `i2` ..., outputs `o1`, `o2` ... (kept from v5, so links didn't change)
        - `kind`: what may connect: `"in"` (takes links), `"out"` (gives links), `"any"` (two-way, e.g. a resistor terminal; planned)
        - `type`: what flows through it: currently always `"basic"` (later e.g. number, vector, bit). Not the same as `kind`
        - `label`: display name (shown as a tooltip on the port)
        - `side`: optional, where the port is drawn, relative to the reading direction: `"start"` / `"end"` (the edges links enter / leave: left / right in left-to-right) or `"above"` / `"below"` (the edges across). Set by the type's template; missing = from `kind`: in → start, out → end, any → start
    - `content`: an object whose keys the node's type defines; `{}` when the type has none
        - uml-class: `name`, `color`, and `attributes` / `methods`: lists of member lines in UML notation, stored as typed
        - group (type version 2): also `children` (the ids of the nodes it holds; a node is in at most one group, groups may hold groups) and optional `width` / `height` (world units, at least 100) as its smallest size; missing = 320 × 192. The frame drawn is that rect grown to wrap the children with a 64-unit margin. A version 1 group (no `children`) holds nothing
        - basic (type version 2) and group (type version 3): also `shape`, `"square"` (the default) or `"circle"`; a node without it is a square
        - basic and group: `name` (text shown on the node or on the group's top edge) and `color` (a hex colour `"#rrggbb"`, or `null` for the theme's default; drawn as the border, with a dim version as the fill; other text is kept but drawn as the default)
        - other keys inside `content` are carried over unchanged
    - other keys are allowed and carried over unchanged
- `data.links[]`: one connection from an output port to an input port
    - `id`: string, unique within the graph: `l1`, `l2` ...; it means nothing on purpose, so it stays the same when the link is re-routed and anything attached to it keeps track of it
    - `type`: link kind, currently always `"basic"`
    - `name`: optional label, drawn in the middle of the link
    - `shape`: how the link is drawn
        - `"spline"`: a curve with horizontal tangents (the default)
        - `"line"`: a straight line
        - `"manhattan"`: right angles: out horizontally, one vertical segment, in horizontally
    - `bend`: optional, used by `"manhattan"`: where the vertical segment sits, as a fraction of the horizontal gap from the output (`0`) to the input (`1`); missing means `0.5`
        - a fraction rather than a position, so the corner stays in proportion when nodes move
        - for a backward link (input left of its output) the link goes out a short stub, across, and back in; `bend` then places the crossing segment between the two ports' heights
        - kept when the shape changes, so a link switched back to manhattan gets its corner back
        - for a link going around its nodes (see `route`), `bend` sets how far from the nodes its lane runs: `0` close, `1` far
    - `arrow`: direction marks, relative to the link's own direction (output → input)
        - `"forward"`: arrowhead at the input end (the default for new links)
        - `"backward"`: arrowhead at the output end
        - `"both"`: arrowheads at both ends
        - `"none"`: no arrowheads
    - `route`: `"above"` (default) or `"below"`; the side a link goes around its nodes when it closes a cycle (1 → 2 → 1: the link pointing back against the reading direction) or loops back to its own node. In top-to-bottom graphs above means left and below means right. Other links ignore it.
    - `source`: `{ node, port }`, the port it starts at: a port of kind `out` (or `any`)
    - `target`: `{ node, port }`, the port it ends at: a port of kind `in` (or `any`)
    - rules (enforced by the editor, `addLink()` in `src/lib/graph/store.ts`):
        - always from a port that gives links to one that takes them (out → in; `any` ports take part in both directions once types have them)
        - cycles are allowed (1 → 2 → 1, 1 → 2 → 3 → 1), and so are self-loops (a node's output into its own input)
        - any number of links may meet at a port, in both directions (many-to-many)
        - no exact duplicates: one link per output-port → input-port pair
    - which link "closes" a cycle is not stored; the editor works it out from the graph (`findBackLinks()`, see [graph-editing.md](graph-editing.md#cycles-and-self-loops))

## Why nodes look like this

From version 6 on, nodes are built for many kinds of node that don't share the same fields: UML classes with compartments, circuit symbols without a name, points, notes, decision nodes, later calculating nodes. So a node has two parts.

- **The top level** (`id`, `type`, `typeVersion`, `position`, `ports`) is what the **editor itself** reads for every node, whatever its type.
- **`content`** is everything the **type** defines: only that type's drawing and its Properties panel section read it. Generic editor code never looks inside; when it needs something like a readable label, it asks the type.

**The rule for a new field:** if code other than the type's own drawing or Properties section reads it, it goes on the top level; otherwise into `content`.

### Why `name` and `color` are in `content`

Not every type has them: a resistor or an AND gate is drawn as a symbol, a point is just a dot. `id` identifies a node; `name` was only ever a human label, so it belongs to the types that have one. Generic places that need text for a node (node lists, link descriptions, undo entries, exports) ask the type for a label (`label(node)`; e.g. basic: its name, a gate: "AND gate (n4)").

### Why `ports` are not in `content`

Ports are where **links** attach, and links belong to the editor, not to a type. A lot of generic code reads ports:

| Generic code | What it needs from ports |
|---|---|
| dragging a link from a port | which port was grabbed, and its kind |
| `CAN_LINK` / `addLink` | whether the two kinds may connect |
| drawing links (`GraphLinks`) | where each port sits, to draw the link's ends |
| deleting a node, changing its type | which links go with a port |
| copy / paste, F (quick link), the panel's Ports and links | the node's ports, to keep or make links |
| file checks (tests, loading) | that every link end points at a real port |

A link also stores `{ node, port }`: it points straight at a port by id. With ports inside `content`, every one of these places would have to dig into each type's own data (or each type would have to answer for it), and `content` would no longer be the type's own business.

Ports that depend on the content still work: e.g. an AND gate whose number of inputs is chosen in its Properties section changes `content`, and the same edit rewrites the top-level `ports` (and removes links on ports that go away, as a type change already does). The type decides which ports exist; the editor only reads the result.

### Why one `ports` list with `kind`

- One list instead of `inputs` / `outputs`: ports that are neither (two-way terminals of a circuit) fit without a new field, and new kinds can be added later without changing the node's shape.
- `kind` (direction: in / out / any) is not `type` (what flows through: basic, later number, vector, bit). Both are checked when linking: kind decides whether two ports may connect at all, type (later) whether their values fit.
- Which kinds may link is decided in one place (`CAN_LINK`: out → in or any, in ← out or any, any ↔ anything), instead of every piece of link code assuming output → input.
- `side` places a port relative to the reading direction, so it stays put when the graph is transposed; the default from `kind` makes basic nodes look exactly as before.

### Why `typeVersion` is its own field

`content` and the ports now depend on the type, and types will change: a UML class might get a fourth compartment. With the template version on every node, a type can upgrade its own nodes without a new graph format version. It is a separate number rather than part of the type string (`"uml-class@1"`), so code compares `type` directly and never has to split it.

### Other decisions

- **Port ids kept** (`i1`, `o1`): they only need to be unique within their node, the links didn't change in the upgrade, and the direction now lives in `kind`. New ports can use any free id.
- **Names turned down for `content`:** `data` (the graph root already has `data: { nodes, links }`, and v0 nodes had a `data` field the adapters still read), `props` (Svelte props and the Properties panel), `params` (doesn't fit UML), `context` (a node's surroundings, not its parts; the panel's code already has `ctx`), `sections` (fine as a key *inside* `content` for UML compartments).
- **Pictures are referenced, never embedded:** e.g. `content.symbol: "resistor"`, with the images kept with the type. A shape fixed by the type lives in the type's template; a shape chosen per node goes into `content.shape`.

## Version samples

The same graph (First Node → Second Node) in every version, so the differences are easy to see:

| Version | Sample |
|---|---|
| 0 | [graph-v0.json](../static/data/samples/graph-v0.json) |
| 1 | [graph-v1.json](../static/data/samples/graph-v1.json) |
| 2 | [graph-v2.json](../static/data/samples/graph-v2.json) |
| 3 | [graph-v3.json](../static/data/samples/graph-v3.json) |
| 4 | [graph-v4.json](../static/data/samples/graph-v4.json) |
| 5 | [graph-v5.json](../static/data/samples/graph-v5.json) |
| 6 | [graph-v6.json](../static/data/samples/graph-v6.json) |

The tests load every sample and check that it upgrades to **exactly** the newest one, so the samples double as the adapters' specification.

## Loading and saving

- **Loading:** the editor passes every file through `migrateGraph()`.
    - the version is read from `metadata.version`; a file with neither `format` nor `version` is version 0
    - adapters run one after another until the file reaches the current version: `0 → 1 → 2 → 3 → 4 → 5 → 6`
    - every adapter that ran is logged in the browser console ("graph upgraded from v0 to v6: ..."), so an upgrade never happens silently
    - the original object is not changed
- **Refused files:** throw `GraphFormatError` instead of being guessed at:
    - no `data.nodes` array (not a graph file)
    - another `format` name
    - a `version` that isn't a whole number ≥ 1
    - a version newer than the app (the file was written by a newer imge)
- **Saving:** always writes the current version (`stampCurrentVersion()`).

## Version history

| Version | Date | Change | Adapter from the previous version |
|---|---|---|---|
| 0 | before 2026-10-14 | Unversioned files: empty `metadata`, positions with **y down**. | – |
| 1 | 2026-10-14 | Adds `metadata.format` and `metadata.version`. Positions use **y up**, since the editor's world y axis now points up. | `0 → 1`: adds the metadata, negates every node's `position.y` so the layout looks the same as before. |
| 2 | 2026-10-15 | Ids follow one scheme: nodes `n1`, `n2` ..., links `l1`, `l2` ..., ports per node `i1` ... / `o1` ... (were `_id` numbers and `input_0` / `output_0`). `name` (was `data.title`), ports directly on the node (were in `data`). Links get their own `id`, a `type`, an optional `name`, and `source` / `target` endpoints (were four `source…Id` / `target…Id` fields). An input may take many links. | `1 → 2`: renumbers nodes, ports and links by position in the file (the link ends follow), renames the node fields and moves the ports up, turns the endpoint fields into `source` / `target`. |
| 3 | 2026-10-15 | Nodes get `color` (`null` = theme default). Links get `shape` (`spline`, `line`, `manhattan`) and, for manhattan, an optional `bend`. | `2 → 3`: adds `color: null` to every node (a color a node already carried as an extra key is kept) and `shape: "spline"` to every link, so old graphs look exactly as before. |
| 4 | 2026-10-16 | Links get `arrow` (`forward`, `backward`, `both`, `none`) and `route` (`above`, `below`). Cycles and self-loops are allowed; a link that closes a cycle and a self-loop go around their nodes on the `route` side, with `name` drawn in the middle of every link. | `3 → 4`: adds `arrow: "none"` and `route: "above"` to every link (values a link already carried as extra keys are kept), so old graphs look exactly as before. |
| 5 | 2026-10-16 | The graph gets `metadata.direction` (`left-to-right`, `top-to-bottom`): ports, links, routes and reading order follow it; Transpose in the editor switches it and turns the layout. | `4 → 5`: adds `direction: "left-to-right"` (a value a file already carried is kept), so old graphs look exactly as before. |
| 6 | 2026-10-21 | Node model for many node types: every node has `id`, `type`, `typeVersion`, `position`, `ports` and `content`. `name` and `color` move into `content`; `inputs` and `outputs` become one `ports` list whose ports have a `kind` (`in`, `out`, later `any`) and an optional `side`. See [Why nodes look like this](#why-nodes-look-like-this). | `5 → 6`: moves `name` / `color` into `content`, turns inputs into ports of kind `in` and outputs into ports of kind `out` (ids kept, so links don't change), sets `typeVersion: 1`; extra keys, and a `typeVersion` or `content` a file already carried, are kept. |

## Adding a new version

Do this for every change to the file structure or to what a field means, however small. Files saved by older versions must keep loading.

1. **Types:** in `types.ts`, add `GraphV<n+1>` (and node/link/port types that changed) below the current one, and point the `Graph` / `GraphNode` / `Link` / `Port` aliases at it. Leave the older types as they are.
2. **Adapter:** in `migrations.ts`, append one entry to `MIGRATIONS`:
    - `from: n`, `to: n+1`
    - `description`: what changes, in words a user understands (it's logged on load)
    - `migrate`: a pure function from `GraphV<n>` to `GraphV<n+1>`; it returns a new object and keeps every field it doesn't change
3. **Version:** set `CURRENT_GRAPH_VERSION = n+1`.
4. **Sample:** add `static/data/samples/graph-v<n+1>.json` (the same tiny graph in the new version) and a line for it in `SAMPLES` in `migrations.spec.ts`. The tests then check that every older sample upgrades to exactly the new one.
5. **Base graph:** update `static/data/test-node-graph.json` to the new version.
6. **Docs:** add a row to the version history and the samples table above, and update the structure section.

**Never edit a released adapter.** Files already upgraded by it would no longer match what it produces. If an adapter was wrong, fix it with a new version and adapter.

## Known gaps (candidates for a later version)

- Ports can't be added or removed in the editor yet; new nodes get their type's ports.
- Ports of kind `any` and the `side` field are defined but no type uses them yet.
- Link `type` and `name` can't be edited in the editor yet; they are kept (with `shape` and `bend`) when a link is re-routed.

## Changes

- 2026-10-23 — base graph and examples: every node on its type's newest version (basic 2 with `shape`, group 3), checked by `node-types.spec.ts`
- 2026-10-23 — content `shape` (square / circle) for basic (type v2) and group (type v3); base graph gets Node shape and Examples (by category), Group / Type samples renamed; examples use circles where they fit
- 2026-10-23 — group type version 2: content `children`; base graph and the examples' groups list their children (no format change)
- 2026-10-21 — node type `uml-class` (content `attributes`, `methods`); group content's optional `width` / `height`; no format change
- 2026-10-21 — base graph: the "Types v1" group (380 × 380) frames Basic, Group and the UML class UmlClass (46 nodes, 49 links)
- 2026-10-21 — format version 6: node model `id`, `type`, `typeVersion`, `position`, `ports` (one list with `kind`, optional `side`), `content` (`name`, `color` for basic / group); `5 → 6` adapter, sample graph-v6.json; base graph and examples stored as v6 (its "Graph format" and "Format adapters" nodes now say v6); new section "Why nodes look like this"
- 2026-10-21 — node type samples per type version in `static/data/node-types/`
- 2026-10-21 — base graph gets Colour picker and a Node types branch inside a group frame (45 nodes, 47 links)
- 2026-10-21 — node `type` `"group"` (no format change: `type` was already free text)
- 2026-10-21 — node `color` is drawn and editable (hex `#rrggbb`); the base graph's Node color node is coloured
- 2026-10-17 — base graph gets Box select, Copy / paste, Undo / redo and Properties panel nodes (39 nodes, 41 links)
- 2026-10-16 — feature map: "Snap to grid" node added; all nodes moved onto the half grid (columns 300, rows 100 apart)

- 2026-10-16 — format version 5: `metadata.direction` (left-to-right / top-to-bottom), `4 → 5` adapter, sample graph-v5.json; base graph stored as v5
- 2026-10-16 — format version 4: link `arrow` and `route`; cycles and self-loops allowed; link names drawn mid-link; sample graph-v4.json; base graph stored as v4 with arrows, a cycle, a self-loop and named links
- 2026-10-15 — base graph rebuilt for the current features (33 nodes, 33 links, three branches showing all link shapes and many-to-many)
- 2026-10-15 — format version 3: node `color`, link `shape` (spline / line / manhattan) and `bend`; sample graph-v3.json; base graph stored as v3
- 2026-10-15 — v2 ids follow one scheme: nodes `n1`, links `l1`, inputs `i1`, outputs `o1` (v2 wasn't released yet, so the `1 → 2` adapter does the renaming; no v3)
- 2026-10-14 — format version 2 (string ids, `name`, ports on the node, links with id / type / name / source / target, many-to-many links); version samples in `static/data/samples/`; the base graph is stored as v2
- 2026-10-14 — base graph replaced by a feature map of the editor (17 nodes, 15 links)
- 2026-10-14 — link rules added (output → input, no self-links, one link per input, which makes target node + input the link's identity); format version unchanged
- 2026-10-14 — first version: structure of format version 1, loading/saving rules, version history (v0, v1), procedure for adding a new version
