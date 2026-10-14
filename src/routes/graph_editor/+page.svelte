<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Graph editor page: loads the test graph (upgraded to the current format version by
	// $lib/graph/migrations.ts) into the graph store and turns mouse and keyboard input into
	// camera moves and graph edits:
	//   mouse  drag empty space = pan, wheel = zoom to cursor, click/Shift+click = select,
	//          drag node = move (all selected), drag from a port = link, drag a linked
	//          input's end away = detach
	//   keys   Shift+A add node at mouse, Delete/Backspace delete selection, F2 rename,
	//          F link two selected nodes, Esc cancel drag / clear selection
	// Graph operations and link rules live in $lib/graph/store.ts, world <-> screen math in
	// $lib/camera.ts; see docs/graph-editor-canvas.md.
	import PolkaDots from '$lib/components/PolkaDots.svelte';
	import OriginAxes from '$lib/components/OriginAxes.svelte';
	import UI_GraphEditor from '$lib/components/UI_GraphEditor.svelte';
	import CoordTracker from '$lib/components/CoordTracker.svelte';
	import AssistanceMsg from '$lib/components/AssistanceMsg.svelte';
	import GraphNode from '$lib/components/GraphNode.svelte';
	import GraphLinks from '$lib/components/GraphLinks.svelte';
	import { onMount } from 'svelte';
	import { dev } from '$app/environment';
	import { camera, viewport, panBy, zoomAt, trackViewport, screenToWorld } from '$lib/camera';
	import type { Point } from '$lib/camera';
	import { migrateGraph, stampCurrentVersion, CURRENT_GRAPH_VERSION } from '$lib/graph/migrations';
	import {
		graph,
		selection,
		editingNodeId,
		addLink,
		removeLink,
		removeNodes,
		moveNodes,
		findLinkInto,
		quickLink,
		selectNode,
		createNodeAt,
		type LinkOutcome
	} from '$lib/graph/store';
	import type { Link } from '$lib/graph/types';
	import { assistanceMsg } from '../../stores/imge_main';

	// exp() turns wheel delta into a smooth factor for both mouse wheels and trackpads
	const WHEEL_ZOOM_SPEED = 0.0015;
	const MESSAGE_DURATION_MS = 2500;

	let isPanningSpace = false;
	let isDraggingNodes = false;

	// link being dragged from a port; `to` is the mouse in world-layer CSS coords
	let linkDrag: { nodeId: number; kind: 'input' | 'output'; portId: string; to: Point } | null =
		null;

	// last mouse position in screen px; moves are applied as deltas from it
	let lastX = 0,
		lastY = 0;

	// Helpers
	// -----------------------------------------------------------------------------------
	// world coords of a screen point, and the same point in the world layer's CSS space (y down)
	const mouseWorld = (): Point => screenToWorld({ x: lastX, y: lastY }, $camera, $viewport);
	const toLayer = (p: Point): Point => ({ x: p.x, y: -p.y });

	let messageTimer: ReturnType<typeof setTimeout> | undefined;
	function notify(message: string): void {
		assistanceMsg.set(message);
		clearTimeout(messageTimer);
		messageTimer = setTimeout(() => assistanceMsg.set(''), MESSAGE_DURATION_MS);
	}

	const LINK_MESSAGES: Partial<Record<LinkOutcome, string>> = {
		replaced: 'Link replaced: an input takes one link',
		'self-link': 'A node cannot link to itself',
		'unknown-port': 'Links go from an output (right) to an input (left)'
	};

	function connect(link: Link): void {
		let outcome: LinkOutcome = 'exists';
		graph.update((g) => {
			const result = addLink(g, link);
			outcome = result.outcome;
			return result.graph;
		});
		const message = LINK_MESSAGES[outcome];
		if (message) notify(message);
	}

	// Mouse event functions
	// -----------------------------------------------------------------------------------
	function handleMouseDown(event: MouseEvent): void {
		if (event.button !== 0) return;
		const target = event.target as HTMLElement;
		if (target.closest('input')) return; // typing in a title field

		lastX = event.clientX;
		lastY = event.clientY;

		const port = target.closest<HTMLElement>('.port');
		if (port) return startLinkDrag(port);

		const linkHit = target.closest<SVGElement>('.link-hit');
		if (linkHit) {
			selection.set({
				nodes: [],
				link: {
					targetNodeId: Number(linkHit.dataset.targetNodeId),
					targetInputId: linkHit.dataset.targetInputId!
				}
			});
			return;
		}

		const nodeElement = target.closest<HTMLElement>('.node');
		if (nodeElement) {
			selection.update((sel) => selectNode(sel, Number(nodeElement.dataset.id), event.shiftKey));
			isDraggingNodes = true;
			return;
		}

		if (!event.shiftKey) selection.set({ nodes: [], link: null });
		isPanningSpace = true;
	}

	function handleMouseMove(event: MouseEvent): void {
		const dx = event.clientX - lastX;
		const dy = event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;

		if (linkDrag) {
			linkDrag = { ...linkDrag, to: toLayer(mouseWorld()) };
		} else if (isPanningSpace) {
			panBy(dx, dy);
		} else if (isDraggingNodes) {
			// screen px -> world units; y is subtracted because screen y grows down, world y up
			const ids = $selection.nodes;
			graph.update((g) => moveNodes(g, ids, dx / $camera.zoom, -dy / $camera.zoom));
		}
	}

	function handleMouseUp(event: MouseEvent): void {
		if (linkDrag) finishLinkDrag(event.target as HTMLElement);
		isPanningSpace = false;
		isDraggingNodes = false;
	}

	function handleWheel(event: WheelEvent): void {
		zoomAt(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), { x: event.clientX, y: event.clientY });
	}

	// Link dragging
	// -----------------------------------------------------------------------------------
	function startLinkDrag(port: HTMLElement): void {
		const nodeId = Number(port.dataset.nodeId);
		const kind = port.dataset.portKind as 'input' | 'output';
		const portId = port.dataset.portId!;
		const to = toLayer(mouseWorld());

		const existing =
			kind === 'input' ? findLinkInto($graph, { targetNodeId: nodeId, targetInputId: portId }) : null;
		if (existing) {
			// grabbing a connected input detaches its link and carries it from its output,
			// so it can be dropped on another input or released on empty space to delete it
			graph.update((g) => removeLink(g, existing));
			linkDrag = { nodeId: existing.sourceNodeId, kind: 'output', portId: existing.sourceOutputId, to };
		} else {
			linkDrag = { nodeId, kind, portId, to };
		}
	}

	function finishLinkDrag(dropTarget: HTMLElement | null): void {
		const drag = linkDrag!;
		linkDrag = null;
		const port = dropTarget?.closest<HTMLElement>('.port');
		if (!port) return; // released on empty space: no link

		const nodeId = Number(port.dataset.nodeId);
		const kind = port.dataset.portKind;
		const portId = port.dataset.portId!;
		if (kind === drag.kind) {
			notify('Links go from an output (right) to an input (left)');
		} else if (drag.kind === 'output') {
			connect({ sourceNodeId: drag.nodeId, sourceOutputId: drag.portId, targetNodeId: nodeId, targetInputId: portId });
		} else {
			connect({ sourceNodeId: nodeId, sourceOutputId: portId, targetNodeId: drag.nodeId, targetInputId: drag.portId });
		}
	}

	// Keyboard
	// -----------------------------------------------------------------------------------
	function handleKeydown(event: KeyboardEvent): void {
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, [contenteditable="true"]')) return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;

		const key = event.key.toLowerCase();
		if (key === 'a' && event.shiftKey) {
			event.preventDefault();
			createNodeAt(mouseWorld());
		} else if (key === 'delete' || key === 'backspace') {
			event.preventDefault();
			deleteSelection();
		} else if (key === 'f2') {
			event.preventDefault();
			if ($selection.nodes.length === 1) editingNodeId.set($selection.nodes[0]);
		} else if (key === 'f' && !event.shiftKey) {
			event.preventDefault();
			linkSelectedNodes();
		} else if (key === 'escape') {
			if (linkDrag) linkDrag = null;
			else selection.set({ nodes: [], link: null });
		}
	}

	function deleteSelection(): void {
		const sel = $selection;
		if (sel.link) graph.update((g) => removeLink(g, sel.link!));
		else if (sel.nodes.length) graph.update((g) => removeNodes(g, sel.nodes));
		selection.set({ nodes: [], link: null });
	}

	function linkSelectedNodes(): void {
		const ids = $selection.nodes;
		if (ids.length !== 2) return notify('Select two nodes (Shift+click), then press F');
		const link = quickLink($graph, ids[0], ids[1]);
		if (!link) return notify('No free input to link: each input takes one link');
		connect(link);
	}

	// import export functions
	// -----------------------------------------------------------------------------------
	function exportJSON(): void {
		// always written as the current format version, see docs/graph-format.md
		const jsonString = JSON.stringify(stampCurrentVersion($graph), null, 2);
		const blob = new Blob([jsonString], { type: 'application/json' });
		const url = URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'graph_data.json'; // File name
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
	// Lifecycle functions
	// -----------------------------------------------------------------------------------
	onMount(() => {
		const stopTracking = trackViewport();
		(async () => {
			try {
				const response = await fetch('data/test-node-graph.json');
				// older format versions are upgraded on load; say so, never silently
				const { graph: loaded, fromVersion, applied } = migrateGraph(await response.json());
				if (applied.length > 0) {
					console.info(
						`graph upgraded from v${fromVersion} to v${CURRENT_GRAPH_VERSION}:\n  ` +
							applied.join('\n  ')
					);
				}
				graph.set(loaded);
				selection.set({ nodes: [], link: null });
			} catch (error) {
				// includes GraphFormatError: not a graph file, or from a newer app version
				console.error('Error loading graph:', error);
			}
		})();
		return () => {
			stopTracking();
			clearTimeout(messageTimer);
		};
	});

	// world origin on screen; the world layer is scaled around its top-left corner (0, 0).
	// Inside it CSS y grows down, so nodes are placed at (x, -y) to make world y grow up.
	$: worldTranslateX = $viewport.width / 2 - $camera.x * $camera.zoom;
	$: worldTranslateY = $viewport.height / 2 + $camera.y * $camera.zoom;
</script>

<!-- window-level move/up so a drag keeps working when the mouse leaves the viewport -->
<svelte:window
	on:mousemove={handleMouseMove}
	on:mouseup={handleMouseUp}
	on:keydown={handleKeydown}
/>

<div
	class="viewport no-scroll"
	role="presentation"
	on:mousedown={handleMouseDown}
	on:wheel|nonpassive|preventDefault={handleWheel}
>
	<div class="content-wrapper" class:linking={linkDrag}>
		<div
			class="world"
			style="transform: translate({worldTranslateX}px, {worldTranslateY}px) scale({$camera.zoom});"
		>
			<GraphLinks drag={linkDrag} />
			{#each $graph.data.nodes as node (node._id)}
				<GraphNode {node} selected={$selection.nodes.includes(node._id)} />
			{/each}
		</div>
	</div>
</div>

<UI_GraphEditor on:requestExport={exportJSON} />
<CoordTracker />
<AssistanceMsg />
<PolkaDots />
<!-- development aid: shown with `npm run dev`, left out of production builds -->
{#if dev}
	<OriginAxes />
{/if}

<style>
	/* .centered {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		} */
</style>
