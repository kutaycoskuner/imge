# Graph file format

The JSON structure the graph editor loads and exports, its version history, and how to add a new version with an adapter that upgrades older files.

Current version: **1**

## Files

| File | Role |
|---|---|
| `src/lib/graph/types.ts` | TypeScript shapes, one set per version; old versions stay frozen for their adapters. |
| `src/lib/graph/migrations.ts` | `CURRENT_GRAPH_VERSION`, the adapters and `migrateGraph()`. |
| `src/lib/graph/migrations.spec.ts` | Tests: every old version upgrades correctly; bad files are refused. |
| `static/data/test-node-graph.json` | Test graph the editor loads, stored as the current version. |

## Structure (version 1)

```json
{
    "metadata": { "format": "imge-graph", "version": 1 },
    "data": {
        "nodes": [
            {
                "_id": 0,
                "type": "basic",
                "position": { "x": 0, "y": -140 },
                "data": {
                    "title": "First Node",
                    "inputs": [],
                    "outputs": [{ "id": "output_0", "type": "basic", "label": "Output A" }]
                }
            }
        ],
        "links": [
            { "sourceNodeId": 0, "sourceOutputId": "output_0", "targetNodeId": 1, "targetInputId": "input_0" }
        ]
    }
}
```

- `metadata`
    - `format`: always `"imge-graph"`; tells a graph file apart from any other JSON
    - `version`: whole number, the format version the file is written in
    - other keys are allowed and carried over unchanged
- `data.nodes[]`
    - `_id`: number, unique within the graph
    - `type`: node kind, currently always `"basic"`
    - `position`: world coordinates of the node's top-left corner; x right, **y up** (see [graph-editor-canvas.md](graph-editor-canvas.md))
    - `data.title`: text shown on the node
    - `data.inputs[]` / `data.outputs[]`: ports
        - `id`: unique **within its node only**, e.g. `output_0`
        - `type`: port kind, currently always `"basic"`
        - `label`: display name
- `data.links[]`: one connection from an output port to an input port
    - `sourceNodeId` + `sourceOutputId`: the output it starts at
    - `targetNodeId` + `targetInputId`: the input it ends at
    - a port is identified by node id + port id together, because port ids repeat across nodes

## Loading and saving

- **Loading:** the editor passes every file through `migrateGraph()`.
    - the version is read from `metadata.version`; a file with neither `format` nor `version` is version 0
    - adapters run one after another until the file reaches the current version: `0 → 1 → 2 ...`
    - every adapter that ran is logged in the browser console ("graph upgraded from v0 to v1: ..."), so an upgrade never happens silently
    - the original object is not changed
- **Refused files:** throw `GraphFormatError` instead of being guessed at:
    - no `data.nodes` array (not a graph file)
    - another `format` name
    - a `version` that isn't a whole number ≥ 1
    - a version newer than the app (the file was written by a newer imge)
- **Saving:** Export always writes the current version (`stampCurrentVersion()`).

## Version history

| Version | Date | Change | Adapter from the previous version |
|---|---|---|---|
| 0 | before 2026-10-14 | Unversioned files: empty `metadata`, positions with **y down**. | – |
| 1 | 2026-10-14 | Adds `metadata.format` and `metadata.version`. Positions use **y up**, since the editor's world y axis now points up. | `0 → 1`: adds the metadata, negates every node's `position.y` so the layout looks the same as before. |

## Adding a new version

Do this for every change to the file structure or to what a field means, however small. Files saved by older versions must keep loading.

1. **Types:** in `types.ts`, add `GraphV<n+1>` (and node/link/port types that changed) below the current one, and point the `Graph` / `GraphNode` / `Link` / `Port` aliases at it. Leave the older types as they are.
2. **Adapter:** in `migrations.ts`, append one entry to `MIGRATIONS`:
    - `from: n`, `to: n+1`
    - `description`: what changes, in words a user understands (it's logged on load)
    - `migrate`: a pure function from `GraphV<n>` to `GraphV<n+1>`; it returns a new object and keeps every field it doesn't change
3. **Version:** set `CURRENT_GRAPH_VERSION = n+1`.
4. **Test:** in `migrations.spec.ts`, add a fixture in the old version `n` and a test that upgrades it to the current version and checks the changed fields. The older fixtures stay; they now run through the longer chain too.
5. **Test graph:** update `static/data/test-node-graph.json` to the new version.
6. **Docs:** add a row to the version history above and update the structure section.

**Never edit a released adapter.** Files already upgraded by it would no longer match what it produces. If an adapter was wrong, fix it with a new version and adapter.

## Known gaps (candidates for a later version)

- Nodes use `_id`, while links refer to nodes as `sourceNodeId` / `targetNodeId`: the naming is inconsistent.
- Links have no id of their own, so a single link can't be selected or deleted by id.
- Import isn't wired up yet; only the test graph is loaded.

## Changes

- 2026-10-14 — first version: structure of format version 1, loading/saving rules, version history (v0, v1), procedure for adding a new version
