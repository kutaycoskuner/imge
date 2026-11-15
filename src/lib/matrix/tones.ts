// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-13
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// tones.ts -- the matrix calculator's colours, one per part, so a value keeps its colour
// everywhere: in the matrices (MatrixGrid.svelte) and in the formulas of the description
// column (KaTeX \textcolor). A blue, B purple, written out amber, C green.

export type Tone = 'a' | 'b' | 'template' | 'c';

/** color: text and brackets; bg / border: a highlighted or hovered cell. */
export const TONES: Record<Tone, { color: string; bg: string; border: string }> = {
	a: { color: '#0076ff', bg: 'rgba(0, 118, 255, 0.1)', border: 'rgba(0, 118, 255, 0.35)' },
	b: { color: '#7928ca', bg: 'rgba(121, 40, 202, 0.1)', border: 'rgba(121, 40, 202, 0.35)' },
	template: { color: '#f5a623', bg: 'rgba(245, 166, 35, 0.12)', border: 'rgba(245, 166, 35, 0.4)' },
	c: { color: '#00a36c', bg: 'rgba(0, 163, 108, 0.12)', border: 'rgba(0, 163, 108, 0.4)' }
};

/** KaTeX: `tex` in the tone's colour. */
export function colored(tone: Tone, tex: string): string {
	return `\\textcolor{${TONES[tone].color}}{${tex}}`;
}
