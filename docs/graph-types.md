# Graph types

Kinds of graphs imge could draw, checked one by one as the editor grows. For each: what it is, whether it's possible today, and what's missing. Not all of them have established names; the descriptions say what is meant.

State as of 2026-10-16 (graph format v5).

- **possible**: can be drawn today with the existing features, in a basic form
- **partly**: the core works, but something that defines the type is missing
- **not yet**: needs features the editor doesn't have

The possible and partly possible types each have an example graph: open it from the Esc menu's **Examples** tab; the files are in `static/data/examples/`.

## Overview

| Graph type | Status | Main thing missing |
|---|---|---|
| [Mind / relation map](#mind--relation-map) | possible | colours shown, free notes on nodes |
| [Flowchart / algorithm](#flowchart--algorithm) | partly | decision node with yes / no outputs, start / end shapes |
| [Parametric graph](#parametric-graph-shader-like) (later) | not yet | typed ports, node types with parameters, evaluation |
| ↳ [ALU / processor mapping](#alu--processor-mapping) | not yet | as parametric graph, plus bit-level values |
| [UML (software architecture)](#uml-software-architecture) | partly | class compartments, UML arrow heads |
| [Loose architecture / process map](#loose-architecture--process-map) | possible | groups / containers, colours shown |
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
- **Missing:** node colours drawn (the `color` field is stored, not shown), notes or text inside nodes, a radial layout around a central idea.
- **Example:** Trip planning (`trip-planning.json`); the Feature map (the start graph) is a relation map

### Flowchart / algorithm

Steps connected in order, left to right or top to bottom, with branches and loops.

- **Status:** partly
- **Works today:** direction top-to-bottom or left-to-right, arrows, manhattan links, loops (cycles drawn around their nodes), link names for "yes" / "no".
- **Missing:** a decision node (diamond) with two labelled outputs; start / end shapes; adding outputs to a node (every node has one input and one output).
- **Example:** Find the largest number (`find-largest.json`)

### Parametric graph (shader-like)

Like Blender's shader / geometry nodes: nodes compute values from their inputs and pass results on. Planned for later.

- **Status:** not yet
- **Missing:** typed ports (number, vector, colour ...), several named inputs and outputs per node, node types with parameters, an evaluation engine that computes results in link order, showing values on nodes.
- **Note:** cycles would need a rule here (a computed graph usually can't contain one).

#### ALU / processor mapping

Mapping how an ALU or processor works: units (adders, registers, multiplexers) and the signals between them.

- **Status:** not yet
- **Missing:** everything the parametric graph needs, plus bit / bus values and, ideally, stepping through a calculation.

### UML (software architecture)

Class, component or sequence diagrams for software architecture.

- **Status:** partly
- **Works today:** classes / components as nodes, relations as links with names, arrows.
- **Missing:** node compartments (name / attributes / methods), UML arrow heads (hollow triangle for inheritance, diamonds for aggregation / composition), dashed links for dependencies, link types that set these.
- **Example:** Shapes (UML-ish) (`shapes-uml.json`)

### Loose architecture / process map

Less strict diagrams that describe a system or a process at a glance (like the hand-made maps in the input samples).

- **Status:** possible
- **Works today:** nodes, links with shapes, arrows and names, both directions.
- **Missing:** groups / containers (a box around related nodes), node colours drawn, free text labels not attached to a node.
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

### Set visualization / function projection

Sets and their relations (Venn / Euler diagrams), and functions as arrows from elements of one set to another.

- **Status:** not yet
- **Missing:** overlapping regions (Venn), sets as containers holding element nodes; a function projection could be partly drawn today (elements as nodes, arrows between them), but without the sets around them.

## Building blocks that unlock several types

| Feature | Unlocks |
|---|---|
| Add / remove ports, named ports | flowchart decisions, parametric graphs, UML |
| Node shapes (diamond, circle, point) | flowchart, lattice, decision trees |
| Groups / containers | loose architecture maps, set visualization, UML packages |
| Node colours drawn | mind maps, architecture maps |
| Node content (text, compartments) | UML, mind maps, notes |
| Automatic layout (tree, layered, force) | trees, lattices, big data |
| Link types with their own look (dashed, UML heads) | UML, process planning |
| Evaluation engine | parametric graphs, ALU mapping |
| Fast drawing of many nodes | big data |

## Changes

- 2026-10-16 — an example graph for each possible / partly possible type, opened from the Esc menu
- 2026-10-16 — first version: twelve graph types with status (possible / partly / not yet) and what each needs; building blocks that unlock several types
