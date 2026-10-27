# UML class nodes

The node type **UML class** (`uml-class`): a class drawn the UML way, in three compartments (class name, attributes, methods), with every member line highlighted and checked against the UML notation; static members underlined, abstract classes and methods in italics. Links between classes can take the look of the UML relations (inheritance, realization, association, dependency, aggregation, composition).

State as of 2026-10-27 (graph format v7, node type `uml-class` version 2).

- [Is it full UML?](#is-it-full-uml)
- [Using it](#using-it)
- [Notation](#notation)
- [Member markers](#member-markers)
- [Property strings](#property-strings)
- [Relations](#relations)
- [Highlighting and format check](#highlighting-and-format-check)
- [In the file](#in-the-file)
- [Files](#files)
- [Roadmap: a functional class diagram (later)](#roadmap-a-functional-class-diagram-later)
- [Changes](#changes)

## Is it full UML?

**No: class diagrams are partly supported.** Most everyday class diagrams can be drawn; some UML notation can't be written yet. Other UML diagrams (sequence, use case, state, activity, component) aren't supported; see [graph-types.md](graph-types.md).

| UML class diagram part | State |
|---|---|
| Class box: name, attributes, methods in three compartments | yes |
| Member notation: visibility `+ - # ~`, types, defaults, parameters, derived `/` | yes, checked while typing |
| Static members (underlined), abstract methods and classes (italics) | yes |
| Property strings: `{readOnly}` (Java `final`), `{ordered}`, `{unique}`, `{id}`, `{redefines …}`; methods `{query}` | yes, checked, drawn as text |
| Relations: association, inheritance, realization, dependency, aggregation, composition | yes, with their line and mark |
| Different marks at the two ends of one link (diamond at the whole and arrow at the part) | no: one mark shape per link |
| Multiplicities and roles at the link ends (`1`, `0..*`, `owner`) | no: a link has one name, in its middle |
| Relations attaching anywhere on a class box | no: one input and one output in fixed places |
| Stereotypes (`«interface»`, `«enum»`) | partly: written into the name; no own field, no enum compartment |
| Packages | partly: groups hold and wrap classes; no package tab |
| Notes attached to classes | no |

What is planned for the missing parts, in order: [Roadmap](#roadmap-a-functional-class-diagram-later). The editor's feature map (the graph it opens on) shows this state as the node **UML class diagram (partly)**.

## Using it

- **Make a class:** select a node and choose **UML class** in the Properties panel's Type dropdown. The node becomes a rectangle (corners rounded by only 2 px, as UML draws classes) of three stacked compartments; its name stays, its input and output stay (relations between classes are links).
- **Class name and colour:** the Properties panel's **Content** section, or double-click / <kbd>F2</kbd> on the name as for any node. A colour tints the border, the lines between the compartments and the fill.
- **Abstract class:** the **Abstract class** checkbox at the top of the Attributes and methods section draws the class name in italics. When the class has `{abstract}` methods but isn't marked abstract, the section says so (UML makes such a class abstract).
- **Relations:** link two classes, select the link and pick a **Relation** in the Properties panel's Look section; see [Relations](#relations).
- **Members:** the **Attributes and methods** section has one field per compartment, one member per line.
    - The text is highlighted while you type, and lines that don't follow the notation are listed under the field ("line 3: ...").
    - Leaving the field saves it (one undo step); empty lines are dropped. Esc puts the old text back.
- **Example:** Esc menu → Examples → **Shapes (UML classes)**: an abstract Shape (italic name, abstract methods, a static counter) with four subclasses (inheritance), realizing the interface Drawable, held by a Drawing (aggregation), and using a Canvas (dependency).

## Notation

One member per line, as in UML class diagrams:

| Member | Form | Examples |
|---|---|---|
| Attribute | `[markers] [visibility] [/] name [: Type] [= default] [{properties}]` | `- count: int = 0`, `# name: String`, `+ /area: double`, `id`, `{static} - count: int = 0`, `- radius: double {readOnly}` |
| Method | `[markers] [visibility] name([parameters]) [: ReturnType] [{properties}]` | `+ area(): double`, `- resize(by: double): void`, `+ Square(side: double)`, `+ {abstract} area(): double`, `+ size(): int {query}` |
| Parameter | `[in \| out \| inout] name [: Type] [= default]` | `scale: double`, `unit: String = "cm"`, `in from: List<int>` |

- **Visibility:** `+` public, `-` private, `#` protected, `~` package; optional.
- **`/`** before an attribute's name: derived (computed from others).
- **Types:** a name with optional dots, generics, arrays and a trailing `?`: `int`, `java.util.Date`, `List<String>`, `Map<String, List<int>>`, `int[]`, `Date?`. Optional for attributes and parameters; a method without a return type is fine (e.g. a constructor).
- **Markers:** `{static}` and `{abstract}`, see below.
- **Property strings:** `{readOnly}` and others at the end of a line, see [Property strings](#property-strings).

## Member markers

UML tells static and abstract members apart by how they are drawn, not by a word: a **static** member (one per class, not per object) is **underlined**, an **abstract** method (declared here, written in subclasses) is in *italics*. Text can't be underlined while typing, so the notation has a marker for each, as PlantUML writes it:

| Marker | Allowed on | Drawn on the node | Example line → drawn |
|---|---|---|---|
| `{static}` | attributes and methods | the line underlined | `{static} - count: int = 0` → <u>- count: int = 0</u> |
| `{abstract}` | methods | the line in italics | `+ {abstract} area(): double` → *+ area(): double* |

- A marker goes before or after the visibility: `{static} + create(): Shape` and `+ {static} create(): Shape` are the same.
- The node draws the style **instead of** the marker text; the Properties field shows the marker (highlighted violet), since a text field can't show underlines while you type.
- Checked: `{abstract}` on an attribute ("only methods (and classes) can be {abstract}"), a method both `{static}` and `{abstract}`, and unknown markers such as `{final}` (they are stored, drawn as typed and underlined in red).
- An abstract **class** isn't a member: it is the **Abstract class** checkbox (content `abstract`), drawn as the class name in italics.
- Visibility already has its own marks: `+` public, `-` private, `#` protected, `~` package.

## Property strings

UML writes some facts about a member as a **property string** in braces at the **end** of its line. Unlike the markers, it is **drawn as text** on the node:

| Property | On | Means | Example |
|---|---|---|---|
| `{readOnly}` | attributes | can't change after it is set (Java `final`) | `- radius: double {readOnly}` |
| `{ordered}` / `{unordered}` | attributes, methods | a many-valued member keeps an order / doesn't | `+ items: Item[] {ordered}` |
| `{unique}` / `{nonunique}` | attributes, methods | no value twice / values may repeat | `- tags: String[] {unique}` |
| `{seq}` / `{sequence}` | attributes | ordered and may repeat | `- path: Point[] {seq}` |
| `{id}` | attributes | part of what identifies the object | `- isbn: String {id}` |
| `{union}`, `{composite}` | attributes | derived union; owned by composition | |
| `{redefines x}`, `{subsets x}` | attributes (`redefines` also methods) | redefines / is a subset of the member `x` of a parent class | `- wheels: Wheel[] {redefines parts}` |
| `{query}` | methods | doesn't change the object (Java: a getter) | `+ getRadius(): double {query}` |

- **A list** is comma-separated: `+ ids: int[] {readOnly, ordered}`.
- **With markers:** `{static} - PI: double = 3.14 {readOnly}` is a `static final` constant: drawn underlined *and* with `{readOnly}` at the end.
- **At the start** like a marker (`{readOnly} - x: int`) is accepted too; the node draws it at the end, where UML puts it.
- **Checked:** `{readOnly}` on a method ("only attributes can be {readOnly}"), a property string that isn't closed (`- x: int {readOnly`), unknown words (`{final}`), and `{static}` / `{abstract}` at the end (they go at the start). The line is kept and drawn as typed, underlined in red.
- **A default value in braces** (`- v: int[] = {1, 2}`) stays a default: a property string holds only words.
- Lists of allowed words: `ATTRIBUTE_PROPERTIES` and `METHOD_PROPERTIES` in `src/lib/graph/uml.ts`.

**Java to UML, for class diagrams of Java code:** `static` → `{static}` (underlined), `final` field → `{readOnly}`, `static final` → both, `abstract` → `{abstract}` (italics) / Abstract class, constructor → a method without return type (`+ Kugel(radius: double)`), `String[] args` → `args: String[]`.

## Relations

A relation between classes is a link with a UML look. Links have a **line** style and an end **mark** (graph format v7, see [graph-format.md](graph-format.md#why-links-have-line-and-mark-v7)); the **Relation** dropdown in the link's Look section sets both in one step:

| Relation | Means | Line | Mark | At the end of |
|---|---|---|---|---|
| Association | uses / knows | solid | open arrow | the class that is known |
| Inheritance | is a kind of (extends) | solid | hollow triangle | the parent |
| Realization | implements an interface | dashed | hollow triangle | the interface |
| Dependency | depends on, uses for a while | dashed | open arrow | the used class |
| Aggregation | has parts that can exist on their own | solid | hollow diamond | the whole |
| Composition | owns parts that live and die with it | solid | filled diamond | the whole |

- **Which end:** a link always runs from an output to an input, so which class is the source depends on how it was drawn (in a top-to-bottom diagram the parent above its children is the source of the inheritance links). Choosing a relation keeps the link's own end when the mark is at one end already (Arrow forward or backward); a link with Arrow none or both gets the relation's usual end for a link read "source *relation* target" (Dog → Animal: inheritance at Animal; Car → Wheel: composition at Car). **Arrow** (or <kbd>D</kbd>) moves the mark to the other end.
- **Read back:** the dropdown shows the relation whose line and mark the link has (the mark at either single end), or *custom*. Nothing else is stored: a link styled by hand with a dashed line and a hollow triangle *is* a realization.
- **Line** and **Mark** can also be set on their own, for any graph: a dotted line in a mind map, a diamond in a data-flow sketch.
- Relations are a data list in `src/lib/graph/link-relations.ts` (`UML_RELATIONS`); a new one is a new entry.

## Highlighting and format check

`src/lib/graph/uml.ts` reads every line into tokens, the same way on the canvas and in the panel's fields:

| Part | Look |
|---|---|
| visibility (`+ - # ~`) | pink, bold |
| `/` derived, `in` / `out` / `inout` | violet |
| `{static}`, `{abstract}` (Properties field; the node draws the style) | violet, italic |
| property string words (`readOnly`, `query` ...) | violet |
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
| `{abstract} - count: int` | only methods (and classes) can be {abstract} |
| `{static} {abstract} f(): void` | a method can't be both {static} and {abstract} |
| `{final} + f(): void` | unknown marker "{final}": write {static} or {abstract} (a property string such as {readOnly} goes at the end) |
| `+ area(): double {readOnly}` | only attributes can be {readOnly} |
| `- x: int {readOnly` | the property string isn't closed: '}' is missing |
| `- x: int {final}` | unknown property "{final}": e.g. {readOnly}, {ordered}, {unique} |

## In the file

A UML class is a node whose `content` has the class name, its colour, whether it is abstract and the member lines as written (markers included):

```json
{
    "id": "n3",
    "type": "uml-class",
    "typeVersion": 2,
    "position": { "x": 0, "y": -260 },
    "ports": [
        { "id": "i1", "kind": "in", "type": "basic", "label": "Input" },
        { "id": "o1", "kind": "out", "type": "basic", "label": "Output" }
    ],
    "content": {
        "name": "Rectangle",
        "color": null,
        "abstract": false,
        "attributes": ["- width: double", "- height: double", "{static} - count: int = 0"],
        "methods": ["+ area(): double", "+ perimeter(): double"]
    }
}
```

The lines are stored as text, not split into parts: what you typed is what is saved, also when it has an error, and the parser can grow (new notation, like the markers) without changing files. Type version 2 added `abstract`; a version 1 class without it isn't abstract. Sample nodes: `static/data/node-types/uml-class/uml-class-v1.json`, `uml-class-v2.json`.

A relation is a link with its look (graph format v7):

```json
{ "id": "l5", "type": "basic", "shape": "line", "arrow": "backward", "line": "dashed", "mark": "triangle",
  "route": "above", "source": { "node": "n6", "port": "o1" }, "target": { "node": "n1", "port": "i1" } }
```

## Files

| File | Role |
|---|---|
| `src/lib/graph/uml.ts` | `parseAttribute`, `parseMethod`: tokens for highlighting, the format check's message, the `static` / `abstract` markers and the `properties`; `drawnTokens` (a line as the node draws it: without its markers, property strings at the end); `isTypeName`, `VISIBILITY`, `UML_MARKERS`, `ATTRIBUTE_PROPERTIES`, `METHOD_PROPERTIES`. Tests in `uml.spec.ts`. |
| `src/lib/graph/node-types.ts` | The `uml-class` type: template (ports, content), label; `umlMembers(node, key)`, `umlAbstract(node)`. |
| `src/lib/graph/link-relations.ts` | `UML_RELATIONS` (the relations as looks), `relationOf(link)`, `relationStyle(relation, link)`. Tests in `link-relations.spec.ts`. |
| `src/lib/graph/store.ts` | `setNodeContent(g, nodeId, patch)`: sets content keys (here `abstract`, `attributes`, `methods`); `setLinkStyle` sets a link's `line`, `mark`, `arrow`. |
| `src/lib/components/GraphNode.svelte` | Draws the three compartments with highlighted lines, underlined / italic by their markers (styles `.node.uml`, `.uml-*` in `static/styles/imge.css`). |
| `src/lib/components/GraphLinks.svelte` | Draws link lines (solid, dashed, dotted) and end marks (`MARKS`: one SVG marker per mark). |
| `src/lib/components/properties/PropsUmlMembers.svelte` | The panel's Attributes and methods section, with the Abstract class checkbox. |
| `src/lib/components/properties/PropsLinkStyle.svelte` | The link's Look section: Relation, Shape, Arrow, Mark, Line, Route. |
| `src/lib/components/properties/PropUmlLines.svelte` | One member field: textarea over a highlighted copy, format check under it. |

## Roadmap: a functional class diagram (later)

What exists is the **class box** (name, attributes and methods in compartments, the notation checked, static and abstract members drawn the UML way) and the **relation looks**. Still missing is mostly about the ends of relations. Planned for later, in this order.

| Part | State today |
|---|---|
| Class box with compartments, member notation, visibility | done |
| Relation kinds with their UML look | done (2026-10-27): link `line` and `mark`, the Relation dropdown |
| Static (underlined) and abstract (italic) members, abstract classes | done (2026-10-27): `{static}` / `{abstract}` markers, the Abstract class checkbox |
| Different marks at the two ends (a diamond at the whole and an arrow at the part) | missing: one `mark` for every marked end |
| Multiplicities and roles at the link ends (`1`, `0..*`, `owner`) | missing: a link has one name, in its middle |
| Relations attaching anywhere on a class box | missing: a class has one input and one output in fixed places, so relations always leave one side and enter the other |
| Interfaces and enums (`«interface»` above the name, enum values) | partly: `«interface»` can be written in the name (it wraps onto its own line); no stereotype field, no enum compartment |
| Property strings (`{readOnly}`, `{query}` ...) | done (2026-10-27) |
| Multiplicity in types (`args: String[*]`, `items: Item[0..5]`) | partly: `String[]` is accepted (fine for Java), `[*]` / `[0..5]` not yet |
| Stereotypes on members (`+ «create» Kugel(radius: double)`) | missing (constructors without a return type work) |
| Packages around classes | partly: groups hold classes, wrap and carry them and can be resized; no package look (tab) yet |
| Notes attached to classes | missing (the Note node type is planned) |
| Checks beyond the notation (duplicate member names, unknown types) | missing |

**Order of work**

1. ~~**Relation kinds**~~ — done: graph format v7 gives links `line` and `mark`, the relations are named looks ([Relations](#relations)). Chosen over a relation `type` so any diagram can use the looks; see [graph-format.md](graph-format.md#why-links-have-line-and-mark-v7).
2. **Link ends:** a mark per end (`marks: { source, target }`, a new format version) and multiplicity and role labels at each end of an association.
3. **Attach anywhere:** relations connect to the nearest side of a class box instead of fixed input / output ports. To decide then: ports on all four sides (the v6 port `side` exists for this), or borderless anchors just for UML.
4. **Stereotypes:** ~~member markers and abstract classes~~ (done), ~~property strings~~ (done); `«interface»` / `«enum»` as a field above the name (in `content`) and an enum values compartment; `«create»` on constructors; multiplicities in types (`[*]`, `[0..5]`).
5. **Packages:** the UML package look (a tab with the name) for groups that hold classes; holding, wrapping, moving and resizing already work.
6. Notes (the Note node type) and the further checks.

With 1–3 done, class diagrams can be called functional. Other UML diagrams (sequence, use case, state, activity, component) come after that; see [graph-types.md](graph-types.md).

## Changes

- 2026-10-27 — property strings at the end of member lines (`{readOnly}`, `{ordered}`, `{unique}`, `{id}`, `{redefines …}`, methods `{query}`), drawn as text, checked; Java to UML notes; the Shapes example and the feature map's UmlClass use `{readOnly}`; roadmap: multiplicity in types and «create» noted
- 2026-10-27 — section "Is it full UML?" (no: class diagrams partly, table of what works); class corners 2 px; the feature map shows the state
- 2026-10-27 — relations: links get line styles and end marks (graph format v7), the Relation dropdown with six UML relations; member markers `{static}` (underlined) and `{abstract}` (italic, methods) with checks; Abstract class checkbox (type version 2, content `abstract`); the Shapes example shows all of it; roadmap steps 1 and the member half of 4 done
- 2026-10-21 — roadmap to a functional class diagram (relation kinds, end labels, attach anywhere, stereotypes, packages), planned for later
- 2026-10-21 — first version: node type UML class with three compartments, member notation, highlighting, format check, the Attributes and methods section; the UML example uses it
