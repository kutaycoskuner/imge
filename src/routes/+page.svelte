<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-17
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Graph editor, the site's home page (/; /graph_editor redirects here): loads the base
	// graph (upgraded to the current format version by $lib/graph/migrations.ts) into the
	// graph store and turns mouse and keyboard input into camera moves and graph edits:
	//   mouse  drag empty space = pan, Shift+drag empty space = box select (adds every node the
	//          box touches), wheel = zoom to cursor, click/Shift+click = select,
	//          drag node = move (all selected; snaps to half grid squares unless the toolbar
	//          turned snapping off, Alt = free), drag from a port = link, drag a linked
	//          input's end away = detach
	//   keys   Shift+N new graph, Shift+A add node at mouse, Delete/Backspace delete selection, F2 rename,
	//          F link two selected nodes, L / D / R next shape / arrow / route of the selected
	//          link, F2 or double-click renames a link (drag a selected
	//          manhattan link's middle segment to move its corner), +/- zoom, Home fit graph, Ctrl+S save,
	//          Ctrl+Shift+S download, Esc cancel a link drag or box selection (otherwise it opens
	//          the menu)
	// It also puts GraphEditorMenu into the Esc menu (open/save on the computer) and tracks
	// unsaved changes for it. Graph operations and link rules live in $lib/graph/store.ts,
	// files in $lib/graph/file-access.ts, world <-> screen math in $lib/camera.ts; see
	// docs/graph-editor-canvas.md, docs/graph-editing.md, docs/graph-saving.md.
	import PolkaDots from '$lib/components/PolkaDots.svelte';
	import OriginAxes from '$lib/components/OriginAxes.svelte';
	import UI_GraphEditor from '$lib/components/UI_GraphEditor.svelte';
	import CoordTracker from '$lib/components/CoordTracker.svelte';
	import AssistanceMsg from '$lib/components/AssistanceMsg.svelte';
	import GraphNode from '$lib/components/GraphNode.svelte';
	import GraphLinks from '$lib/components/GraphLinks.svelte';
	import GraphEditorMenu from '$lib/components/GraphEditorMenu.svelte';
	import GraphExamplesMenu from '$lib/components/GraphExamplesMenu.svelte';
	import GraphKeysMenu from '$lib/components/GraphKeysMenu.svelte';
	import { onMount, tick } from 'svelte';
	import { dev } from '$app/environment';
	import {
		camera,
		viewport,
		panBy,
		zoomAt,
		trackViewport,
		screenToWorld,
		fitBounds,
		resetCamera,
		snapStep,
		ZOOM_STEP
	} from '$lib/camera';
	import type { Point } from '$lib/camera';
	import {
		workspace,
		initWorkspace,
		loadGraph,
		trackChanges,
		downloadGraph,
		save,
		newGraph
	} from '$lib/graph/file-access';
	import {
		graph,
		selection,
		editingNodeId,
		addLink,
		removeLink,
		removeNodes,
		moveNodes,
		linksInto,
		quickLink,
		selectNode,
		selectBox,
		createNodeAt,
		cycleLinkShape,
		cycleLinkArrow,
		toggleLinkRoute,
		findBackLinks,
		setLinkBend,
		snapToGrid,
		persistViewSettings,
		linkShapeOverride,
		linkArrowOverride,
		editingLinkId,
		type LinkOutcome,
		type Selection
	} from '$lib/graph/store';
	import type { Link, LinkEnd } from '$lib/graph/types';
	import { assistanceMsg, menuOpen, menuTab, pageMenu } from '../stores/imge_main';

	// exp() turns wheel delta into a smooth factor for both mouse wheels and trackpads
	const WHEEL_ZOOM_SPEED = 0.0015;
	const MESSAGE_DURATION_MS = 2500;

	let isPanningSpace = false;
	// box selection (Shift+drag on empty space): where it started and where the mouse is now,
	// both in screen px, and the selection it adds to
	let boxDrag: { start: Point; end: Point; base: Selection } | null = null;
	// a box smaller than this (screen px) is a Shift+click on empty space: it keeps the selection
	const BOX_MIN_SIZE = 4;
	// node drag: the grabbed node and where it and the mouse started (world coords); its
	// top-left corner follows the mouse snapped to half grid squares, the rest of the
	// selection moves by the same amount so their layout is kept
	let nodeDrag: { nodeId: string; start: Point; mouseStart: Point } | null = null;

	// corner of a selected manhattan link (or the lane of a link going around its nodes) being
	// dragged: the bend maps `from` (0) .. `to` (1)
	// along `axis` in world-layer CSS coords (read from the grab area's data-* attributes)
	let bendDrag: { linkId: string; axis: 'x' | 'y'; from: number; to: number } | null = null;

	// link being dragged from a port; `to` is the mouse in world-layer CSS coords; `carried`
	// is the link picked up from a connected input (re-routed links keep their id and name)
	let linkDrag: {
		nodeId: string;
		kind: 'input' | 'output';
		portId: string;
		to: Point;
		carried?: Link;
	} | null = null;

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
		exists: 'That link already exists',
		'unknown-port': 'Links go from an output (right) to an input (left)'
	};

	function connect(
		link: Pick<Link, 'source' | 'target'> & Partial<Pick<Link, 'id' | 'type' | 'name' | 'shape' | 'bend' | 'arrow' | 'route'>>
	): void {
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

		const bendHandle = target.closest<SVGElement>('.link-bend');
		if (bendHandle) {
			const { linkId, axis, from, to } = bendHandle.dataset;
			bendDrag = { linkId: linkId!, axis: axis as 'x' | 'y', from: Number(from), to: Number(to) };
			return;
		}

		const linkHit = target.closest<SVGElement>('.link-hit');
		if (linkHit) {
			selection.set({ nodes: [], link: linkHit.dataset.linkId! });
			return;
		}

		const nodeElement = target.closest<HTMLElement>('.node');
		if (nodeElement) {
			const nodeId = nodeElement.dataset.id!;
			selection.update((sel) => selectNode(sel, nodeId, event.shiftKey));
			const grabbed = $graph.data.nodes.find((n) => n.id === nodeId);
			// Shift+click on a selected node deselects it: nothing to drag then
			if (grabbed && $selection.nodes.includes(nodeId)) nodeDrag = { nodeId, start: { ...grabbed.position }, mouseStart: mouseWorld() };
			return;
		}

		if (event.shiftKey) {
			const start = { x: event.clientX, y: event.clientY };
			boxDrag = { start, end: start, base: $selection };
			return;
		}
		selection.set({ nodes: [], link: null });
		isPanningSpace = true;
	}

	function handleMouseMove(event: MouseEvent): void {
		const dx = event.clientX - lastX;
		const dy = event.clientY - lastY;
		lastX = event.clientX;
		lastY = event.clientY;

		if (linkDrag) {
			linkDrag = { ...linkDrag, to: toLayer(mouseWorld()) };
		} else if (bendDrag) {
			const drag = bendDrag;
			const mouse = toLayer(mouseWorld());
			const span = drag.to - drag.from;
			if (span !== 0) {
				const bend = ((drag.axis === 'x' ? mouse.x : mouse.y) - drag.from) / span;
				graph.update((g) => setLinkBend(g, drag.linkId, bend));
			}
		} else if (boxDrag) {
			boxDrag = { ...boxDrag, end: { x: event.clientX, y: event.clientY } };
			updateBoxSelection(boxDrag);
		} else if (isPanningSpace) {
			panBy(dx, dy);
		} else if (nodeDrag) {
			dragNodes(nodeDrag, event.altKey || !$snapToGrid);
		}
	}

	function handleMouseUp(event: MouseEvent): void {
		if (linkDrag) finishLinkDrag(event.target as HTMLElement);
		isPanningSpace = false;
		nodeDrag = null;
		bendDrag = null;
		boxDrag = null;
	}

	// double-click on a link: edit its name (node names handle their own double-click)
	function handleDoubleClick(event: MouseEvent): void {
		const linkHit = (event.target as Element).closest<SVGElement>('.link-hit');
		if (!linkHit) return;
		selection.set({ nodes: [], link: linkHit.dataset.linkId! });
		editingLinkId.set(linkHit.dataset.linkId!);
	}

	function handleWheel(event: WheelEvent): void {
		zoomAt(Math.exp(-event.deltaY * WHEEL_ZOOM_SPEED), { x: event.clientX, y: event.clientY });
	}

	// Node dragging
	// -----------------------------------------------------------------------------------
	// Places the grabbed node where the mouse has carried it since the drag began (snapped
	// unless Alt is held or snapping is turned off) and moves the other selected nodes by the same amount. Working from
	// the start position, not per-frame deltas, keeps the node under the mouse while snapping.
	function dragNodes(drag: NonNullable<typeof nodeDrag>, free: boolean): void {
		const mouse = mouseWorld();
		const step = snapStep($camera.zoom);
		const snap = (v: number): number => (free ? v : Math.round(v / step) * step);
		const target = {
			x: snap(drag.start.x + mouse.x - drag.mouseStart.x),
			y: snap(drag.start.y + mouse.y - drag.mouseStart.y)
		};
		const current = $graph.data.nodes.find((n) => n.id === drag.nodeId)?.position;
		if (!current || (current.x === target.x && current.y === target.y)) return;
		const ids = $selection.nodes;
		graph.update((g) => moveNodes(g, ids, target.x - current.x, target.y - current.y));
	}

	// Box selection
	// -----------------------------------------------------------------------------------
	// the box as a screen rectangle, whichever way it was dragged
	function boxRect(box: NonNullable<typeof boxDrag>) {
		const left = Math.min(box.start.x, box.end.x);
		const top = Math.min(box.start.y, box.end.y);
		return { left, top, width: Math.abs(box.end.x - box.start.x), height: Math.abs(box.end.y - box.start.y) };
	}

	// Selects the nodes that were selected when the drag began plus every node the box touches
	// (partly inside is enough). Nodes are measured on screen, so pan, zoom and the title's
	// length are already in their rectangles.
	function updateBoxSelection(box: NonNullable<typeof boxDrag>): void {
		window.getSelection()?.removeAllRanges(); // Shift+drag would otherwise also select page text
		const rect = boxRect(box);
		if (rect.width < BOX_MIN_SIZE && rect.height < BOX_MIN_SIZE) return selection.set(box.base);
		const right = rect.left + rect.width;
		const bottom = rect.top + rect.height;
		const hits: string[] = [];
		for (const el of document.querySelectorAll<HTMLElement>('.world .node')) {
			const r = el.getBoundingClientRect();
			if (r.left <= right && r.right >= rect.left && r.top <= bottom && r.bottom >= rect.top) hits.push(el.dataset.id!);
		}
		selection.set(selectBox(box.base, hits));
	}

	// Link dragging
	// -----------------------------------------------------------------------------------
	function startLinkDrag(port: HTMLElement): void {
		const nodeId = port.dataset.nodeId!;
		const kind = port.dataset.portKind as 'input' | 'output';
		const portId = port.dataset.portId!;
		const to = toLayer(mouseWorld());

		// grabbing a connected input picks up its most recent link and carries it from its output,
		// so it can be dropped on another input or released on empty space to delete it
		const existing = kind === 'input' ? linksInto($graph, { node: nodeId, port: portId }).at(-1) : undefined;
		if (existing) {
			graph.update((g) => removeLink(g, existing.id));
			linkDrag = { nodeId: existing.source.node, kind: 'output', portId: existing.source.port, to, carried: existing };
		} else {
			linkDrag = { nodeId, kind, portId, to };
		}
	}

	function finishLinkDrag(dropTarget: HTMLElement | null): void {
		const drag = linkDrag!;
		linkDrag = null;
		const port = dropTarget?.closest<HTMLElement>('.port');
		if (!port) return; // released on empty space: no link

		const nodeId = port.dataset.nodeId!;
		const kind = port.dataset.portKind;
		const portId = port.dataset.portId!;
		if (kind === drag.kind) {
			notify('Links go from an output (right) to an input (left)');
		} else if (drag.kind === 'output') {
			connect({
				...(drag.carried
					? {
							id: drag.carried.id,
							type: drag.carried.type,
							name: drag.carried.name,
							shape: drag.carried.shape,
							bend: drag.carried.bend,
							arrow: drag.carried.arrow,
							route: drag.carried.route
						}
					: {}),
				source: { node: drag.nodeId, port: drag.portId },
				target: { node: nodeId, port: portId }
			});
		} else {
			connect({ source: { node: nodeId, port: portId }, target: { node: drag.nodeId, port: drag.portId } });
		}
	}

	// Keyboard
	// -----------------------------------------------------------------------------------
	// runs in the capture phase, before the Esc menu's own listener, so an Esc that cancels
	// something here can call preventDefault and keep the menu closed
	function handleKeydown(event: KeyboardEvent): void {
		// Ctrl+S / Ctrl+Shift+S (Cmd on a Mac) work everywhere, also in the menu and while
		// typing, and always replace the browser's own "save page"
		if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') {
			event.preventDefault();
			if (event.shiftKey) downloadGraph();
			else saveShortcut();
			return;
		}

		if ($menuOpen) return; // the menu has the keyboard; Esc closes it
		const target = event.target as HTMLElement;
		if (target.closest('input, textarea, [contenteditable="true"]')) return;
		if (event.ctrlKey || event.metaKey || event.altKey) return;

		const key = event.key.toLowerCase();
		if (key === '+' || key === '=') {
			// "=" is the unshifted "+" key on most layouts; numpad "+" also arrives as "+"
			event.preventDefault();
			zoomAt(ZOOM_STEP);
		} else if (key === '-') {
			event.preventDefault();
			zoomAt(1 / ZOOM_STEP);
		} else if (key === 'home') {
			event.preventDefault();
			fitGraphInView();
		} else if (key === 'n' && event.shiftKey) {
			// Shift+N: Ctrl+Shift+N belongs to the browser (private / closed window) and never arrives
			event.preventDefault();
			newGraph();
		} else if (key === 'a' && event.shiftKey) {
			event.preventDefault();
			createNodeAt(mouseWorld());
		} else if (key === 'delete' || key === 'backspace') {
			event.preventDefault();
			deleteSelection();
		} else if (key === 'f2') {
			event.preventDefault();
			if ($selection.nodes.length === 1) editingNodeId.set($selection.nodes[0]);
			else if ($selection.link) editingLinkId.set($selection.link);
		} else if (key === 'd' && !event.shiftKey) {
			event.preventDefault();
			cycleSelectedLinkArrow();
		} else if (key === 'r' && !event.shiftKey) {
			event.preventDefault();
			toggleSelectedLinkRoute();
		} else if (key === 'l' && !event.shiftKey) {
			event.preventDefault();
			cycleSelectedLinkShape();
		} else if (key === 'f' && !event.shiftKey) {
			event.preventDefault();
			linkSelectedNodes();
		} else if (key === 'escape' && linkDrag) {
			event.preventDefault(); // cancel the drag only; without a drag Esc opens the menu
			linkDrag = null;
		} else if (key === 'escape' && boxDrag) {
			event.preventDefault(); // cancel the box: back to the selection it started from
			selection.set(boxDrag.base);
			boxDrag = null;
		}
	}

	// Ctrl+S: save to the graph's file (written into the folder, or downloaded in a read-only
	// folder); a graph without a file yet opens the menu, where Save as names it
	function saveShortcut(): void {
		if ($workspace.fileName) {
			save();
		} else {
			menuTab.set('config'); // where Save as and the folder are
			menuOpen.set(true);
			notify('Not saved yet: choose a folder or use Save as');
		}
	}

	// L: next shape for the selected link (spline -> line -> manhattan), saved in the link
	// D: next arrow for the selected link (forward -> both -> backward -> none), saved in the link
	function cycleSelectedLinkArrow(): void {
		const linkId = $selection.link;
		if (!linkId) return notify('Select a link, then press [D] to change its arrow');
		graph.update((g) => cycleLinkArrow(g, linkId));
		const arrow = $graph.data.links.find((l) => l.id === linkId)?.arrow;
		notify($linkArrowOverride ? `Arrow: ${arrow} (hidden by the display override)` : `Arrow: ${arrow}`);
	}

	// R: flips the side a cycle-closing link or self-loop goes around (above / below)
	function toggleSelectedLinkRoute(): void {
		const linkId = $selection.link;
		if (!linkId) return notify('Select a link, then press [R] to route it above or below');
		graph.update((g) => toggleLinkRoute(g, linkId));
		const link = $graph.data.links.find((l) => l.id === linkId)!;
		const goesAround = link.source.node === link.target.node || findBackLinks($graph).has(linkId);
		notify(
			goesAround
				? `Route: ${link.route}`
				: `Route: ${link.route} (used when the link closes a cycle or loops back to its node)`
		);
	}

	function cycleSelectedLinkShape(): void {
		const linkId = $selection.link;
		if (!linkId) return notify('Select a link, then press [L] to change its shape');
		graph.update((g) => cycleLinkShape(g, linkId));
		const shape = $graph.data.links.find((l) => l.id === linkId)?.shape;
		notify($linkShapeOverride ? `Link shape: ${shape} (hidden by the display override)` : `Link shape: ${shape}`);
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
		if (!link) return notify('These nodes are already linked (or have no output / input)');
		connect(link);
	}

	// Lifecycle functions
	// -----------------------------------------------------------------------------------
	onMount(() => {
		const stopTracking = trackViewport();
		const stopChangeTracking = trackChanges();
		const stopOverride = persistViewSettings();
		pageMenu.set({
			title: 'Graph editor',
			tabs: [
				{ id: 'config', label: 'Config', component: GraphEditorMenu },
				{ id: 'examples', label: 'Examples', component: GraphExamplesMenu },
				{ id: 'keys', label: 'Keybindings', component: GraphKeysMenu }
			]
		});
		(async () => {
			await initWorkspace();
			try {
				// the base graph (feature map); a graph from the user's folder is opened via the menu
				const response = await fetch('data/test-node-graph.json');
				loadGraph(await response.json(), null);
			} catch (error) {
				// includes GraphFormatError: not a graph file, or from a newer app version
				console.error('Error loading graph:', error);
			}
		})();
		return () => {
			stopTracking();
			stopChangeTracking();
			stopOverride();
			clearTimeout(messageTimer);
			pageMenu.set(null);
			menuOpen.set(false);
		};
	});

	// world origin on screen; the world layer is scaled around its top-left corner (0, 0).
	// Inside it CSS y grows down, so nodes are placed at (x, -y) to make world y grow up.
	$: worldTranslateX = $viewport.width / 2 - $camera.x * $camera.zoom;
	$: worldTranslateY = $viewport.height / 2 + $camera.y * $camera.zoom;

	// Fit to graph
	// -----------------------------------------------------------------------------------
	// Shows the whole graph: the box around all nodes, measured from the rendered elements
	// (their size depends on the title), so every node is fully visible. An empty graph
	// goes back to the origin at zoom 1. Runs after each load and from the toolbar.
	async function fitGraphInView(): Promise<void> {
		await tick(); // the loaded graph's nodes must be in the DOM to be measured
		const nodes = $graph.data.nodes;
		if (nodes.length === 0) return resetCamera();

		let minX = Infinity,
			minY = Infinity,
			maxX = -Infinity,
			maxY = -Infinity;
		for (const node of nodes) {
			const el = document.querySelector<HTMLElement>(`.world .node[data-id="${node.id}"]`);
			// offsetWidth/Height ignore the zoom transform, so they are world units
			const width = el?.offsetWidth ?? 0;
			const height = el?.offsetHeight ?? 0;
			minX = Math.min(minX, node.position.x);
			maxX = Math.max(maxX, node.position.x + width);
			maxY = Math.max(maxY, node.position.y); // position is the top-left corner, y up
			minY = Math.min(minY, node.position.y - height);
		}
		fitBounds({ minX, minY, maxX, maxY });
	}

	// fit each newly loaded graph (the base graph, or one opened from the menu)
	let fittedLoads = 0;
	$: if ($workspace.loads !== fittedLoads) {
		fittedLoads = $workspace.loads;
		fitGraphInView();
	}

	// switching the direction turns the layout (menu, setDirection); show all of it again
	$: direction = $graph.metadata.direction;
	let fittedDirection: string | undefined;
	$: if (direction !== fittedDirection) {
		const changed = fittedDirection !== undefined;
		fittedDirection = direction;
		if (changed) fitGraphInView();
	}
