# Matrix calculator

The matrix calculator page (`/matrix_addition`): a calculator and a lesson at the same time. Pick an operation, type the sizes and values, and see how each entry of the result is computed.

## Layout

```text
     ┌ i. notation ────────────────┐  ┌ ii. description ───────────────────────────┐
     │ A(i×j) + B(m×n) = C         │  │ what the operation does                    │
     │ A(2×3) + B(2×3) = C         │  │ ─ ─ size rule, checked live ─ ─ ─ ─ ─ ─ ─  │
     │  i   j   m   n              │  │ ─ ─ selected entry, term by term ─ ─ ─ ─ ─ │
     └─────────────────────────────┘  └────────────────────────────────────────────┘
 [+] ┌ iii. calculator ─────────────────────────────────────────────────────────────┐
 [×] │        A   +   B   =   written out   =   C        (one line)                  │
 [d] │                                                                               │
 [>_]└───────────────────────────────────────────────────────────────────────────────┘
```

- **three panels** filling the screen, each a faint 1 px frame (the text colour at 22 %) with pixelated corners (the corner pixel left empty), no shadow, and its title, small and lower case, in a gap of the top line at the left, as the graph editor shows group names; top row: notation and description (the description about 1.6 times as wide, room for later operations); bottom row: the calculator over the whole width; on screens narrower than 1100 px the panels go one below the other
- **scrollbars** inside the panels are thin (6 px) and faint, in the frame colour, without a track
- **toolbar** at the bottom left, exactly where and how the graph editor has its toolbar (the same `.access-wrapper` / `.access-function` styles in `static/styles/imge.css`): + addition, × multiplication, d determinant (shown faded, can't be chosen yet), then >_ for the text view (the graph editor's text view icon); the chosen operation is highlighted; hovering a button shows its full name in the hint line at the bottom of the screen, as in the graph editor
- **i. notation** (top, left): the general formula, the formula with the sizes typed in, the size boxes (1 to 6 each); when A and B can't be combined, a warning and a button that fixes the sizes (addition: B gets A's size; multiplication: B gets as many rows as A has columns)
- **iii. calculator** (bottom, whole width): A, B, C written out entry by entry, and the result C, each in its colour (A blue, B purple, written out amber, C green), always on one line: the matrices keep their natural width and never wrap or squeeze (the panel scrolls sideways only if the screen is really too narrow); click a number of A or B to change it (Enter or click elsewhere to finish)
    - the toolbar's **>_** button switches to the text view, see below
- **ii. description** (top, right, one block): sections separated by dashed lines
    - the operation in words, with its formula
    - **size rule**: the rule, checked with the sizes typed in (green ✓ or red ✗), and the size of C
    - **selected entry**: point at or click a cell of C (in the written-out or the result matrix); its terms light up in A and B, and the section writes it out in three lines: symbols ($c_{12} = a_{11}b_{12} + \dots$), numbers, value, each part in its matrix's colour
    - properties (commutative, associative, neutral element)
- a panel whose content doesn't fit scrolls inside itself

## Text view

The calculator panel as text, like the graph editor's text view, but A and B can be typed in.

- **left: A and B to edit**, side by side, each named on its left, in box-drawing brackets, columns right-aligned:
    ```text
        ┌         ┐        ┌            ┐
    A = │ 1  2  3 │    B = │  7   8   9 │
        │ 4  5  6 │        │ 10  11  12 │
        └         ┘        └            ┘
    ```
    - every line with numbers is a row: what stands left of the column where `B =` starts belongs to A, the rest to B; brackets, bars and spaces don't matter, so `1 2 3` works too; decimals with `.` or `,`, minus as `-` or `−`
    - A and B stacked (a line `A =`, its rows, a line `B =`, its rows) is read too, e.g. when pasted from elsewhere; leaving the text redraws it side by side
    - the sizes follow the text: add a number to every row and A gets a column; the size boxes in notation change with it
    - as soon as the text reads as two whole matrices the page takes it; until then a line under it says what's wrong (e.g. `A: row 2 has 1 values, row 1 has 2`, or larger than 6×6)
    - leaving the text redraws it aligned; with an error it stays as typed
