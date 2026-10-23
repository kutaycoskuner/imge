# UML class nodes

The node type **UML class** (`uml-class`): a class drawn the UML way, in three compartments (class name, attributes, methods), with every member line highlighted and checked against the UML notation.

State as of 2026-10-23 (graph format v6, node type `uml-class` version 1).

- [Using it](#using-it)
- [Notation](#notation)
- [Highlighting and format check](#highlighting-and-format-check)
- [In the file](#in-the-file)
- [Files](#files)
- [Roadmap: a functional class diagram (later)](#roadmap-a-functional-class-diagram-later)
- [Changes](#changes)

## Using it

- **Make a class:** select a node and choose **UML class** in the Properties panel's Type dropdown. The node becomes a rectangle (corners barely rounded, as UML draws classes) of three stacked compartments; its name stays, its input and output stay (relations between classes are links).
- **Class name and colour:** the Properties panel's **Content** section, or double-click / <kbd>F2</kbd> on the name as for any node. A colour tints the border, the lines between the compartments and the fill.
- **Members:** the **Attributes and methods** section has one field per compartment, one member per line.
    - The text is highlighted while you type, and lines that don't follow the notation are listed under the field ("line 3: ...").
    - Leaving the field saves it (one undo step); empty lines are dropped. Esc puts the old text back.
- **Example:** Esc menu → Examples → **Shapes (UML classes)**: an abstract Shape with four subclasses.

## Notation

One member per line, as in UML class diagrams:

| Member | Form | Examples |
|---|---|---|
| Attribute | `[visibility] [/] name [: Type] [= default]` | `- count: int = 0`, `# name: String`, `+ /area: double`, `id` |
| Method | `[visibility] name([parameters]) [: ReturnType]` | `+ area(): double`, `- resize(by: double): void`, `+ Square(side: double)` |
| Parameter | `[in \| out \| inout] name [: Type] [= default]` | `scale: double`, `unit: String = "cm"`, `in from: List<int>` |

- **Visibility:** `+` public, `-` private, `#` protected, `~` package; optional.
- **`/`** before an attribute's name: derived (computed from others).
- **Types:** a name with optional dots, generics, arrays and a trailing `?`: `int`, `java.util.Date`, `List<String>`, `Map<String, List<int>>`, `int[]`, `Date?`. Optional for attributes and parameters; a method without a return type is fine (e.g. a constructor).

## Highlighting and format check

`src/lib/graph/uml.ts` reads every line into tokens, the same way on the canvas and in the panel's fields:

| Part | Look |
|---|---|
| visibility (`+ - # ~`) | pink, bold |
| `/` derived, `in` / `out` / `inout` | violet |
| type | cerulean |
| default value | green |
| parameter name | italic |
| `:` `(` `)` `,` `=` | faint |

A line that doesn't follow the notation is **kept** (nothing typed is ever refused) and marked: underlined in red on the node, with the reason as its tooltip, and listed under the panel's field. The messages say what to write, for example:

| Line | Message |
|---|---|
| `+ owner String` | unexpected "String": write "name: Type = value" |
| `+ count:` | a type is missing after ':' (attribute) |
| `+ area(): double` in the attributes | looks like a method: methods go in the methods list |
| `+ area` in the methods | a method needs ( ) after its name |
| `+ area(scale: double` | the parameter list isn't closed: ')' is missing |
| `+ area(1scale)` | parameter "1scale" should be "name: Type" |

## In the file

A UML class is a v6 node whose `content` has the class name, its colour and the member lines as written:

```json
{
    "id": "n3",
    "type": "uml-class",
    "typeVersion": 1,
    "position": { "x": 0, "y": -260 },
    "ports": [
        { "id": "i1", "kind": "in", "type": "basic", "label": "Input" },
        { "id": "o1", "kind": "out", "type": "basic", "label": "Output" }
    ],
    "content": {
        "name": "Rectangle",
        "color": null,
        "attributes": ["- width: double", "- height: double"],
        "methods": ["+ area(): double", "+ perimeter(): double"]
    }
}
```

The lines are stored as text, not split into parts: what you typed is what is saved, also when it has an error, and the parser can grow (new notation) without changing files. Sample node: `static/data/node-types/uml-class/uml-class-v1.json`.

## Files

| File | Role |
|---|---|
| `src/lib/graph/uml.ts` | `parseAttribute`, `parseMethod`: tokens for highlighting and the format check's message; `isTypeName`, `VISIBILITY`. Tests in `uml.spec.ts`. |
| `src/lib/graph/node-types.ts` | The `uml-class` type: template (ports, content), label; `umlMembers(node, key)`. |
| `src/lib/graph/store.ts` | `setNodeContent(g, nodeId, patch)`: sets content keys (here `attributes` / `methods`). |
| `src/lib/components/GraphNode.svelte` | Draws the three compartments with highlighted lines (styles `.node.uml`, `.uml-*` in `static/styles/imge.css`). |
| `src/lib/components/properties/PropsUmlMembers.svelte` | The panel's Attributes and methods section. |
| `src/lib/components/properties/PropUmlLines.svelte` | One member field: textarea over a highlighted copy, format check under it. |

## Roadmap: a functional class diagram (later)

What exists is the **class box**: name, attributes and methods in compartments, with the notation checked. A class diagram is classes *and the relations between them*; most of what is missing is about relations. This is planned for later, in this order.

| Part | State today |
|---|---|
| Class box with compartments, member notation, visibility | done |
| Relation kinds with their UML look | missing: links can only be named (e.g. "extends") and carry the normal arrowhead; no dashed lines, no triangles or diamonds |
| Multiplicities and roles at the link ends (`1`, `0..*`, `owner`) | missing: a link has one name, in its middle |
| Relations attaching anywhere on a class box | missing: a class has one input and one output in fixed places, so relations always leave one side and enter the other |
| Interfaces, abstract classes, enums (`«interface»`, italic name, enum values) | missing |
| Static (underlined) and abstract (italic) members | missing |
| Packages around classes | partly: groups hold classes, wrap and carry them and can be resized; no package look (tab) yet |
| Notes attached to classes | missing (the Note node type is planned) |
| Checks beyond the notation (duplicate member names, unknown types) | missing |

**Order of work**

1. **Relation kinds:** a link `type` that sets the line and its end marks, chosen in the link's Properties section. No file format change: links already have `type` (always `"basic"` so far).

    | Relation | Line | End mark (at the target) |
    |---|---|---|
    | inheritance (generalization) | solid | hollow triangle |
    | realization (implements) | dashed | hollow triangle |
    | association | solid | none, or an open arrow when navigable |
    | aggregation | solid | hollow diamond (at the whole) |
    | composition | solid | filled diamond (at the whole) |
    | dependency | dashed | open arrow |

2. **End labels:** multiplicity and role at each end of an association.
3. **Attach anywhere:** relations connect to the nearest side of a class box instead of fixed input / output ports. To decide then: ports on all four sides (the v6 port `side` exists for this), or borderless anchors just for UML.
4. **Stereotypes and member markers:** `«interface»` / `«abstract»` / `«enum»` above the name (in `content`), static and abstract members marked in the notation (e.g. `{static}`, `{abstract}`) and drawn underlined / italic.
5. **Packages:** the UML package look (a tab with the name) for groups that hold classes; holding, wrapping, moving and resizing already work.
6. Notes (the Note node type) and the further checks.

With 1–3 done, class diagrams can be called functional. Other UML diagrams (sequence, use case, state, activity, component) come after that; see [graph-types.md](graph-types.md).

## Changes

- 2026-10-21 — roadmap to a functional class diagram (relation kinds, end labels, attach anywhere, stereotypes, packages), planned for later
- 2026-10-21 — first version: node type UML class with three compartments, member notation, highlighting, format check, the Attributes and methods section; the UML example uses it