</script>

<!-- window-level move/up so a drag keeps working when the mouse leaves the viewport -->
<svelte:window
	on:mousemove={handleMouseMove}
	on:mouseup={handleMouseUp}
	on:keydown|capture={handleKeydown}
/>

<div
	class="viewport no-scroll"
	role="presentation"
	on:mousedown={handleMouseDown}
	on:wheel|nonpassive|preventDefault={handleWheel}
	on:dblclick={handleDoubleClick}
>
	<div class="content-wrapper" class:linking={linkDrag}>
		<div
			class="world"
			class:top-to-bottom={direction === 'top-to-bottom'}
			style="transform: translate({worldTranslateX}px, {worldTranslateY}px) scale({$camera.zoom});"
		>
			<GraphLinks drag={linkDrag} />
			{#each $graph.data.nodes as node (node.id)}
				<GraphNode {node} selected={$selection.nodes.includes(node.id)} />
			{/each}
		</div>
	</div>
</div>

{#if boxDrag}
	{@const rect = boxRect(boxDrag)}
	<div
		class="select-box"
		style="left: {rect.left}px; top: {rect.top}px; width: {rect.width}px; height: {rect.height}px;"
	></div>
{/if}

<UI_GraphEditor on:requestExport={downloadGraph} on:requestFit={fitGraphInView} />
<CoordTracker />
<AssistanceMsg />
<PolkaDots />
<!-- development aid: shown with `npm run dev`, left out of production builds -->
{#if dev}
	<OriginAxes />
{/if}

<style>
	/* box selection (Shift+drag on empty space), drawn in screen px above the graph */
	.select-box {
		position: fixed;
		z-index: 20;
		pointer-events: none;
		border: 1px solid var(--col-selected);
		background: color-mix(in srgb, var(--col-selected) 12%, transparent);
		border-radius: 2px;
	}
	/* .centered {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
		} */
</style>
