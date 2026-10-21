# Graph types

Kinds of graphs imge could draw, checked one by one as the editor grows. For each: what it is, whether it's possible today, and what's missing. Not all of them have established names; the descriptions say what is meant. Graphs that should also *run* (math nodes, textures, circuits) need the planned simulation layer: [graph-simulation.md](graph-simulation.md).

State as of 2026-10-21 (graph format v6).

- **possible**: can be drawn today with the existing features, in a basic form
- **partly**: the core works, but something that defines the type is missing
- **not yet**: needs features the editor doesn't have

Every type has an example graph: open it from the Esc menu's **Examples** tab; the files are in `static/data/examples/`. For the types marked *not yet* the example is a **sketch**: drawn with basic nodes (several named ports, colours, groups, link names and arrows) to show what the type is about until the real node types exist.

## Overview

| Graph type | Status | Main thing missing |
|---|---|---|
| [Mind / relation map](#mind--relation-map) | possible | colours shown, free notes on nodes |
| [Flowchart / algorithm](#flowchart--algorithm) | partly | decision node with yes / no outputs, start / end shapes |
| [Math calculation nodes / parametric graph](#math-calculation-nodes--parametric-graph) (later) | not yet | value-typed ports, node types with parameters, the simulation layer |
| ↳ [Textures (shader-like)](#textures-shader-like) | not yet | as math nodes, plus per-pixel values and previews |
| [Circuit](#circuit) (later) | not yet | circuit symbols, two-way terminals, bit / signal values, the simulation layer |
| ↳ [ALU / processor mapping](#alu--processor-mapping) | not yet | as digital circuit, plus composite parts and stepping |
| [UML (software architecture)](#uml-software-architecture) | partly | UML arrow heads, dashed dependencies (class compartments: done) |
| [Sequence diagram](#sequence-diagram) | not yet | lifelines, messages ordered in time |
| [Loose architecture / process map](#loose-architecture--process-map) (rough software architecture) | possible | resizable groups that carry their nodes |
| [Number / decision tree](#number--decision-tree) | possible | automatic tree layout |
| [Lattice (math)](#lattice-math) | possible | automatic layering, point-style nodes |
| [Big data relation graph](#big-data-relation-graph) | not yet | data import, automatic layout, performance |
| [Process planning](#process-planning) | partly | time axis / lanes, durations |
| [Blackboard note taking](#blackboard-note-taking) | not yet | free text and drawing |
| [Set visualization / function projection](#set-visualization--function-projection) | not yet | regions (Venn), sets as containers |

## The types

### Mind / relation map

Ideas as nodes, relations as links; no strict direction.

- **Status:** possible
- **Works today:** nodes and names, links in any direction, arrows `none` or `both` for undirected relations, link names for the kind of relation, cycles.
- **Works today:** node colours (border and dim fill), set in the Properties panel.
- **Missing:** notes or text inside nodes, a radial layout around a central idea.
- **Example:** Trip planning (`trip-planning.json`); the Feature map (the start graph) is a relation map

### Flowchart / algorithm

Steps connected in order, left to right or top to bottom, with branches and loops.

- **Status:** partly
- **Works today:** direction top-to-bottom or left-to-right, arrows, manhattan links, loops (cycles drawn around their nodes), link names for "yes" / "no".
- **Missing:** a decision node (diamond) with two labelled outputs; start / end shapes; adding outputs to a node (every node has one input and one output).
- **Example:** Find the largest number (`find-largest.json`)

### Math calculation nodes / parametric graph

Like Blender's shader / geometry nodes or a node-based calculator: nodes compute values (numbers, vectors) from their inputs and pass results on; changing a parameter updates everything after it. Planned for later.

- **Status:** not yet
- **Ready in graph format v6:** parameters as node `content`, several ports per node in one list, port `type` for the value type, node types with templates.
- **Missing:** value types on ports and their linking rule, math node types (constant, add, multiply, sin, vector ...), values for unlinked inputs, the simulation layer that computes in link order, values shown on ports.
- **Note:** a cycle can't be computed here: it is marked as an error (see [graph-simulation.md](graph-simulation.md#the-pieces)).
- **Example (sketch):** Quadratic a·x² + b·x + c (`math-quadratic.json`): constants, operations with two inputs, the values written in the names

#### Textures (shader-like)

Procedural textures built from nodes (noise, gradient, mix, colour ramp ...), as in Blender's shader editor; each node shows a small preview of its result.

- **Status:** not yet
- **Missing:** everything math nodes need, plus colour / per-pixel values (a link carries a function of the pixel position) and previews inside nodes (canvas first, later WebGL). See [graph-simulation.md](graph-simulation.md#textures-shader-like).
- **Example (sketch):** Marble texture (`texture-marble.json`)

### Circuit

Electronic circuits drawn with their symbols: **digital** (gates, flip-flops, registers, buses) and, much later, **analog** (resistors, capacitors, sources).

- **Status:** not yet
- **Ready in graph format v6:** two-way terminals (port kind `any`, allowed by `CAN_LINK` to link with everything), symbols referenced from content (`content.symbol`), ports that follow parameters (a gate with 2–4 inputs).
- **Missing:** circuit node types with symbols, port sides above / below drawn, bit / bus value types; to *run* a circuit: the simulation layer with stepping (digital) or a solver (analog), see [graph-simulation.md](graph-simulation.md#digital-circuits).
- **Examples (sketches):** Half adder (`circuit-half-adder.json`, digital), Voltage divider (`circuit-voltage-divider.json`, analog: a closed loop drawn around its nodes)

#### ALU / processor mapping

Mapping how an ALU or processor works: units (adders, registers, multiplexers) and the signals between them.

- **Status:** not yet
- **Missing:** everything a digital circuit needs, plus composite parts (a sub-graph used as one node) and, ideally, stepping through a calculation.
- **Example (sketch):** ALU (4-bit, sketch) (`alu-sketch.json`): registers, three units and a multiplexer picked by opcode

### UML (software architecture)

Class, component or sequence diagrams for software architecture.

- **Status:** partly
- **Works today:** UML class nodes with three compartments (class name, attributes, methods), member lines highlighted and checked against the UML notation (see [graph-uml.md](graph-uml.md)); relations as links with names and arrows.
- **Missing:** relation kinds with their UML look (triangles, diamonds, dashed lines), multiplicities and roles at link ends, relations attaching anywhere on a class box, stereotypes, packages; component diagrams. Planned for later, in this order: [graph-uml.md, roadmap](graph-uml.md#roadmap-a-functional-class-diagram-later).
- **Example:** Shapes (UML classes) (`shapes-uml.json`)

### Sequence diagram

UML sequence diagrams: participants (objects, services) side by side as vertical lifelines, messages between them as horizontal arrows, read from top to bottom in time order; activation bars show who is working.

- **Status:** not yet
- **Missing:** a lifeline node type (a header with a long vertical line), messages that attach anywhere along a lifeline and keep their order in time (not port to port), return messages (dashed), activation bars, optional fragments (loop / alt boxes, possibly built on groups).
- **Example (sketch):** Login sequence (`sequence-login.json`): participants as coloured columns, messages numbered in time order, replies as backward arrows

### Loose architecture / process map

Less strict diagrams that describe a system or a process at a glance (like the hand-made maps in the input samples), including **rough software architecture**: services, databases, queues and the calls between them, grouped by area.

- **Status:** possible
- **Works today:** nodes, links with shapes, arrows and names, both directions.
- **Works today:** groups as frames behind related nodes, sized in the Properties panel.
- **Missing:** resizable groups that carry their nodes, free text labels not attached to a node.
- **Example:** Web app architecture (`web-app-architecture.json`)

### Number / decision tree

Trees from computer science: search trees, heaps, decision trees.

- **Status:** possible
- **Works today:** top-to-bottom direction, links from a parent to its children, link names for branch conditions.
- **Missing:** automatic tree layout (placing children evenly under their parent), ordered children (left / right).
- **Example:** Binary search tree (`binary-search-tree.json`)

### Lattice (math)

Partial orders drawn as Hasse diagrams: elements ordered bottom to top, each line meaning "covers".

- **Status:** possible
- **Works today:** top-to-bottom direction, links without arrows, many links per node.
- **Missing:** automatic layering by rank, small point-style nodes with labels next to them.
- **Example:** Subsets of {a, b, c} (`subset-lattice.json`)

### Big data relation graph

Many nodes (thousands) and relations, usually generated from data.

- **Status:** not yet
- **Missing:** import from data (CSV / JSON lists), automatic (force-directed) layout, drawing many nodes fast (nodes outside the view skipped, or canvas / WebGL drawing instead of one element per node), filtering and search.
- **Example (sketch):** Package dependencies (`big-data-packages.json`): 29 packages in four layers, placed by hand; a real big data graph would be generated and laid out automatically

### Process planning

Tasks, their order and dependencies, possibly over time.

- **Status:** partly
- **Works today:** tasks as nodes, dependencies as links with arrows, direction.
- **Missing:** a time axis or swimlanes, task durations, dependency types (finish-to-start ...).
- **Example:** Release process (`release-process.json`)

### Blackboard note taking

A free canvas for notes, like a blackboard: text, sketches, arrows anywhere.

- **Status:** not yet
- **Missing:** free text blocks without ports, freehand drawing, arrows not tied to nodes, sticky notes.
- **Example (sketch):** Lecture notes (`blackboard-notes.json`): colour-coded notes, a group for definitions

### Set visualization / function projection

Sets and their relations (Venn / Euler diagrams), and functions as arrows from elements of one set to another.

- **Status:** not yet
- **Missing:** overlapping regions (Venn), sets as containers holding element nodes; a function projection could be partly drawn today (elements as nodes, arrows between them), but without the sets around them.
- **Example (sketch):** Function f: A → B (`set-function.json`): two sets as groups, f drawn as named links

## Building blocks that unlock several types

| Feature | Unlocks |
|---|---|
| Add / remove ports, named ports | flowchart decisions, parametric graphs, UML |
| Node shapes (diamond, circle, point) | flowchart, lattice, decision trees |
| Groups / containers (started: frames with a size; no drag handle, don't carry their nodes yet) | loose architecture maps, set visualization, UML packages |
| Node colours drawn (done) | mind maps, architecture maps |
| Node content (text, compartments; started: UML class compartments) | UML, mind maps, notes |
| Automatic layout (tree, layered, force) | trees, lattices, big data |
| Link types with their own look (dashed, UML heads) | UML, process planning |
| Simulation layer ([graph-simulation.md](graph-simulation.md)): value-typed ports, `evaluate` per type, engine | math nodes, textures, circuits, ALU mapping |
| Circuit symbols, port sides above / below | circuits |
| Lifelines and time-ordered messages | sequence diagrams |
| Fast drawing of many nodes | big data |

## Changes

- 2026-10-21 — UML: class nodes with compartments, highlighting and format check (graph-uml.md); the example uses them
- 2026-10-21 — every type has an example now: sketches for the *not yet* types (math, texture, two circuits, ALU, sequence, package dependencies, lecture notes, set function)
- 2026-10-21 — new types: circuit (digital / analog, with the ALU mapping under it), sequence diagram; parametric graph is now "math calculation nodes" with textures under it; rough software architecture named under the loose architecture map; running graphs planned in [graph-simulation.md](graph-simulation.md)
- 2026-10-21 — graph format v6: node types keep their own data in `content`, ports in one list with `kind` (in / out / two-way `any`); this prepares UML classes, circuit symbols and notes (see [graph-format.md](graph-format.md#why-nodes-look-like-this))
- 2026-10-21 — groups started: frames behind nodes (fixed size)
- 2026-10-21 — node colours are drawn: removed from the missing lists of relation and architecture maps
- 2026-10-16 — an example graph for each possible / partly possible type, opened from the Esc menu
- 2026-10-16 — first version: twelve graph types with status (possible / partly / not yet) and what each needs; building blocks that unlock several types
