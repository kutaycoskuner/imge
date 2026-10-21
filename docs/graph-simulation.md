# Simulation layer (planned)

How imge could later *run* some graphs instead of only drawing them: math nodes that compute numbers, texture nodes that produce images, circuits that simulate signals. Nothing here is built yet; this is the plan the current data structure is prepared for.

State as of 2026-10-21 (graph format v6). Kinds of graph it serves: [graph-types.md](graph-types.md).

- [Goal](#goal)
- [Principles](#principles)
- [What graph format v6 already provides](#what-graph-format-v6-already-provides)
- [The pieces](#the-pieces)
- [Domains](#domains)
- [In the editor](#in-the-editor)
- [Rough order of work](#rough-order-of-work)
- [Open questions](#open-questions)

## Goal

| Domain | A node is | A link carries | Running means |
|---|---|---|---|
| Math calculation | an operation (add, multiply, sin, vector math ...) or a constant | a number or vector | every result updates as soon as an input or parameter changes |
| Textures (shader-like) | a pattern or filter (noise, gradient, mix, colour ramp ...) | a colour or value *per pixel* | the node shows a preview image of its result |
| Digital circuit | a gate, flip-flop, register, adder, multiplexer ... | a bit or a bus (several bits) | signals propagate; with a clock, the circuit steps through time |
| Analog circuit (much later) | a component: resistor, capacitor, source ... | a voltage / current at a terminal | the circuit is solved for voltages and currents |

The ALU / processor mapping from [graph-types.md](graph-types.md#alu--processor-mapping) becomes a digital circuit that can be stepped.

## Principles

- **A layer on top, not in the file.** The graph file stays a description (nodes, ports, links, parameters). Computed values are kept in memory only and never saved: they can always be computed again, and old files never need to know about them.
- **The node type computes.** Each calculating type provides one function, `evaluate`, next to its drawing and its Properties section (`node-types.ts`). The editor's generic code only orders and runs these functions; it knows nothing about adding numbers or gates.
- **Parameters are content.** A node's settings (a constant's value, a noise scale, a gate's number of inputs) live in its `content`, edited in its own Properties section, like name and colour today.
- **Ports say what flows.** A port's `kind` (in / out / any) decides *whether* two ports may connect (`CAN_LINK`); its `type` decides whether the *values* fit (number, vector, colour, bit, bus ...). Both are checked when linking.
- **Drawing stays separate.** The simulation produces values; the editor shows them (on ports, links, inside nodes) without the simulation knowing how.

## What graph format v6 already provides

| Need | Already there |
|---|---|
| Per-type parameters | `content`, defined by each type |
| Per-type behaviour without touching the editor | node types with templates; `evaluate` becomes one more template field |
| Value types on ports | port `type` (always `"basic"` today; later number, vector, colour, bit, bus ...) |
| Two-way terminals (analog circuits) | port kind `any`, allowed by `CAN_LINK` to link with everything |
| Ports that follow parameters (a gate with 2–4 inputs) | the type rewrites the top-level `ports` when its content changes; links on removed ports go, as on a type change |
| Types that change over time | `typeVersion` on every node, so a type's template can be upgraded without a new graph format |

Details and reasoning: [graph-format.md](graph-format.md#why-nodes-look-like-this).

## The pieces

1. **`evaluate` per calculating type:** `evaluate(inputs, content, state?) → outputs`, a pure function: input values by port id in, output values by port id out. `state` only for types that remember something between steps (flip-flops, registers, counters).
2. **Value types:** a small list of port `type`s with a compatibility rule next to `CAN_LINK` (e.g. a number may feed a vector input by repeating it; a bit may not feed a colour). Refused when linking, with a message, like a wrong kind today.
3. **Values for unlinked inputs:** an optional port `value` (e.g. `2` for an unlinked "B" input of an add node), shown and edited on the node or in the Properties panel. Adding a field to ports is a file change: done with a graph format version (or a type template version) and an adapter, as usual.
4. **The engine** (one generic module, e.g. `src/lib/graph/simulate.ts`):
    - finds the calculating nodes and orders them along the links (inputs before the nodes that use them)
    - runs `evaluate` in that order and keeps every port's value in memory
    - re-runs only what depends on a change (an edited parameter, a new link)
    - reports problems per node instead of failing: a cycle, a missing input, a value type that doesn't fit
5. **Cycles**, decided per domain:
    - math and textures: a cycle can't be computed; the links that close it (the editor already finds them, `findBackLinks`) are marked and their nodes show an error
    - digital circuits: a cycle is normal (latches, counters); the circuit runs in **steps**: each step computes every node from the previous step's values, like a clock tick
6. **Results in memory:** a store of values by node and port, cleared when another graph is opened, never written to the file.

## Domains

### Math calculation nodes

- Types: constant, add / subtract / multiply / divide, power, sin / cos, min / max, clamp, compare, vector compose / split, and later a formula node whose expression is its content.
- Value types: number, vector (2 / 3 components), boolean.
- Runs continuously: every change recomputes what depends on it; values are shown on the ports.

### Textures (shader-like)

- Types: coordinates, noise, gradient, checker, mix, colour ramp, maths on colours, output.
- A link carries a **function of the pixel position**, not an image: a node composes the functions of its inputs, and only previews are rendered (small images inside the nodes, a bigger one for the output). That keeps texture graphs fast and resolution-free.
- Rendering: first on a canvas pixel by pixel (simple, slow for big images), later compiled to a WebGL shader.
- Value types: colour, number (grey), vector (coordinates).

### Digital circuits

- Types: AND / OR / NOT / XOR / NAND gates (number of inputs in content), input switch, output lamp, clock, D flip-flop, register, adder, multiplexer; later composite parts (a sub-graph used as one node, e.g. an ALU).
- Value types: bit, bus (n bits).
- Runs in steps: step once, run at a speed, reset; a clock node toggles every step.
- Drawn as circuit symbols (`content.symbol`, images kept with the type), signals coloured on the links (0 / 1).

### Analog circuits (much later)

- Types: resistor, capacitor, inductor, voltage / current source, ground, meters.
- Terminals are two-way ports (`any`); connected terminals form *nets*; the circuit is solved for every net's voltage (nodal analysis), over time for capacitors and inductors.
- A different kind of engine (solving equations instead of computing in order), but it reads the same graph: nodes, ports, links, parameters in content.

## In the editor

- **Values on the graph:** a port shows its current value on hover (or always, as a small badge); a link can be coloured by its value (bits, signal strength).
- **Previews inside nodes:** texture nodes show a small image in their body.
- **Run controls** for stepped graphs (circuits): step, run / pause, reset, speed; in the toolbar or the Properties panel's Graph section.
- **Problems marked on nodes:** a red outline and a hint for a cycle, a missing input, a value type that doesn't fit.
- **Inspecting:** the Properties panel shows the selected node's input and output values next to its parameters.

## Rough order of work

1. Port value types and their linking rule (still no computing).
2. The engine with `evaluate`, for math nodes; values shown on ports.
3. Values for unlinked inputs (port `value`, with a format / template version).
4. Digital circuits: bit / bus types, gates, stepping and run controls; circuit symbols.
5. Textures: function-valued links, canvas previews, later WebGL.
6. Composite nodes (a sub-graph as one node), e.g. an ALU from gates.
7. Analog circuits with a solver.

## Open questions

- **Where a computed value lives in the UI:** always visible, or only on hover / for the selected node.
- **Cycles in math graphs:** only refuse them, or also allow a stepped mode like circuits (for feedback, e.g. "previous value + 1").
- **Composite nodes:** stored inside the node's content, or as a separate graph file the node refers to.
- **Units:** whether numbers carry units (volts, seconds) checked like value types.
- **Performance:** at which graph size the engine needs to work off the main thread (a web worker).

## Changes

- 2026-10-21 — first version: the plan for running graphs (math, textures, digital and analog circuits): principles, what format v6 provides, engine, cycles, editor UI, order of work, open questions
