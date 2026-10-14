<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Draws the graph's links as curves inside the world layer, plus the preview curve while
	// a new link is dragged. Coordinates here are the world layer's CSS space: (x, -y) of
	// world coords, scaled by the layer's own transform.
	//
	// Port positions are measured from the rendered nodes (offset of each port's center from
	// its node's corner), so curves stay attached when a title changes a node's size. The
	// offsets don't depend on pan/zoom, so they are re-measured only after the graph changes.
	// Each link has an invisible wide `.link-hit` path so it's easy to click; the page reads
	// its data-link-id to select it. A link's optional name shows as a tooltip.
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import { graph, selection } from '$lib/graph/store';
	import type { Point } from '$lib/graph/store';
	import type { GraphNode } from '$lib/graph/types';

	export let drag: {
		nodeId: string;
		kind: 'input' | 'output';
		portId: string;
		to: Point; // mouse, world layer CSS coords
	} | null = null;

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

	// horizontal tangents at both ends, like node editors: leaves an output to the right,
	// enters an input from the left
	function curve(from: Point, to: Point): string {
		const d = Math.max(40, Math.abs(to.x - from.x) * 0.5);
		return `M ${from.x} ${from.y} C ${from.x + d} ${from.y}, ${to.x - d} ${to.y}, ${to.x} ${to.y}`;
	}

	$: nodes = $graph.data.nodes;

	$: paths = $graph.data.links.flatMap((link) => {
		const from = portPosition(nodes, portOffsets, link.source.node, 'output', link.source.port);
		const to = portPosition(nodes, portOffsets, link.target.node, 'input', link.target.port);
		if (!from || !to) return [];
		return [{ link, d: curve(from, to), selected: link.id === $selection.link }];
	});

	$: preview = (() => {
		if (!drag) return null;
		const port = portPosition(nodes, portOffsets, drag.nodeId, drag.kind, drag.portId);
		if (!port) return null;
		// a drag always reads output -> input, whichever end it started from
		return drag.kind === 'output' ? curve(port, drag.to) : curve(drag.to, port);
	})();
</script>

<svg class="links-layer" aria-hidden="true">
	{#each paths as { link, d, selected } (link.id)}
		<path class="link" class:selected {d} />
		<path class="link-hit" {d} data-link-id={link.id}>
			{#if link.name}<title>{link.name}</title>{/if}
		</path>
	{/each}
	{#if preview}
		<path class="link link-preview" d={preview} />
	{/if}
</svg>
