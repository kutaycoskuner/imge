<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-15
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Draws the graph's links inside the world layer, plus the preview while a new link is
	// dragged. Coordinates here are the world layer's CSS space: (x, -y) of world coords,
	// scaled by the layer's own transform.
	//
	// Shapes (link.shape, or linkShapeOverride for display only):
	//   spline     curve with horizontal tangents
	//   line       straight line
	//   manhattan  right angles: out horizontally, a vertical segment at `bend` (0 = output,
	//              1 = input) of the horizontal gap, in horizontally. A backward link (input
	//              left of the output) goes out a stub, across at `bend` of the vertical gap,
	//              and back in, so it doesn't run through its nodes.
	// A selected manhattan link gets a `.link-bend` grab area on its middle segment; the page
	// drags it and reads the segment's range from its data-* attributes.
	//
	// Port positions are measured from the rendered nodes (offset of each port's center from
	// its node's corner), so links stay attached when a name changes a node's size. The
	// offsets don't depend on pan/zoom, so they are re-measured only after the graph changes.
	// Each link has an invisible wide `.link-hit` path so it's easy to click; the page reads
	// its data-link-id to select it. A link's optional name shows as a tooltip.
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { graph, selection, linkShapeOverride } from '$lib/graph/store';
	import type { Point } from '$lib/graph/store';
	import type { GraphNode, LinkShape } from '$lib/graph/types';

	export let drag: {
		nodeId: string;
		kind: 'input' | 'output';
		portId: string;
		to: Point; // mouse, world layer CSS coords
	} | null = null;

	// length of the straight stub a backward manhattan link leaves and enters its ports with
	const STUB = 24;

	// port center relative to its node's top-left corner, keyed by data-port-key
	let portOffsets: Record<string, Point> = {};

	$: $graph, measurePorts();

	async function measurePorts(): Promise<void> {
		if (!browser) return; // no DOM during server-side prerendering
		await tick(); // wait until the nodes for this graph are in the DOM
		const next: Record<string, Point> = {};
		document.querySelectorAll<HTMLElement>('.world .port[data-port-key]').forEach((port) => {
			const node = port.closest<HTMLElement>('.node');
			if (!node) return;
			// offsetLeft/Top ignore CSS transforms, so this is independent of pan and zoom
			let x = port.offsetWidth / 2 + node.clientLeft;
			let y = port.offsetHeight / 2 + node.clientTop;
			let el: HTMLElement | null = port;
			while (el && el !== node) {
				x += el.offsetLeft;
				y += el.offsetTop;
				el = el.offsetParent as HTMLElement | null;
			}
			next[port.dataset.portKey!] = { x, y };
		});
		portOffsets = next;
	}

	// nodes and offsets are passed in (not read from the closure) so the `$:` blocks below
	// re-run when either changes
	function portPosition(
		nodes: GraphNode[],
		offsets: Record<string, Point>,
		nodeId: string,
		kind: string,
		portId: string
	): Point | null {
		const node = nodes.find((n) => n.id === nodeId);
		const offset = offsets[`${nodeId}:${kind}:${portId}`];
		if (!node || !offset) return null;
		return { x: node.position.x + offset.x, y: -node.position.y + offset.y };
	}

	// the middle segment of a manhattan link: vertical at x (forward) or horizontal at y
	// (backward), with the range `bend` 0..1 maps onto
	interface Bend {
		axis: 'x' | 'y';
		from: number; // coordinate at bend 0
		to: number; // coordinate at bend 1
		at: number; // current coordinate
		span: [number, number]; // the segment's extent along the other axis
		cross: number; // the other axis' position for a horizontal segment / x for vertical
	}

	function manhattan(from: Point, to: Point, bend: number): { d: string; bend: Bend } {
		if (to.x - from.x >= 2 * STUB) {
			const x = from.x + bend * (to.x - from.x);
			return {
				d: `M ${from.x} ${from.y} H ${x} V ${to.y} H ${to.x}`,
				bend: { axis: 'x', from: from.x, to: to.x, at: x, span: [from.y, to.y], cross: x }
			};
		}
		// backward: out a stub, across at `bend` of the vertical gap, back in a stub
		const out = from.x + STUB;
		const into = to.x - STUB;
		const y = from.y + bend * (to.y - from.y);
		return {
			d: `M ${from.x} ${from.y} H ${out} V ${y} H ${into} V ${to.y} H ${to.x}`,
			bend: { axis: 'y', from: from.y, to: to.y, at: y, span: [into, out], cross: y }
		};
	}

	function shapePath(shape: LinkShape, from: Point, to: Point, bend = 0.5): { d: string; bend?: Bend } {
		if (shape === 'line') return { d: `M ${from.x} ${from.y} L ${to.x} ${to.y}` };
		if (shape === 'manhattan') return manhattan(from, to, bend);
		// spline: horizontal tangents, leaves an output to the right, enters an input from the left
		const c = Math.max(40, Math.abs(to.x - from.x) * 0.5);
		return { d: `M ${from.x} ${from.y} C ${from.x + c} ${from.y}, ${to.x - c} ${to.y}, ${to.x} ${to.y}` };
	}

	$: nodes = $graph.data.nodes;

	$: paths = $graph.data.links.flatMap((link) => {
		const from = portPosition(nodes, portOffsets, link.source.node, 'output', link.source.port);
		const to = portPosition(nodes, portOffsets, link.target.node, 'input', link.target.port);
		if (!from || !to) return [];
		const shape = $linkShapeOverride ?? link.shape;
		const { d, bend } = shapePath(shape, from, to, link.bend);
		const selected = link.id === $selection.link;
		return [{ link, d, selected, bend: selected ? bend : undefined }];
	});

	$: preview = (() => {
		if (!drag) return null;
		const port = portPosition(nodes, portOffsets, drag.nodeId, drag.kind, drag.portId);
		if (!port) return null;
		// a drag always reads output -> input, whichever end it started from
		const shape = $linkShapeOverride ?? 'spline';
		return drag.kind === 'output' ? shapePath(shape, port, drag.to).d : shapePath(shape, drag.to, port).d;
	})();
</script>

<svg class="links-layer" aria-hidden="true">
	{#each paths as { link, d, selected, bend } (link.id)}
		<path class="link" class:selected {d} />
		<path class="link-hit" {d} data-link-id={link.id}>
			{#if link.name}<title>{link.name}</title>{/if}
		</path>
		{#if bend}
			<!-- grab area for moving the corner of a selected manhattan link -->
			<path
				class="link-bend"
				class:vertical={bend.axis === 'x'}
				d={bend.axis === 'x'
					? `M ${bend.cross} ${bend.span[0]} V ${bend.span[1]}`
					: `M ${bend.span[0]} ${bend.cross} H ${bend.span[1]}`}
				data-link-id={link.id}
				data-axis={bend.axis}
				data-from={bend.from}
				data-to={bend.to}
			/>
		{/if}
	{/each}
	{#if preview}
		<path class="link link-preview" d={preview} />
	{/if}
</svg>
