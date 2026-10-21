<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-21
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Draws the graph's links inside the world layer, plus the preview while a new link is
	// dragged. Coordinates here are the world layer's CSS space: (x, -y) of world coords,
	// scaled by the layer's own transform.
	//
	// Shape (link.shape, or linkShapeOverride for display only):
	//   spline     curve with horizontal tangents, entered and left by a short straight piece
	//              (ARROW_ROOM) so an arrowhead always lies on its own line
	//   line       straight line
	//   manhattan  right angles; the vertical segment sits at `bend` (0 = output, 1 = input)
	//              of the horizontal gap; an input left of its output gets stubs in and out
	// Links that close a cycle (findBackLinks) and self-loops go *around* their nodes instead:
	// out of the output, along a lane above (route "above", default) or below the nodes they
	// pass, and back into the input, in the link's shape. `bend` sets the lane's distance
	// from the nodes; links whose lanes would overlap get stacked lanes.
	// Arrows (link.arrow or linkArrowOverride): SVG markers at the input (forward), the
	// output (backward), both or none; showChevrons adds direction chevrons in the middle.
	// A link's name is drawn in its middle; editingLinkId shows a text field there instead.
	// Top-to-bottom graphs use the same geometry with x and y swapped (see `flow`).
	// A selected link with an adjustable corner or lane gets a `.link-bend` grab area; the
	// page drags it and reads the bend's range from its data-* attributes.
	//
	// Port positions and node sizes are measured from the rendered nodes (offsets ignore
	// pan/zoom), re-measured after every graph change, so links stay attached when a name
	// changes a node's size. Each link has an invisible wide `.link-hit` path so it's easy to
	// click; the page reads its data-link-id to select it.
	import { browser } from '$app/environment';
	import { tick } from 'svelte';
	import {
		graph,
		selection,
		editingLinkId,
		linkShapeOverride,
		linkArrowOverride,
		showChevrons,
		findBackLinks,
		renameLink,
		isGroup
	} from '$lib/graph/store';
	import type { Point } from '$lib/graph/store';
	import type { GraphNode, Link, LinkArrow, LinkShape } from '$lib/graph/types';

	export let drag: {
		nodeId: string;
		kind: 'input' | 'output';
		portId: string;
		to: Point; // mouse, world layer CSS coords
	} | null = null;

	const STUB = 24; // straight piece a link leaves / enters a port with when it routes around
	const SPLINE_PULL = 60; // how far a curve going around reaches out sideways
	const LANE_MIN = 15; // lane distance from the nodes at bend 0
	const LANE_RANGE = 120; // extra lane distance at bend 1
	const LANE_STEP = 18; // gap between stacked lanes
	// straight piece at both ends of a spline, as long as an arrowhead reaches back from the
	// port (the arrow marker's refX below): a marker is drawn straight along the path's end
	// direction, so on a curve that still bends there the line would leave the arrowhead
	const ARROW_ROOM = 17;

	interface Size {
		w: number;
		h: number;
	}

	// port center relative to its node's top-left corner, keyed by data-port-key
	let portOffsets: Record<string, Point> = {};
	let nodeSizes: Record<string, Size> = {};

	$: $graph, measure();

	async function measure(): Promise<void> {
		if (!browser) return; // no DOM during server-side prerendering
		await tick(); // wait until the nodes for this graph are in the DOM
		const ports: Record<string, Point> = {};
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
			ports[port.dataset.portKey!] = { x, y };
		});
		const sizes: Record<string, Size> = {};
		document.querySelectorAll<HTMLElement>('.world .node[data-id]').forEach((node) => {
			sizes[node.dataset.id!] = { w: node.offsetWidth, h: node.offsetHeight };
		});
		portOffsets = ports;
		nodeSizes = sizes;
	}

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

	// -------------------------------------------------------------------------------------
	// geometry: every path is also kept as points (curves sampled) to find its middle
	// -------------------------------------------------------------------------------------
	interface Bend {
		axis: 'x' | 'y';
		from: number; // coordinate at bend 0
		to: number; // coordinate at bend 1
		d: string; // the grab area's path
		vertical: boolean;
	}

	interface Drawn {
		d: string;
		pts: Point[];
		bend?: Bend;
	}

	// The geometry below is written for left-to-right graphs (links leave to the right and
	// enter from the left). Top-to-bottom graphs are drawn in a "flow space" with x and y
	// swapped: points go in through `flow()` and come out through `flow()` again (the swap is
	// its own inverse), so every shape, lane and chevron works in both directions (left-to-right and top-to-bottom).
	let swap = false; // set at the start of each drawing pass from the graph's direction
	const flow = (p: Point): Point => (swap ? { x: p.y, y: p.x } : p);
	const xy = (p: Point): string => {
		const q = flow(p);
		return `${q.x} ${q.y}`;
	};

	const polyline = (pts: Point[]): string => 'M ' + pts.map(xy).join(' L ');

	function cubic(p0: Point, c1: Point, c2: Point, p3: Point, n = 16): Point[] {
		const out: Point[] = [];
		for (let i = 0; i <= n; i++) {
			const t = i / n;
			const u = 1 - t;
			out.push({
				x: u * u * u * p0.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * p3.x,
				y: u * u * u * p0.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * p3.y
			});
		}
		return out;
	}

	function direct(shape: LinkShape, from: Point, to: Point, bend = 0.5): Drawn {
		if (shape === 'line') return { d: polyline([from, to]), pts: [from, to] };
		if (shape === 'manhattan') {
			// forward whenever the input is ahead of the output at all (also in tight layouts)
			if (to.x - from.x >= 8) {
				const x = from.x + bend * (to.x - from.x);
				const pts = [from, { x, y: from.y }, { x, y: to.y }, to];
				return {
					d: polyline(pts),
					pts,
					bend: { axis: 'x', from: from.x, to: to.x, d: polyline([pts[1], pts[2]]), vertical: true }
				};
			}
			// input left of the output (not a cycle): out a stub, across, back in a stub
			const y = from.y + bend * (to.y - from.y);
			const a = { x: from.x + STUB, y };
			const b = { x: to.x - STUB, y };
			const pts = [from, { x: a.x, y: from.y }, a, b, { x: b.x, y: to.y }, to];
			return {
				d: polyline(pts),
				pts,
				bend: { axis: 'y', from: from.y, to: to.y, d: polyline([a, b]), vertical: false }
			};
		}
		// the curve runs between the two straight end pieces
		const start = { x: from.x + ARROW_ROOM, y: from.y };
		const end = { x: to.x - ARROW_ROOM, y: to.y };
		const c = Math.max(40, Math.abs(end.x - start.x) * 0.5);
		const c1 = { x: start.x + c, y: start.y };
		const c2 = { x: end.x - c, y: end.y };
		return {
			d: `M ${xy(from)} L ${xy(start)} C ${xy(c1)}, ${xy(c2)}, ${xy(end)} L ${xy(to)}`,
			pts: [from, ...cubic(start, c1, c2, end), to]
		};
	}

	// a link going around its nodes along a lane at laneY; laneAt(bend) gives the lane's y
	function around(shape: LinkShape, from: Point, to: Point, laneY: number, bendRange: [number, number]): Drawn {
		const out = { x: from.x + STUB, y: laneY };
		const into = { x: to.x - STUB, y: laneY };
		const grab: Bend = {
			axis: 'y',
			from: bendRange[0],
			to: bendRange[1],
			d: polyline([out, into]),
			vertical: false
		};
		if (shape === 'manhattan') {
			const pts = [from, { x: out.x, y: from.y }, out, into, { x: into.x, y: to.y }, to];
			return { d: polyline(pts), pts, bend: grab };
		}
		if (shape === 'line') {
			const pts = [from, out, into, to];
			return { d: polyline(pts), pts, bend: grab };
		}
		// straight end pieces like a direct spline, so arrowheads stay on the line
		const start = { x: from.x + ARROW_ROOM, y: from.y };
		const end = { x: to.x - ARROW_ROOM, y: to.y };
		const mid = { x: (out.x + into.x) / 2, y: laneY };
		const a1 = { x: from.x + SPLINE_PULL, y: from.y };
		const a2 = { x: from.x + SPLINE_PULL, y: laneY };
		const b1 = { x: to.x - SPLINE_PULL, y: laneY };
		const b2 = { x: to.x - SPLINE_PULL, y: to.y };
		return {
			d: `M ${xy(from)} L ${xy(start)} C ${xy(a1)}, ${xy(a2)}, ${xy(mid)} C ${xy(b1)}, ${xy(b2)}, ${xy(end)} L ${xy(to)}`,
			pts: [from, ...cubic(start, a1, a2, mid), ...cubic(mid, b1, b2, end).slice(1), to],
			bend: grab
		};
	}

	// point halfway along a path, and the direction of the path there (degrees)
	function middle(pts: Point[]): { p: Point; angle: number } {
		const lengths = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
		let rest = lengths.reduce((a, b) => a + b, 0) / 2;
		for (let i = 0; i < lengths.length; i++) {
			if (rest <= lengths[i] && lengths[i] > 0) {
				const t = rest / lengths[i];
				const a = pts[i];
				const b = pts[i + 1];
				return {
					p: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
					angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
				};
			}
			rest -= lengths[i];
		}
		return { p: pts[0], angle: 0 };
	}

	// -------------------------------------------------------------------------------------
	// all links, drawn
	// -------------------------------------------------------------------------------------
	interface Placed {
		link: Link;
		d: string;
		mid: { p: Point; angle: number };
		arrow: LinkArrow;
		selected: boolean;
		bend?: Bend;
	}

	// a bend's axis and orientation in layer space (it was computed in flow space)
	const toLayer = (bend: Bend | undefined): Bend | undefined =>
		bend && swap ? { ...bend, axis: bend.axis === 'x' ? 'y' : 'x', vertical: !bend.vertical } : bend;

	$: placed = (() => {
		swap = $graph.metadata.direction === 'top-to-bottom';
		const nodes = $graph.data.nodes;
		const back = findBackLinks($graph);
		// node boxes in flow space (for top-to-bottom: layer top/bottom become left/right)
		const box = (n: GraphNode) => {
			const size = nodeSizes[n.id] ?? { w: 0, h: 0 };
			const left = n.position.x;
			const top = -n.position.y;
			return swap
				? { left: top, right: top + size.h, top: left, bottom: left + size.w }
				: { left, right: left + size.w, top, bottom: top + size.h };
		};
		const lanes: { route: string; x0: number; x1: number }[] = [];
		const result: Placed[] = [];

		for (const link of $graph.data.links) {
			const fromLayer = portPosition(nodes, portOffsets, link.source.node, 'output', link.source.port);
			const toLayerPt = portPosition(nodes, portOffsets, link.target.node, 'input', link.target.port);
			if (!fromLayer || !toLayerPt) continue;
			const from = flow(fromLayer);
			const to = flow(toLayerPt);
			const shape = $linkShapeOverride ?? link.shape;
			const goesAround = back.has(link.id) || link.source.node === link.target.node;

			let drawn: Drawn;
			if (goesAround) {
				const x0 = Math.min(from.x, to.x) - STUB;
				const x1 = Math.max(from.x, to.x) + STUB;
				// group frames are background: a lane goes around the nodes, not around frames
				const inSpan = nodes.filter((n) => !isGroup(n)).map(box).filter((b) => b.right >= x0 && b.left <= x1);
				const ends = nodes.filter((n) => n.id === link.source.node || n.id === link.target.node).map(box);
				const stacked = lanes.filter((l) => l.route === link.route && l.x0 <= x1 && l.x1 >= x0).length;
				lanes.push({ route: link.route, x0, x1 });
				const offset = LANE_MIN + stacked * LANE_STEP;
				const bend = link.bend ?? 0.5;
				const below = link.route === 'below';
				// start just outside the link's own two nodes, at `bend` of the lane range
				const base = below
					? Math.max(...ends.map((b) => b.bottom)) + offset
					: Math.min(...ends.map((b) => b.top)) - offset;
				let laneY = below ? base + bend * LANE_RANGE : base - bend * LANE_RANGE;
				// then move further out past any node the lane would run through, so it takes the
				// nearest free gap instead of going around everything in its horizontal span
				for (let moved = true; moved; ) {
					moved = false;
					for (const b of inSpan) {
						if (laneY >= b.top - LANE_MIN / 2 && laneY <= b.bottom + LANE_MIN / 2) {
							laneY = below ? b.bottom + LANE_MIN : b.top - LANE_MIN;
							moved = true;
						}
					}
				}
				drawn = around(shape, from, to, laneY, [base, below ? base + LANE_RANGE : base - LANE_RANGE]);
			} else {
				drawn = direct(shape, from, to, link.bend);
			}

			const selected = link.id === $selection.link;
			result.push({
				link,
				d: drawn.d,
				mid: middle(drawn.pts.map(flow)),
				arrow: $linkArrowOverride ?? link.arrow,
				selected,
				// the grab area only where the bend does something: manhattan corners, lanes
				bend: selected && (goesAround || shape === 'manhattan') ? toLayer(drawn.bend) : undefined
			});
		}
		return result;
	})();

	$: preview = (() => {
		if (!drag) return null;
		swap = $graph.metadata.direction === 'top-to-bottom';
		const portLayer = portPosition($graph.data.nodes, portOffsets, drag.nodeId, drag.kind, drag.portId);
		if (!portLayer) return null;
		const port = flow(portLayer);
		const mouse = flow(drag.to);
		// a drag always reads output -> input, whichever end it started from
		const shape = $linkShapeOverride ?? 'spline';
		return drag.kind === 'output' ? direct(shape, port, mouse).d : direct(shape, mouse, port).d;
	})();

	const markerEnd = (arrow: LinkArrow, selected: boolean) =>
		arrow === 'forward' || arrow === 'both' ? `url(#imge-arrow${selected ? '-selected' : ''})` : undefined;
	const markerStart = (arrow: LinkArrow, selected: boolean) =>
		arrow === 'backward' || arrow === 'both' ? `url(#imge-arrow${selected ? '-selected' : ''})` : undefined;

	// -------------------------------------------------------------------------------------
	// link name editing (F2 or double-click on a selected link)
	// -------------------------------------------------------------------------------------
	let draft = '';
	$: editing = placed.find((p) => p.link.id === $editingLinkId);
	$: if ($editingLinkId) draft = $graph.data.links.find((l) => l.id === $editingLinkId)?.name ?? '';

	function commit(): void {
		const id = $editingLinkId; // the store: blur can fire after Esc already ended editing
		if (!id) return;
		graph.update((g) => renameLink(g, id, draft));
		editingLinkId.set(null);
	}

	function handleKey(event: KeyboardEvent): void {
		if (event.key === 'Enter') commit();
		else if (event.key === 'Escape') {
			event.preventDefault(); // this Esc only cancels the edit; keeps the Esc menu closed
			editingLinkId.set(null);
		}
	}

	function focusSelect(el: HTMLInputElement) {
		el.focus();
		el.select();
	}
