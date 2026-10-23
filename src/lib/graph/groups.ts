// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-23
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// groups.ts -- groups as parents: which nodes a group holds, where its frame is, and the
// operations that keep frames and members right (pure functions, graph in -> graph out).
//
// - Members: a group lists its children's ids in its content (`children`, group type v2);
//   a node is in at most one group; groups may hold groups (nested).
// - Frame: the group's stored rect (position + content width / height, its minimum size)
//   grown to enclose every child with GROUP_MARGIN around it. So the frame never gets smaller
//   than its children, and it grows while a child is dragged outwards. Nested groups are
//   resolved bottom-up (an inner group's frame counts as one child of the outer one).
// - A circle group (content shape "circle") is a round frame: the circle through its children's
//   box corners plus CIRCLE_MARGIN, at least as wide as its stored size; its rect is that
//   circle's bounding square.
// - Moving a group moves its descendants with it (withDescendants); deleting a group keeps
//   its children (they are just no longer in a group).
//
// Node sizes come from the rendered nodes (store `nodeSizes`); before they are measured a
// default size is assumed. World coords, y up: a rect is { x: left, y: top, w, h }, its
// bottom edge at y - h.
//
// Used by: store.ts (frames, removeNodes, pasteNodes), routes/+page.svelte (drag, join /
// leave, resize handle), GraphNode.svelte (drawing), properties/PropsContent.svelte.
// Details: docs/graph-properties-panel.md (Group), docs/graph-editing.md
// -----------------------------------------------------------------------------------------

import type { Graph, GraphNode } from './types';
import { groupSize, GROUP_MIN, nodeShape } from './node-types';

/** Space between a group's frame and the children inside it (world units; 4rem at zoom 1). */
export const GROUP_MARGIN = 64;
/**
 * The same for a circle group, between the circle and its children's corners: smaller, because
 * the circle through the corners already leaves room at the sides (2rem at zoom 1).
 */
export const CIRCLE_MARGIN = 32;
/** Size assumed for a node that hasn't been measured yet (a basic node at zoom 1). */
export const UNMEASURED = { w: 194, h: 60 };

export interface Rect {
	x: number; // left
	y: number; // top (y up)
	w: number;
	h: number;
}
export type Sizes = Record<string, { w: number; h: number }>;

const isGroupNode = (n: GraphNode) => n.type === 'group';

/** The ids a group holds (its content's `children`, only those that still exist); [] for others. */
export function groupChildren(g: Graph, group: GraphNode): string[] {
	if (!isGroupNode(group) || !Array.isArray(group.content.children)) return [];
	const ids = new Set(g.data.nodes.map((n) => n.id));
	return (group.content.children as unknown[]).filter((id): id is string => typeof id === 'string' && ids.has(id) && id !== group.id);
}

/** The group a node is in, or undefined. */
export function parentOf(g: Graph, nodeId: string): GraphNode | undefined {
	return g.data.nodes.find((n) => isGroupNode(n) && groupChildren(g, n).includes(nodeId));
}

/** The given ids plus everything inside the groups among them, nested groups included. */
export function withDescendants(g: Graph, ids: string[]): string[] {
	const out = new Set<string>();
	const visit = (id: string) => {
		if (out.has(id)) return;
		out.add(id);
		const node = g.data.nodes.find((n) => n.id === id);
		if (node) groupChildren(g, node).forEach(visit);
	};
	ids.forEach(visit);
	return [...out];
}

/**
 * The frame of every group: its stored rect grown to enclose its children with GROUP_MARGIN
 * around them; nested groups bottom-up. A loop of groups holding each other is cut.
 */