- **right: the equation** A op B = C side by side, each matrix centred, the signs on the middle line, e.g.
    ```text
    ┌         ┐   ┌            ┐   ┌            ┐
    │ 1  2  3 │ + │  7   8   9 │ = │  8  10  12 │
    │ 4  5  6 │   │ 10  11  12 │   │ 14  16  18 │
    └         ┘   └            ┘   └            ┘
    ```
    **copy** puts it on the clipboard as plain text (for notes, chat, code comments)
- terminal look, the same type as the graph editor's text view (`.ascii-type` in `static/styles/imge.css`): Cascadia Mono / Consolas, a line height the box-drawing glyphs fill so the brackets join into whole lines, no letter spacing, no ligatures; the page's text colour, no frame, no background, no wrapping, no resize handle

## Files

| File | What it does |
|---|---|
| [src/routes/matrix_addition/+page.svelte](../src/routes/matrix_addition/+page.svelte) | the page: the three panels, the toolbar (data list `tools`) and its hints, selection of an entry, the text view |
| [src/lib/matrix/matrix.ts](../src/lib/matrix/matrix.ts) | the math: size rules, result size, result, the terms of one entry, cleaning typed values |
| [src/lib/matrix/operations.ts](../src/lib/matrix/operations.ts) | each operation as data: label, formula, size rule texts and fix, description boxes |
| [src/lib/matrix/tones.ts](../src/lib/matrix/tones.ts) | the four colours, for the matrices and the KaTeX formulas |
| [src/lib/matrix/MatrixGrid.svelte](../src/lib/matrix/MatrixGrid.svelte) | one matrix in brackets: editable cells, highlighted cells, pointing and clicking |
| [src/lib/matrix/ascii.ts](../src/lib/matrix/ascii.ts) | the text view: aligned drawing, the editable text of A and B and reading it back, the equation side by side |
| [src/lib/matrix/matrix.spec.ts](../src/lib/matrix/matrix.spec.ts), [ascii.spec.ts](../src/lib/matrix/ascii.spec.ts) | tests for matrix.ts (and that every operation has its texts) and ascii.ts |
| [src/lib/icons/icon-times.svelte](../src/lib/icons/icon-times.svelte), [icon-letter-d.svelte](../src/lib/icons/icon-letter-d.svelte) | the × and d buttons (+ is the graph editor's icon-plus) |

## Adding an operation (e.g. the determinant)

1. `matrix.ts`: its size rule in `canCombine` / `resultDims` and its result in `combine` (for the determinant: a single number from one square matrix, so the page needs a variant without B)
2. `operations.ts`: its entry, `enabled: true`, its formula, rule texts and description boxes; a new kind of live box goes into the `DescriptionBox` type and the page's box loop
3. a test in `matrix.spec.ts`

Description texts are plain text with `$...$` for KaTeX math.

## Changes

- 2026-11-13 — text view: box-drawing brackets back, in the graph text view's type (shared `.ascii-type`), A = and B = on the left of their matrices
- 2026-11-13 — no wrapping: A and B side by side in the text view, matrices and text blocks keep their natural width, inner margins trimmed
- 2026-11-13 — text view as plain text: ASCII brackets per row, the page's font and colour, no frame, background, wrapping or resize handle
- 2026-11-13 — panels renamed i. notation, ii. description, iii. calculator; faint frames, smaller lower-case titles; thin, faint scrollbars
- 2026-11-13 — the small buttons moved into a toolbar at the bottom left, placed and styled exactly as the graph editor's (its styles moved to imge.css and shared)
- 2026-11-13 — two rows: notation | explanation on top, the matrices alone below on one line; operation switch as small icon buttons (+ × d) in panel I's top line with hover hints; text view of panel II: A and B as aligned text to type in, the equation as text to copy
- 2026-11-13 — frames: 1 px with pixelated corners, no shadow; titles in a gap of the top line (as graph editor groups)
- 2026-11-13 — layout as three full-height panels (I notation, II matrices on the left; III explanation with the switch on the right, one block), solid pixel borders, titles on the top-left corner; matrices wrap instead of scrolling
- 2026-11-13 — multiplication; operation switch (determinant shown, not yet available); two columns: calculation (notation, expanded view) and description boxes (operation, live size rule, selected entry written out, properties); hover or click an entry of C to see its terms in A and B; button that fixes the sizes; math and texts split out of the page into `src/lib/matrix/`