</script>

<svg class="links-layer" aria-hidden="true">
	<defs>
		<!-- orient auto-start-reverse: used at the start of a path it points backwards;
		     refX past the tip ends the arrow just outside the port square instead of under it;
		     refX = ARROW_ROOM, the straight end piece of splines the arrow lies on -->
		<marker id="imge-arrow" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
			<path class="link-arrow" d="M 0 1 L 9 5 L 0 9 z" />
		</marker>
		<marker id="imge-arrow-selected" viewBox="0 0 10 10" refX="17" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
			<path class="link-arrow selected" d="M 0 1 L 9 5 L 0 9 z" />
		</marker>
	</defs>

	{#each placed as { link, d, mid, arrow, selected, bend } (link.id)}
		<path
			class="link"
			class:selected
			{d}
			data-link-id={link.id}
			data-arrow={arrow}
			marker-end={markerEnd(arrow, selected)}
			marker-start={markerStart(arrow, selected)}
		/>
		<path class="link-hit" {d} data-link-id={link.id} />

		{#if $showChevrons && arrow !== 'none'}
			<g class="link-chevrons" class:selected transform="translate({mid.p.x} {mid.p.y}) rotate({mid.angle})">
				{#if arrow === 'forward' || arrow === 'both'}<path d="M -3 -4 L 2 0 L -3 4" transform={arrow === 'both' ? 'translate(5 0)' : ''} />{/if}
				{#if arrow === 'backward' || arrow === 'both'}<path d="M 3 -4 L -2 0 L 3 4" transform={arrow === 'both' ? 'translate(-5 0)' : ''} />{/if}
			</g>
		{/if}

		{#if link.name && link.id !== $editingLinkId}
			<text class="link-label" class:selected x={mid.p.x} y={mid.p.y - 8} data-link-id={link.id}>{link.name}</text>
		{/if}

		{#if bend}
			<!-- grab area for the corner of a manhattan link, or the lane of a link going around -->
			<path
				class="link-bend"
				class:vertical={bend.vertical}
				d={bend.d}
				data-link-id={link.id}
				data-axis={bend.axis}
				data-from={bend.from}
				data-to={bend.to}
			/>
		{/if}
	{/each}

	{#if preview}
		<path class="link link-preview" d={preview} marker-end="url(#imge-arrow)" />
	{/if}
</svg>

{#if editing}
	<input
		class="link-name-input"
		style="left: {editing.mid.p.x}px; top: {editing.mid.p.y - 8}px;"
		placeholder="link name"
		bind:value={draft}
		use:focusSelect
		on:keydown|stopPropagation={handleKey}
		on:blur={commit}
	/>
{/if}
