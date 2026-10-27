# Text view (experimental)

The graph drawn with box-drawing characters instead of on the canvas: nodes as boxes, links as lines with their end marks, UML classes with their compartments. It can be copied or downloaded as plain text, e.g. for a README, a code comment or a terminal.

State as of 2026-10-27 (graph format v7). Experimental: the layout is simple and large graphs can get crowded.

```text
┌────────────────────────────────┐                ┌──────────────────────────────┐
│            Drawing             │                │     «interface» Drawable     │
├────────────────────────────────┤                ├──────────────────────────────┤
│ - title: String                │                │                              │
├────────────────────────────────┤                ├──────────────────────────────┤
│ + add(shape: Shape): void      │                │ + draw(canvas: Canvas): void │
└────────────────────────────────┘                └──────────────────────────────┘
                 ◇                                                △
                 └──────────────────────┬┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┘
                                        ┆
                         ┌──────────────┴───────────────┐
                         │            Shape             │
                         ├──────────────────────────────┤
                         │ - count: int = 0             │   (underlined in the view: {static})
                         ├──────────────────────────────┤
                         │ + area(): double             │   (italic in the view: {abstract})
                         └──────────────────────────────┘
```

## Using it

- **Switch:** the toolbar's view button (a window with a `>_` prompt) toggles canvas / text; **Back to canvas** in the text view's bar does the same. Every visit starts on the canvas.
- **It follows the graph:** edits in the Properties panel, undo / redo (<kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd>), Delete, <kbd>D</kbd> / <kbd>L</kbd> / <kbd>R</kbd> on the selected link and the menus show at once.
- **Select:** click a box or a line to select that node or link (<kbd>Shift</kbd>+click adds nodes); the Properties panel shows it, and the selection is drawn in the selection colour.
- **Keys that act on the canvas itself** do nothing in the text view: zoom (<kbd>+</kbd> / <kbd>-</kbd>), fit (<kbd>Home</kbd>), add at the mouse (<kbd>Shift+A</kbd>), rename on the canvas (<kbd>F2</kbd>).
- **Copy text** puts the plain characters on the clipboard; **Download .txt** saves them, named after the graph's file. The bar shows the size in characters.

## What it draws

| Graph | Text |
|---|---|
| basic node | a box with its name (wrapped at 22 characters); circle shapes get rounded corners `╭ ╮ ╰ ╯` |
| UML class | name, attributes and methods in compartments separated by `├───┤`; highlighted like on the canvas; `{static}` members underlined and abstract classes / `{abstract}` methods in italics in the view, without the marker text |
| group | a frame around its children's boxes with its name in the top edge |
| link | right-angled lines from the source's side to the target's side; a link that can't go forward (cycle, self-loop) takes a lane between or around the boxes, on its `route` side |
| link `line` | solid `─ │`, dashed `╌ ╎`, dotted `┄ ┆` |
| link `mark` (at the end(s) `arrow` names) | arrow `▶`, open arrow `>`, hollow triangle `▷`, hollow diamond `◇`, filled diamond `◆`, turned to the box (`▼ v ▽` downwards ...) |
| where a line meets a box edge without a mark | a junction `├ ┤ ┬ ┴` |
| link name | above (else below) its longest horizontal piece, where no box is |
| node colour | the box and the name in that colour (view only) |

Plain text keeps only the characters: underline, italics and colours exist in the view, not in the copied text.

Not drawn: links that start or end at a group (groups have no ports; the bar counts them).

## How the layout works

`src/lib/graph/ascii.ts`, `graphToAscii(graph)`: pure, graph in, a grid of cells out (each cell a character with optional CSS classes, an owner `node:<id>` / `link:<id>` and a colour).

1. **Boxes:** each node's position is scaled to character cells (8 world units per column, 20 per row) and its box sized by its text. A box that would overlap one placed before it moves down until it is free (gaps: 4 columns / 1 row left-to-right, 2 columns / 3 rows top-to-bottom, more along the reading direction where lines run).
2. **Room for links:** a link that reads forward (target further along the reading direction) gets at least 3 free cells between its boxes; the target box moves along until it has them.
3. **Groups:** frames around their children's boxes, deepest first.
4. **Links:** routed in a "flow space" (columns and rows swapped for top-to-bottom, as on the canvas). The vertical piece of a forward link goes to the column that crosses no box, then shares no other link's vertical line (links from the same port may share), then lies closest to the link's `bend`. Lanes move out past boxes in their way.
5. **Characters:** lines are kept as connection bits per cell (north, east, south, west), so corners, junctions and crossings become the right character; boxes are drawn over lines (a line passing behind a box disappears there), then marks and names.

The view (`src/lib/components/GraphTextView.svelte`) draws the grid in a `<pre>` as runs of the same look; characters a font may draw wider than a cell (`▶ ◇ «` ...) get exactly one cell (`1ch`) so columns stay aligned.

## Files

| File | Role |
|---|---|
| `src/lib/graph/ascii.ts` | `graphToAscii`, `asciiText` (plain text), `wrap`, `undrawnLinks`. Tests in `ascii.spec.ts`. |
| `src/lib/components/GraphTextView.svelte` | The view: bar (size, Copy text, Download .txt, Back to canvas), the grid, click to select. |
| `src/lib/graph/store.ts` | `viewMode` (`canvas` / `text`). |
| `src/lib/components/UI_GraphEditor.svelte`, `src/lib/icons/icon-terminal.svelte` | The toolbar's view button. |

## Ideas for later

- A smarter layout (layers by link direction, fewer crossings) instead of scaled positions.
- Links attached to groups; ports drawn as marks on the box edges.
- A command-line entry point that prints a graph file as text.
- Reading text back into a graph (the other direction).

## Changes

- 2026-10-27 — first version: text view with boxes, UML compartments and styles, groups, routed links with line styles and marks, names; click to select; Copy text, Download .txt; toolbar view button
