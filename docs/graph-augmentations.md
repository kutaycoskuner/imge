# Augmentations

Logic that runs on a graph and makes it do something. Graphs are otherwise only drawn; an augmentation acts on them. Two so far: **Gravity** (a live layout) and **Arithmetic** (a calculation read from plain nodes).

State as of 2026-11-26.

- [The Augment control](#the-augment-control)
- [Checks first](#checks-first)
- [Gravity](#gravity)
- [Arithmetic](#arithmetic)
- [Try it](#try-it)
- [Adding an augmentation](#adding-an-augmentation)
- [Code](#code)
- [Changes](#changes)

## The Augment control

At the right end of the top bar, left of the theme toggle and set a little apart from it (a faint divider between them), the graph editor has an **augment ▾** button. It opens a dropdown:

1. **Augmentation**: the list to choose from (Gravity, Arithmetic).
2. What it does, in a few lines.
3. **Checks on the open graph**: each check with ✓ or ✗ and what it found, tested live while the dropdown is open (fix something in the graph and the check updates).
4. **Start …** (only when every check passes; otherwise "fix the failed checks to start") / **Stop …**, and its state.

While one runs the button reads its name, e.g. **● gravity** (for gravity the dot beats while the nodes move and rests once they have settled). **One runs at a time:** starting one stops the other (the menu says so before). Opening another graph (a file, an example, a graph node, New graph) stops it.

## Checks first

An augmentation can only run on a graph that passes its checks; a refusal is never silent, each failed check says why. Gravity's checks:

| Check | Fails when |
|---|---|
| No groups | the graph has a group (for now, to keep it simple: a group's frame wraps the nodes it holds, which gravity would pull apart); names them and suggests Ctrl+Shift+G (ungroup) or a copy of the graph |
| At least 2 nodes that can move | fewer than 2 nodes besides text nodes (text nodes stay where they are) |
| At least 1 link between them | no link between two moving nodes: nothing would pull |
| Every link has both ends | a link points at a node that isn't there (names the links) |
| At most 400 moving nodes | more: every two nodes push each other, so the work grows with the square of the count |

The start graph (the feature map) has a group, so gravity refuses it and says so; the **Gravity test** example passes.

## Gravity

While it runs:

- **Round dots, sized by links:** every node (but text nodes) becomes a round dot in its colour; each link it has makes it bigger (radius 8 + 4 per link, at most 72), so hubs stand out. Its name is **inside** it, centred, as large as fits the dot (7 to 16 px); a name too long even at 7 px is cut with … and shows whole on hover. Links are drawn as straight lines (the display override; your own comes back afterwards).
- **They move by themselves** and settle within a few seconds:
    - links pull their two dots close (about 50 units between their edges), like springs
    - all dots push each other apart, bigger ones harder
    - a weak pull towards the middle holds the whole together, so well-linked dots gather in the middle and loose ones drift to the edge
    - **no two dots overlap**: after every step a collision pass keeps at least 8 units between any two dots' edges
- **Drag a dot** and it stays under the mouse while the others wake up and follow; the same when nodes or links are added or removed.
- **Undo:** the whole run, your own drags and edits during it included, is one undo step. While it runs, Ctrl+Z says to stop it first; after **Stop**, one Ctrl+Z puts the layout from before back.

**Stop** keeps the new layout: the nodes are boxes again, at the dots' places (each node's top-left corner where its dot's was). The positions are saved with the graph like any move; the dot look is not.

How it works (`gravity.ts`, in the spirit of d3-force): each moving node is a body at its dot's centre; every frame the forces above change its velocity, scaled by a "heat" (alpha) that cools down each step, so the layout comes to rest; then the collision pass. A dragged dot is pinned (it doesn't move, the others react to it).

## Arithmetic

A calculation read from **basic nodes by their names**, no new node types:

| Node named | Is | Inputs |
|---|---|---|
| a number: `3`, `-2.5`, `1,5`, `−4` | its value | none |
| `+`, `−`, `×`, `÷` (also `-`, `*`, `x`, `·`, `/`, `:`) | an operator over its inputs | at least 2 |
| `=` | an output: shows its input's value | exactly 1 |

- **Links carry the values** from a node to the next. An operator takes its inputs **left to right** by where their source nodes stand (then top to bottom when two stand at the same x), so for − and ÷ the leftmost comes first: `10` left of `3` into `−` gives 7. Moving a node reorders its values.
- **While it runs**, every operator and `=` shows its result above it (`= 28`, beside it in top-to-bottom graphs), worked out again on every change, so renaming `3` to `5` updates all results at once. A result that can't be made shows `⚠ no result`, the reason on hover (division by 0, an input that failed).
- **It never changes the graph:** no undo step; Stop hides the results.

Its checks (each names the nodes that fail it):

| Check | Fails when |
|---|---|
| Only basic nodes | another type is in the graph (groups, text, tables …) |
| Every node is a number, an operator (+ − × ÷) or = | a node's name reads as none of them |
| Numbers take no inputs | a link goes into a number |
| Every operator has at least 2 inputs | fewer |
| At least one =, each with exactly 1 input | no `=`, or one with 0 or several inputs |
| No cycles | links go round in a circle |

How it works (`arithmetic.ts`): each node's role comes from its name (`roleOf`); `evaluate` follows the links back from every operator and output to the numbers, each node once, and returns a result or an error for each.

## Try it

Esc menu → **Examples** → under **Augmentations**, **Gravity test**: three topics (graph editor, files, keyboard page) with their hubs, a few bridges between them and two loose ideas, scattered on a grid. Then **augment ▾** → Gravity → **Start gravity**: the topics gather around their hubs, the hubs in the middle, the loose ideas at the edge.

**Arithmetic test** (also under Augmentations): (3 + 4) × (10 − 6) = 28 and 28 ÷ 8 = 3.5 as basic nodes. **augment ▾** → Arithmetic → **Start arithmetic**, then rename or move nodes and watch the results.

## Adding an augmentation

1. Its pure logic in its own module with tests (like `gravity.ts`, `gravity.spec.ts`).
2. An entry in `AUGMENTATIONS` (`augmentations.ts`): id, title, description and its checks (each `test(graph)` returns ok and what it found).
3. Its runner (like `gravity-run.ts`): start (after the checks), the work, stop; if it keeps changing the graph while it runs, wrap it in a history session (`beginSession` / `endSession` in `history.ts`) so it is one undo step.
4. Add its start / stop to `RUNNERS` in `AugmentMenu.svelte` and its running store to `runningId` there (one runs at a time).

## Code

| File | What it does |
|---|---|
| `src/lib/graph/augmentations.ts` | the augmentations as data, their checks, `runChecks`, `allPass` |
| `src/lib/graph/gravity.ts` | gravity's physics: link counts, dot sizes, a step of the forces, the collision pass, cooling, writing positions back, `settle` |
| `src/lib/graph/gravity-run.ts` | runs gravity on the open graph every animation frame; `gravityOn`, `gravityMoving`, `nodeDegrees`; follows drags and changes; one history session |
| `src/lib/graph/arithmetic.ts` | arithmetic: a node's role by its name, the input order, the operators, `evaluate`, cycles |
| `src/lib/graph/arithmetic-run.ts` | `arithmeticOn`, `arithmeticResults` (worked out on every change while on), start / stop |
| `src/lib/graph/history.ts` | `beginSession` / `endSession` / `inSession`: a running augmentation as one undo step |
| `src/lib/components/AugmentMenu.svelte` | the Augment button and dropdown |
| `src/lib/components/GraphNode.svelte`, `static/styles/imge.css` (`.node.dot`, `.dot-label`) | the dot look |
| `static/data/examples/gravity-test.json`, `arithmetic-test.json` | the test graphs |
| tests | `gravity.spec.ts` (sizes, forces, collision, settling, no overlaps, checks, the test graph), `arithmetic.spec.ts` (names, input order, results, errors, checks, the test graph), `history.spec.ts` (sessions) |

## Changes

- 2026-11-26 — Gravity: names inside the dots, sized to fit, cut with … only when too long (whole on hover)

- 2026-11-26 — Arithmetic: basic nodes read by name as numbers, operators (+ − × ÷) and =; inputs left to right; results above the nodes, live; its checks; Arithmetic test example; one augmentation at a time

- 2026-11-26 — first version: the Augment control (top right) with checks before running; Gravity: round dots sized by their links, a live force layout that settles with no overlaps, drag to stir, one undo step, refuses graphs with groups; Gravity test example
