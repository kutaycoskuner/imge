// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-27
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// link-relations.ts -- the UML class diagram relations, as data: each one is a link look
// (line style and end mark) that the Properties panel's Relation dropdown applies in one
// step. A relation isn't stored in the file: the link keeps only its look (graph format v7:
// line, mark, and arrow for the end the mark is at), and relationOf() reads the relation back
// from it, so a link styled by hand that matches one is shown as that relation.
//
// The mark's end: UML puts it at the general class (inheritance), the interface
// (realization), the used class (association, dependency), or the whole (aggregation,
// composition). Which of the link's two ends that is depends on how it was drawn (a link
// always runs from an output to an input, so in a top-to-bottom diagram a parent above its
// children is the source). So applying a relation keeps a link's own single end (arrow
// forward or backward), and only a link with arrow none or both gets the relation's
// `arrow`, the end for a link read "source <relation> target" (Dog inherits Animal: forward;
// Car is composed of Wheels: backward, the diamond at Car). Arrow (D) flips the end.
//
// Used by: components/properties/PropsLinkStyle.svelte. Details: docs/graph-uml.md#relations
// -----------------------------------------------------------------------------------------

import type { Link, LinkArrow, LinkLine, LinkMark } from './types';

export interface LinkRelation {
	id: string;
	title: string; // name in the dropdown
	description: string; // hover text: what it means and where the mark goes
	line: LinkLine;
	mark: LinkMark;
	arrow: LinkArrow; // the mark's end for a link read "source <relation> target"
}

export const UML_RELATIONS: LinkRelation[] = [
	{ id: 'association', title: 'Association', description: 'uses / knows; open arrow at the class that is known', line: 'solid', mark: 'open-arrow', arrow: 'forward' },
	{ id: 'inheritance', title: 'Inheritance', description: 'is a kind of (extends); triangle at the parent', line: 'solid', mark: 'triangle', arrow: 'forward' },
	{ id: 'realization', title: 'Realization', description: 'implements an interface; triangle at the interface', line: 'dashed', mark: 'triangle', arrow: 'forward' },
	{ id: 'dependency', title: 'Dependency', description: 'depends on, uses for a while; open arrow at the used class', line: 'dashed', mark: 'open-arrow', arrow: 'forward' },
	{ id: 'aggregation', title: 'Aggregation', description: 'has parts that can exist on their own; diamond at the whole', line: 'solid', mark: 'diamond', arrow: 'backward' },
	{ id: 'composition', title: 'Composition', description: 'owns parts that live and die with it; filled diamond at the whole', line: 'solid', mark: 'filled-diamond', arrow: 'backward' }
];

/** Whether the mark is drawn at exactly one end (what a relation needs). */
const oneEnd = (arrow: LinkArrow): boolean => arrow === 'forward' || arrow === 'backward';

/** The relation whose look the link has (mark at one end, either), or undefined (a custom look). */
export const relationOf = (link: Pick<Link, 'line' | 'mark' | 'arrow'>): LinkRelation | undefined =>
	oneEnd(link.arrow) ? UML_RELATIONS.find((r) => r.line === link.line && r.mark === link.mark) : undefined;

/** The look a link gets for a relation: its line and mark, at the link's own end if it has one. */
export const relationStyle = (relation: LinkRelation, link: Pick<Link, 'arrow'>): Pick<Link, 'line' | 'mark' | 'arrow'> => ({
	line: relation.line,
	mark: relation.mark,
	arrow: oneEnd(link.arrow) ? link.arrow : relation.arrow
});