export function groupFrames(g: Graph, sizes: Sizes): Record<string, Rect> {
	const frames: Record<string, Rect> = {};
	const busy = new Set<string>();
	const byId = new Map(g.data.nodes.map((n) => [n.id, n]));

	const rectOf = (node: GraphNode): Rect => {
		if (isGroupNode(node)) return frameOf(node);
		const size = sizes[node.id] ?? UNMEASURED;
		return { x: node.position.x, y: node.position.y, w: size.w, h: size.h };
	};

	function frameOf(group: GraphNode): Rect {
		if (frames[group.id]) return frames[group.id];
		if (nodeShape(group) === 'circle') return (frames[group.id] = circleFrame(group));
		const own = groupSize(group);
		let left = group.position.x;
		let top = group.position.y;
		let right = left + own.w;
		let bottom = top - own.h;
		if (!busy.has(group.id)) {
			busy.add(group.id);
			for (const id of groupChildren(g, group)) {
				const child = byId.get(id);
				if (!child || busy.has(id)) continue;
				const r = rectOf(child);
				left = Math.min(left, r.x - GROUP_MARGIN);
				right = Math.max(right, r.x + r.w + GROUP_MARGIN);
				top = Math.max(top, r.y + GROUP_MARGIN);
				bottom = Math.min(bottom, r.y - r.h - GROUP_MARGIN);
			}
			busy.delete(group.id);
		}
		return (frames[group.id] = { x: left, y: top, w: right - left, h: top - bottom });
	}

	// the circle through the children's box corners plus CIRCLE_MARGIN, never smaller than the
	// stored size; without children the stored size as a circle at the stored top-left corner
	function circleFrame(group: GraphNode): Rect {
		const own = groupSize(group);
		const side = Math.max(own.w, own.h);
		const box = childrenBox(group, 0);
		if (!box) return { x: group.position.x, y: group.position.y, w: side, h: side };
		const d = Math.max(Math.hypot(box.right - box.left, box.top - box.bottom) + 2 * CIRCLE_MARGIN, side);
		const cx = (box.left + box.right) / 2;
		const cy = (box.top + box.bottom) / 2;
		return { x: cx - d / 2, y: cy + d / 2, w: d, h: d };
	}

	// the box around a group's children, grown by `margin`; null when it holds nothing
	function childrenBox(group: GraphNode, margin: number): { left: number; right: number; top: number; bottom: number } | null {
		if (busy.has(group.id)) return null;
		busy.add(group.id);
		let left = Infinity;
		let right = -Infinity;
		let top = -Infinity;
		let bottom = Infinity;
		for (const id of groupChildren(g, group)) {
			const child = byId.get(id);
			if (!child || busy.has(id)) continue;
			const r = rectOf(child);
			left = Math.min(left, r.x - margin);
			right = Math.max(right, r.x + r.w + margin);
			top = Math.max(top, r.y + margin);
			bottom = Math.min(bottom, r.y - r.h - margin);
		}
		busy.delete(group.id);
		return left === Infinity ? null : { left, right, top, bottom };
	}

	g.data.nodes.filter(isGroupNode).forEach(frameOf);
	return frames;
}

/**
 * The smallest size a group may have: from its frame's top-left corner to its children's far
 * edges plus the margin; GROUP_MIN when it holds nothing.
 */
export function minGroupSize(g: Graph, groupId: string, sizes: Sizes): { w: number; h: number } {
	const group = g.data.nodes.find((n) => n.id === groupId);
	const frames = groupFrames(g, sizes);
	const frame = frames[groupId];
	if (!group || !frame) return { w: GROUP_MIN, h: GROUP_MIN };
	let right = -Infinity;
	let bottom = Infinity;
	for (const id of groupChildren(g, group)) {
		const child = g.data.nodes.find((n) => n.id === id)!;
		const size = sizes[id] ?? UNMEASURED;
		const r = frames[id] ?? { x: child.position.x, y: child.position.y, w: size.w, h: size.h };
		right = Math.max(right, r.x + r.w + GROUP_MARGIN);
		bottom = Math.min(bottom, r.y - r.h - GROUP_MARGIN);
	}
	if (right === -Infinity) return { w: GROUP_MIN, h: GROUP_MIN };
	if (nodeShape(group) === 'circle') {
		// the circle through the children's box corners plus CIRCLE_MARGIN, whatever the stored size
		let left = Infinity;
		let top = -Infinity;
		let r2 = -Infinity;
		let b2 = Infinity;
		for (const id of groupChildren(g, group)) {
			const child = g.data.nodes.find((n) => n.id === id)!;
			const size = sizes[id] ?? UNMEASURED;
			const r = frames[id] ?? { x: child.position.x, y: child.position.y, w: size.w, h: size.h };
			left = Math.min(left, r.x);
			top = Math.max(top, r.y);
			r2 = Math.max(r2, r.x + r.w);
			b2 = Math.min(b2, r.y - r.h);
		}
		const d = Math.max(GROUP_MIN, Math.hypot(r2 - left, top - b2) + 2 * CIRCLE_MARGIN);
		return { w: d, h: d };
	}
	return { w: Math.max(GROUP_MIN, right - frame.x), h: Math.max(GROUP_MIN, frame.y - bottom) };
}

