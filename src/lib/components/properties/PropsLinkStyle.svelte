<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-27
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Properties panel section for how the selected link is drawn: a UML relation (sets line
	// and mark in one step, $lib/graph/link-relations.ts), shape, arrow, end mark, line
	// style, route and the corner / lane position (bend). Shape, arrow and route are the same
	// values the L, D and R keys and the corner drag change; display overrides from the Esc
	// menu are mentioned when they hide them.
	import PropText from './PropText.svelte';
	import {
		graph,
		setLinkStyle,
		setLinkBend,
		findBackLinks,
		linkShapeOverride,
		linkArrowOverride
	} from '$lib/graph/store';
	import { LINK_SHAPES, LINK_ARROWS, LINK_ROUTES, LINK_MARKS, LINK_LINES, type Link } from '$lib/graph/types';
	import { UML_RELATIONS, relationOf, relationStyle } from '$lib/graph/link-relations';
	import { LINK_ARROW_LABELS, LINK_LINE_LABELS, LINK_MARK_LABELS, type PanelContext } from './sections';

	export let ctx: PanelContext;
	$: link = ctx.link!;
	// a link goes around its nodes when it closes a cycle or loops back to its own node;
	// only then are route and the lane (bend) used
	$: goesAround = link.source.node === link.target.node || findBackLinks(ctx.graph).has(link.id);
	$: usesBend = goesAround || link.shape === 'manhattan';

	// the relation the link's look matches, '' = custom (computed here: a function call as a
	// select's value doesn't compile in this Svelte mode)
	$: relation = relationOf(link)?.id ?? '';

	// the choices, as data for one template
	type Choice = {
		key: 'shape' | 'arrow' | 'mark' | 'line' | 'route';
		title: string;
		options: readonly string[];
		label: (o: string) => string;
		note: string;
	};
	let choices: Choice[];
	$: choices = [
		{ key: 'shape', title: 'Shape', options: LINK_SHAPES, label: (o) => o, note: $linkShapeOverride ? `shown as ${$linkShapeOverride} (menu)` : '' },
		{ key: 'arrow', title: 'Arrow', options: LINK_ARROWS, label: (o) => LINK_ARROW_LABELS[o as Link['arrow']], note: $linkArrowOverride ? `shown as ${$linkArrowOverride} (menu)` : '' },
		{ key: 'mark', title: 'Mark', options: LINK_MARKS, label: (o) => LINK_MARK_LABELS[o as Link['mark']], note: ($linkArrowOverride ?? link.arrow) === 'none' ? 'not drawn: Arrow is none' : '' },
		{ key: 'line', title: 'Line', options: LINK_LINES, label: (o) => LINK_LINE_LABELS[o as Link['line']], note: '' },
		{ key: 'route', title: 'Route', options: LINK_ROUTES, label: (o) => o, note: goesAround ? '' : 'used when it goes around its nodes' }
	];

	function chooseRelation(event: Event): void {
		const chosen = UML_RELATIONS.find((r) => r.id === (event.currentTarget as HTMLSelectElement).value);
		if (!chosen) return;
		const id = link.id;
		const style = relationStyle(chosen, link);
		graph.update((g) => setLinkStyle(g, id, style));
	}

	function choose(key: Choice['key'], event: Event): void {
		const value = (event.currentTarget as HTMLSelectElement).value;
		const id = link.id;
		graph.update((g) => setLinkStyle(g, id, { [key]: value }));
	}

	function setBend(typed: string): void {
		const value = Number(typed);
		if (typed.trim() === '' || !Number.isFinite(value)) return;
		const id = link.id;
		graph.update((g) => setLinkBend(g, id, value));
	}
</script>

<dl class="props">
	<dt><label for="prop-link-relation">Relation</label></dt>
	<dd>
		<select id="prop-link-relation" class="prop-input" value={relation} on:change={chooseRelation}>
			<option value="" disabled>custom</option>
			{#each UML_RELATIONS as option (option.id)}
				<option value={option.id} title="{option.title}: {option.description}">{option.title}</option>
			{/each}
		</select>
		<div class="prop-faint">UML: sets line and mark; Arrow sets the end</div>
	</dd>

	{#each choices as choice (choice.key)}
		<dt><label for="prop-link-{choice.key}">{choice.title}</label></dt>
		<dd>
			<select id="prop-link-{choice.key}" class="prop-input" value={link[choice.key]} on:change={(e) => choose(choice.key, e)}>
				{#each choice.options as option}
					<option value={option}>{choice.label(option)}</option>
				{/each}
			</select>
			{#if choice.note}<div class="prop-faint">{choice.note}</div>{/if}
		</dd>
	{/each}

	{#if usesBend}
		<dt>{goesAround ? 'Lane' : 'Corner'}</dt>
		<dd>
			<PropText type="number" step={0.05} min={0} max={1} label="Bend (0 to 1)" value={link.bend ?? 0.5} onCommit={setBend} />
			<div class="prop-faint">0 … 1, also by dragging the highlighted segment</div>
		</dd>
	{/if}
</dl>
