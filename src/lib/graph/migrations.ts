// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// migrations.ts -- upgrades graph files of any older format version to the current one.
//
// Each adapter turns version n into n+1; migrateGraph() runs them in order (0->1->2 ...),
// so a file of any age reaches CURRENT_GRAPH_VERSION. A released adapter is never edited:
// files already upgraded by it would no longer match, so every change gets a new adapter.
// Files from a newer app, or that aren't graph files, are refused with GraphFormatError
// instead of being guessed at.
//
// Used by: routes/+page.svelte (load and export).
// Adding a version: docs/graph-format.md, "Adding a new version".
// -----------------------------------------------------------------------------------------

import {
	GRAPH_FORMAT,
	type Graph,
	type GraphV0,
	type GraphV1,
	type GraphV2,
	type GraphV3,
	type GraphV4,
	type PortV1
} from './types';

export const CURRENT_GRAPH_VERSION = 4;

export class GraphFormatError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'GraphFormatError';
	}
}

interface Migration {
	from: number;
	to: number;
	description: string; // shown in the load log, so say what changes for the user
	migrate: (graph: any) => any;
}

// -----------------------------------------------------------------------------------------
// adapters, oldest first
// -----------------------------------------------------------------------------------------
const MIGRATIONS: Migration[] = [
	{
		from: 0,
		to: 1,
		description: 'add metadata.format/version; flip y to point up',
		migrate: (graph: GraphV0): GraphV1 => ({
			...graph,
			metadata: { ...graph.metadata, format: GRAPH_FORMAT, version: 1 },
			data: {
				...graph.data,
				nodes: graph.data.nodes.map((node) => ({
					...node,
					// 0 - y instead of -y: avoids -0 in the output
					position: { ...node.position, y: 0 - node.position.y }
				}))
			}
		})
	},
	{
		from: 1,
		to: 2,
		description:
			'ids renumbered (nodes n1.., links l1.., inputs i1.., outputs o1..), title -> name, ports on the node, links get source/target',
		migrate: (graph: GraphV1): GraphV2 => {
			// everything is renumbered by position: nodes n1, n2 ... in file order, each
			// node's inputs i1, i2 ... and outputs o1, o2 ...; the maps let link ends follow
			const nodeIds = new Map<number, string>();
			const portIds = new Map<string, string>(); // "<old node>:<i|o>:<old port>" -> new port
			const rename = (oldNode: number, ports: PortV1[], prefix: 'i' | 'o') =>
				ports.map((port, i) => {
					const id = `${prefix}${i + 1}`;
					portIds.set(`${oldNode}:${prefix}:${port.id}`, id);
					return { ...port, id };
				});
			const nodes = graph.data.nodes.map(({ _id, data, ...rest }, i) => {
				nodeIds.set(_id, `n${i + 1}`);
				return {
					...rest, // type, position and any extra keys carry over
					id: `n${i + 1}`,
					name: data.title,
					inputs: rename(_id, data.inputs, 'i'),
					outputs: rename(_id, data.outputs, 'o')
				};
			});
			// an end pointing at a missing node or port keeps its old id (as text), so nothing is lost
			const end = (oldNode: number, prefix: 'i' | 'o', oldPort: string) => ({
				node: nodeIds.get(oldNode) ?? String(oldNode),
				port: portIds.get(`${oldNode}:${prefix}:${oldPort}`) ?? oldPort
			});
			return {
				...graph,
				metadata: { ...graph.metadata, format: GRAPH_FORMAT, version: 2 },
				data: {
					...graph.data,
					nodes,
					links: graph.data.links.map((link, i) => ({
						id: `l${i + 1}`,
						type: 'basic',
						source: end(link.sourceNodeId, 'o', link.sourceOutputId),
						target: end(link.targetNodeId, 'i', link.targetInputId)
					}))
				}
			};
		}
	},
	{
		from: 2,
		to: 3,
		description: 'nodes get color (none), links get shape (spline, as drawn so far)',
		migrate: (graph: GraphV2): GraphV3 => ({
			...graph,
			metadata: { ...graph.metadata, format: GRAPH_FORMAT, version: 3 },
			data: {
				...graph.data,
				// a color some file already carried as an extra key is kept
				nodes: graph.data.nodes.map((node) => ({ ...node, color: (node as any).color ?? null })),
				links: graph.data.links.map((link) => ({ ...link, shape: 'spline' }))
			}
		})
	},
	{
		from: 3,
		to: 4,
		description: 'links get arrow (none, as drawn so far) and route (above) for cycle-closing links',
		migrate: (graph: GraphV3): GraphV4 => ({
			...graph,
			metadata: { ...graph.metadata, format: GRAPH_FORMAT, version: 4 },
			data: {
				...graph.data,
				// values a file already carried as extra keys are kept
				links: graph.data.links.map((link) => ({
					...link,
					arrow: (link as any).arrow ?? 'none',
					route: (link as any).route ?? 'above'
				}))
			}
		})
	}
];

/**
 * Reads the format version of a parsed graph file.
 *
 * Returns:
 *     The version; 0 for unversioned files (no metadata.format and no metadata.version).
 *
 * Raises:
 *     GraphFormatError: not a graph file, another format, or an invalid version value.
 */
export function readGraphVersion(raw: unknown): number {
	const doc = raw as any;
	if (!doc || typeof doc !== 'object' || !Array.isArray(doc.data?.nodes)) {
		throw new GraphFormatError('not a graph file: data.nodes is missing');
	}
	const format = doc.metadata?.format;
	const version = doc.metadata?.version;
	if (format === undefined && version === undefined) return 0;
	if (format !== GRAPH_FORMAT) {
		throw new GraphFormatError(`unknown format "${format}", expected "${GRAPH_FORMAT}"`);
	}
	if (!Number.isInteger(version) || version < 1) {
		throw new GraphFormatError(`invalid format version: ${JSON.stringify(version)}`);
	}
	return version;
}

/**
 * Upgrades a parsed graph file to CURRENT_GRAPH_VERSION; the input is not changed.
 *
 * Returns:
 *     The upgraded graph, the version it was read as, and the description of every
 *     adapter that ran (empty when the file was already current).
 *
 * Raises:
 *     GraphFormatError: see readGraphVersion(); also for files newer than this app or a
 *         missing adapter in the chain.
 */
export function migrateGraph(raw: unknown): {
	graph: Graph;
	fromVersion: number;
	applied: string[];
} {
	const fromVersion = readGraphVersion(raw);
	if (fromVersion > CURRENT_GRAPH_VERSION) {
		throw new GraphFormatError(
			`graph version ${fromVersion} is newer than this app supports (${CURRENT_GRAPH_VERSION})`
		);
	}

	let graph: any = structuredClone(raw);
	let version = fromVersion;
	const applied: string[] = [];
	while (version < CURRENT_GRAPH_VERSION) {
		const step = MIGRATIONS.find((m) => m.from === version);
		if (!step) throw new GraphFormatError(`no adapter from version ${version}`);
		graph = step.migrate(graph);
		applied.push(`v${step.from} -> v${step.to}: ${step.description}`);
		version = step.to;
	}
	return { graph, fromVersion, applied };
}

/** Returns a copy of the graph with metadata stamped as the current format version, for export. */
export function stampCurrentVersion(graph: Graph): Graph {
	return {
		...graph,
		metadata: { ...graph.metadata, format: GRAPH_FORMAT, version: CURRENT_GRAPH_VERSION }
	};
}