/**
 * Resizes a group (resize handle, Properties panel): its top-left corner becomes its current
 * frame's top-left, its size the given one but never smaller than its children plus the margin
 * (minGroupSize). Returns the same graph when nothing changes.
 */
export function resizeGroup(g: Graph, groupId: string, size: { w: number; h: number }, sizes: Sizes): Graph {
	const group = g.data.nodes.find((n) => n.id === groupId);
	if (!group || !isGroupNode(group)) return g;
	const frame = groupFrames(g, sizes)[groupId];
	const min = minGroupSize(g, groupId, sizes);
	// a circle keeps one diameter: the larger of the two
	const circle = nodeShape(group) === 'circle';
	const wanted = circle ? { w: Math.max(size.w, size.h), h: Math.max(size.w, size.h) } : size;
	const w = Math.round(Math.max(min.w, wanted.w));
	const h = Math.round(Math.max(min.h, wanted.h));
	const own = groupSize(group);
	if (group.position.x === frame.x && group.position.y === frame.y && own.w === w && own.h === h) return g;
	return {
		...g,
		data: {
			...g.data,
			nodes: g.data.nodes.map((n) =>
				n.id === groupId ? { ...n, position: { x: frame.x, y: frame.y }, content: { ...n.content, width: w, height: h } } : n
			)
		}
	};
}

/**
 * Moves nodes into a group, or out of every group (groupId null): each node leaves the group it
 * was in. A group never goes into itself or into a group inside it. Same graph when nothing
 * changes.
 */
export function setGroupMembership(g: Graph, nodeIds: string[], groupId: string | null): Graph {
	const target = groupId ? g.data.nodes.find((n) => n.id === groupId && isGroupNode(n)) : undefined;
	if (groupId && !target) return g;
	// a group can't go into itself or its own descendants
	const moving = nodeIds.filter((id) => !target || !withDescendants(g, [id]).includes(target.id));
	if (!moving.length) return g;
	const set = new Set(moving);
	let changed = false;
	const nodes = g.data.nodes.map((n) => {
		if (!isGroupNode(n)) return n;
		const before = groupChildren(g, n);
		let after = before.filter((id) => !set.has(id));
		if (target && n.id === target.id) after = [...after, ...moving.filter((id) => !after.includes(id))];
		if (after.length === before.length && after.every((id, i) => id === before[i])) return n;
		changed = true;
		return { ...n, content: { ...n.content, children: after } };
	});
	return changed ? { ...g, data: { ...g.data, nodes } } : g;
}

/**
 * The innermost group whose frame holds a point (world coords), leaving out the given ids
 * (e.g. the nodes being dragged and what they contain); undefined when none does.
 */
export function groupAt(g: Graph, frames: Record<string, Rect>, at: { x: number; y: number }, skip: string[]): GraphNode | undefined {
	const hits = g.data.nodes.filter((n) => {
		const f = frames[n.id];
		return isGroupNode(n) && f && !skip.includes(n.id) && at.x >= f.x && at.x <= f.x + f.w && at.y <= f.y && at.y >= f.y - f.h;
	});
	// innermost: the smallest frame
	return hits.sort((a, b) => frames[a.id].w * frames[a.id].h - frames[b.id].w * frames[b.id].h)[0];
}

/** Drops ids that no longer exist from every group's children (after a delete). */
export function pruneChildren(g: Graph): Graph {
	let changed = false;
	const nodes = g.data.nodes.map((n) => {
		if (!isGroupNode(n) || !Array.isArray(n.content.children)) return n;
		const kept = groupChildren(g, n);
		if (kept.length === (n.content.children as unknown[]).length) return n;
		changed = true;
		return { ...n, content: { ...n.content, children: kept } };
	});
	return changed ? { ...g, data: { ...g.data, nodes } } : g;
}
