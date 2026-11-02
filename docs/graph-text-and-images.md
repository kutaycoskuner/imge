# Text and image nodes

Two node types without a box: **Text** (`text`) is only its text, for titles, captions, section headings and notes on the canvas; **Image** (`image`) is only a picture, a part from the library or an uploaded file, with an input and an output so it can be linked, the start of circuits drawn with their symbols. Both can be **scaled**.

State as of 2026-11-02 (graph format v7, node types `text` version 1 and `image` version 2).

- [Using them](#using-them)
- [Text nodes](#text-nodes)
- [Image nodes](#image-nodes)
- [Scale](#scale)
- [In the file](#in-the-file)
- [Where they show](#where-they-show)
- [Files](#files)
- [Next: circuit parts](#next-circuit-parts)
- [Changes](#changes)

## Using them

- **Make one:** select a node and choose **Text** or **Image** in the Properties panel's Type dropdown. A basic node's name becomes the text of a text node; an image node starts as a resistor symbol.
- **See its extent:** neither has a box; a dashed outline shows where the node is while the mouse is over it and while it is selected. Drag it like any node; it snaps, joins groups, copies and pastes as usual.
- **In the start graph:** the feature map's title and subtitle are text nodes, and its "Types v1" group holds a text node and an image node.
- **Example graphs:** Esc menu → Examples → **Weather station** (Software architecture: an overview laid out like a poster, with a title, a subtitle, headings and notes as text nodes, and tiers as coloured boxes in groups) and **LED circuit (symbols)** (Circuits: image nodes wired together, named by their captions, and the placeholder parts with theirs).

## Text nodes

| Setting | Where | Notes |
|---|---|---|
| Text | Properties → Text, or double-click / <kbd>F2</kbd> on the canvas | Several lines, kept as typed (the node is as wide as its longest line). In the canvas field Enter makes a new line, <kbd>Ctrl+Enter</kbd> or clicking away saves, Esc cancels; the panel's field saves when you leave it, Esc puts it back. |
| Color | Properties → Text | The text's colour (hex, picker); default = the theme's text colour. Also with several nodes selected (Selection section). |
| Scale | Properties → Text, or the corner handle | 1 = the normal text size; e.g. 2.2 for a title. |
| Align | Properties → Text | Left, centre or right, for text over several lines. |
| Bold | Properties → Text | |

A text node has **no ports**: it is a label on the canvas, not a step in the graph. Link names are drawn by the links themselves; a text node is for everything else (titles, headings, legends, notes).

## Image nodes

| Setting | Where | Notes |
|---|---|---|
| Caption | Properties → Image | Text under the picture (beside it in top-to-bottom graphs), e.g. "R1 = 390 Ω"; **Show caption** switches it on / off for this image. Esc menu → Config → Links → **Image captions** shows or hides every caption at once (display only, not saved), like the link shape override. The caption sits outside the node's box, so the ports stay at the picture's middle. |
| Name | Properties → Image | Used in lists and link ends ("Resistor · Input"), not drawn. It follows the picture (a part's name, an uploaded file's name) until you give it one of your own. |
| Picture | Properties → Image → Picture | A part from the library (`static/images/parts/index.json`), or **Upload image…** for any image file the browser can show (PNG, JPG, SVG, GIF, WebP ...). |
| Scale | Properties → Image, or the corner handle | Times the picture's size at scale 1 (shown under the field). |

- **Library parts** are referenced by their path (`images/parts/resistor.svg`): the file stays small and the parts can be improved later for every graph that uses them.
- **Uploaded pictures are stored in the graph file** as a `data:` URL, so a graph with them is complete wherever it is copied or opened; the panel shows how much they add. Pictures over 1 MB ask first. The size at scale 1 is the picture's own, at most 320 units on its longer side (a larger picture is scaled down to that; scale it up again as needed); an SVG without a size of its own starts as 96 × 96.
- **Ports:** an input on the left edge and an output on the right (top / bottom in top-to-bottom graphs), at mid height. The placeholder parts have their leads exactly there, so wires meet them.
- **Placeholder parts** (grey line drawings, readable on light and dark backgrounds): resistor, capacitor, battery, lamp, switch, diode, LED, ground, AND, OR and NOT gate. They are pictures only; they don't simulate.

## Scale

- **Corner handle:** a small mark at the bottom-right corner of a text or image node (shown on hover and when selected); drag it right or left to make the node bigger or smaller. It snaps to steps of 0.25 unless **Alt** is held or snapping is off; one drag is one undo step.
- **Field:** Scale in the node's Properties section, in steps of 0.25 with the arrows, any value typed.
- **Range:** 0.25 to 8, stored rounded to 0.01 (`setNodeScale`).

## In the file

```json
{ "id": "n1", "type": "text", "typeVersion": 1, "position": { "x": 0, "y": 0 }, "ports": [],
  "content": { "text": "Weather station", "color": null, "scale": 2.2, "bold": true, "align": "left" } }

{ "id": "n5", "type": "image", "typeVersion": 1, "position": { "x": 360, "y": -148 },
  "ports": [ { "id": "i1", "kind": "in", ... }, { "id": "o1", "kind": "out", ... } ],
  "content": { "name": "Resistor", "src": "images/parts/resistor.svg", "width": 96, "height": 32, "scale": 1,
               "caption": "R 390 Ω", "showCaption": true } }
```

- `text`: the lines, `\n` between them; `color`: `"#rrggbb"` or `null`; `scale`; `bold`; `align`: `left` / `center` / `right`.
- `caption`: text under the picture (`""` = none); `showCaption`: whether it is drawn (type version 2; a version 1 image has neither and shows no caption).
- `src`: a path below `static/` (library) or a `data:` URL (uploaded); `width` / `height`: the picture's size at scale 1, in world units, stored so links, the text view and exports know the node's size before the picture has loaded.
- No graph format change: node `type` and `content` were made for new types (format v6). Samples: `static/data/node-types/text/text-v1.json`, `static/data/node-types/image/image-v1.json`, `image-v2.json`.

## Where they show

| Place | Text node | Image node |
|---|---|---|
| Canvas | its text | its picture, ports on the edges |
| Image export (PNG / JPG / SVG) | as drawn | the picture, carried inside the SVG (library parts are read and inlined), so the file is complete |
| Text view | its lines without a border, aligned and bold as set (scale doesn't apply to characters) | a rounded box with its name in brackets and its caption under it when shown: `│ [Resistor] │ │ R 390 Ω │` |
| Port look (Esc menu) | – | the ports follow it; **hidden** gives clean circuit drawings |

## Files

| File | Role |
|---|---|
| `src/lib/graph/node-types.ts` | The `text` and `image` types (templates, labels; `adopt` turns a basic node's name into text); `nodeScale`, `nodeText`, `imageOf`, `imageCaption`, `hasColor`, `SCALE_MIN` / `SCALE_MAX`. |
| `src/lib/graph/store.ts` (`captionOverride`), `GraphEditorMenu.svelte` | Image captions: show all / hide all / each image's own (display only). |
| `src/lib/graph/store.ts` | `setNodeScale`; `setNodeType` uses the type's `adopt`. |
| `src/lib/components/GraphNode.svelte` | Draws them (styles `.node.text-node`, `.node.image-node`, `.text-body`, `.image-body`, `.node-scale` in `static/styles/imge.css`), the canvas text field. |
| `src/routes/+page.svelte` | The scale handle drag (`scaleByHandle`). |
| `src/lib/components/properties/PropsText.svelte`, `PropsImage.svelte` | Their Properties sections (`sections.ts`). |
| `static/images/parts/*.svg`, `index.json` | The placeholder parts and their list (file, name, size). |
| `src/lib/graph/export-image.ts`, `export-svg.ts` | Pictures inlined into exported images. |
| `src/lib/graph/ascii.ts` | Both in the text view. |

## Next: circuit parts

The image node is the first step towards circuits drawn with their symbols. Planned:

- **Circuit part types** built on it: a symbol per part with its own ports where its leads are (a gate with two inputs at their real positions, a transistor with three terminals, two-way ports of kind `any` for passive parts), parameters in `content` (resistance, voltage), see [graph-types.md](graph-types.md#circuit) and [graph-simulation.md](graph-simulation.md).
- Final symbols replacing the placeholders, drawn on a common grid so wires line up.
- Picking parts from a palette instead of the Type dropdown.

## Changes

- 2026-11-02 — image captions (image type version 2: `caption`, `showCaption`), Image captions override in the Esc menu; the LED example names its parts by captions instead of text nodes
- 2026-11-02 — first version: node types Text and Image (version 1), scale (corner handle, Properties field), library of placeholder circuit parts, image upload stored in the graph file, Properties sections Text and Image; examples Weather station and LED circuit (symbols)
