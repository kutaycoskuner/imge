# Graph file format

The JSON structure the graph editor loads and exports, its version history with a sample per version, and how to add a new version with an adapter that upgrades older files.

Current version: **2**

## Files

| File | Role |
|---|---|
| `src/lib/graph/types.ts` | TypeScript shapes, one set per version; old versions stay frozen for their adapters. |
| `src/lib/graph/migrations.ts` | `CURRENT_GRAPH_VERSION`, the adapters and `migrateGraph()`. |
| `src/lib/graph/migrations.spec.ts` | Tests: every version sample upgrades to exactly the current sample; bad files are refused. |
| `static/data/samples/graph-v<n>.json` | The same tiny graph (2 nodes, 1 link) saved in each format version, to compare versions side by side; also the test fixtures. |
| `static/data/test-node-graph.json` | Base graph the editor loads, stored as the current version: a map of the editor's own features (camera branch, graph-data branch), each link meaning "builds on". |

## Structure (version 2)

```json
{
    "metadata": { "format": "imge-graph", "version": 2 },
    "data": {
        "nodes": [
            {
                "id": "n1",
                "name": "First Node",
                "type": "basic",
                "position": { "x": 0, "y": -140 },
                "inputs": [],
                "outputs": [{ "id": "o1", "type": "basic", "label": "Output A" }]
            }
        ],
        "links": [
            {
                "id": "l1",
                "type": "basic",
                "name": "optional",
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
    - other keys are allowed and carried over unchanged
- `data.nodes[]`
    - `id`: string, unique within the graph: `n1`, `n2` ...; the editor never reuses an id
    - `name`: text shown on the node
    - `type`: node kind, currently always `"basic"`
    - `position`: world coordinates of the node's top-left corner; x right, **y up** (see [graph-editor-canvas.md](graph-editor-canvas.md))
    - `inputs[]` / `outputs[]`: ports
        - `id`: unique **within its node only**: inputs `i1`, `i2` ..., outputs `o1`, `o2` ...
        - `type`: port kind, currently always `"basic"`
        - `label`: display name (shown as a tooltip on the port)
    - other keys are allowed and carried over unchanged
- `data.links[]`: one connection from an output port to an input port
    - `id`: string, unique within the graph: `l1`, `l2` ...; it means nothing on purpose, so it stays the same when the link is re-routed and anything attached to it keeps track of it
    - `type`: link kind, currently always `"basic"`
    - `name`: optional label (shown as a tooltip on the link)
    - `source`: `{ node, port }`, the output it starts at
    - `target`: `{ node, port }`, the input it ends at
    - rules (enforced by the editor, `addLink()` in `src/lib/graph/store.ts`):
        - always from an output to an input; never from a node to itself
        - any number of links may meet at a port, in both directions (many-to-many)
        - no exact duplicates: one link per output-port → input-port pair

## Version samples

The same graph (First Node → Second Node) in every version, so the differences are easy to see:

| Version | Sample |
|---|---|
| 0 | [graph-v0.json](../static/data/samples/graph-v0.json) |
| 1 | [graph-v1.json](../static/data/samples/graph-v1.json) |
| 2 | [graph-v2.json](../static/data/samples/graph-v2.json) |

The tests load every sample and check that it upgrades to **exactly** the newest one, so the samples double as the adapters' specification.

## Loading and saving

- **Loading:** the editor passes every file through `migrateGraph()`.
    - the version is read from `metadata.version`; a file with neither `format` nor `version` is version 0
    - adapters run one after another until the file reaches the current version: `0 → 1 → 2`
    - every adapter that ran is logged in the browser console ("graph upgraded from v0 to v2: ..."), so an upgrade never happens silently
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

- Ports can't be added or removed in the editor yet; new nodes have one input and one output.
- Link `type` and `name` can't be edited in the editor yet; they are kept when a link is re-routed.

## Changes

- 2026-10-15 — v2 ids follow one scheme: nodes `n1`, links `l1`, inputs `i1`, outputs `o1` (v2 wasn't released yet, so the `1 → 2` adapter does the renaming; no v3)
- 2026-10-14 — format version 2 (string ids, `name`, ports on the node, links with id / type / name / source / target, many-to-many links); version samples in `static/data/samples/`; the base graph is stored as v2
- 2026-10-14 — base graph replaced by a feature map of the editor (17 nodes, 15 links)
- 2026-10-14 — link rules added (output → input, no self-links, one link per input, which makes target node + input the link's identity); format version unchanged
- 2026-10-14 — first version: structure of format version 1, loading/saving rules, version history (v0, v1), procedure for adding a new version
