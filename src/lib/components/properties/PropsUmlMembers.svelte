<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section "Attributes and methods" for a UML class node: its two member
	// compartments, one member per line in UML notation, each in a field with highlighting and
	// a format check (PropUmlLines), and whether the class is abstract (its name in italics).
	// Saved into the node's content (`abstract`, `attributes`, `methods`) with setNodeContent;
	// the class name and colour are in the Content section.
	import PropUmlLines from './PropUmlLines.svelte';
	import { graph, setNodeContent } from '$lib/graph/store';
	import { umlMembers, umlAbstract } from '$lib/graph/node-types';
	import { parseAttribute, parseMethod, type UmlLine } from '$lib/graph/uml';
	import type { PanelContext } from './sections';

	export let ctx: PanelContext;
	$: node = ctx.nodes[0];

	// the two compartments, as data for one template
	const FIELDS: { key: 'attributes' | 'methods'; title: string; parse: (line: string) => UmlLine; placeholder: string }[] = [
		{ key: 'attributes', title: 'Attributes', parse: parseAttribute, placeholder: '- name: String\n+ count: int = 0' },
		{ key: 'methods', title: 'Methods', parse: parseMethod, placeholder: '+ area(): double\n- resize(by: double): void' }
	];

	$: abstract = umlAbstract(node);
	// UML: a class with an {abstract} method is abstract itself
	$: abstractMethods = umlMembers(node, 'methods').filter((line) => parseMethod(line).abstract).length;

	function setAbstract(event: Event): void {
		const checked = (event.currentTarget as HTMLInputElement).checked;
		const id = node.id;
		graph.update((g) => setNodeContent(g, id, { abstract: checked }));
	}

	function save(key: 'attributes' | 'methods', lines: string[]): void {
		const id = node.id;
		graph.update((g) => setNodeContent(g, id, { [key]: lines }));
	}
</script>

<label class="prop-check" title="An abstract class: its name is drawn in italics">
	<input type="checkbox" checked={abstract} on:change={setAbstract} />
	Abstract class
</label>
{#if abstractMethods && !abstract}
	<div class="prop-faint">has {abstractMethods} {'{abstract}'} method{abstractMethods > 1 ? 's' : ''}: UML makes such a class abstract</div>
{/if}

{#each FIELDS as field (field.key)}
	<h4 class="prop-subtitle">{field.title}</h4>
	<PropUmlLines
		label={field.title}
		value={umlMembers(node, field.key)}
		parse={field.parse}
		placeholder={field.placeholder}
		onCommit={(lines) => save(field.key, lines)}
	/>
{/each}
<p class="prop-note">
	One member per line: <code>+ - # ~</code> visibility, <code>name: Type = value</code>, <code>name(param: Type): Type</code>;
	<code>{'{static}'}</code> (drawn underlined) and <code>{'{abstract}'}</code> (methods, in italics) before or after the visibility;
	a property string at the end: <code>{'{readOnly}'}</code> (final), <code>{'{ordered, unique}'}</code>, methods <code>{'{query}'}</code>.
</p>
