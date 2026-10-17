// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// Old address of the graph editor, which is now the home page (/). Kept so existing links
// and bookmarks still work; the static build turns it into a page that forwards at once.
// The target is relative ("./") because the site is served under a sub-path on GitHub
// Pages (/imge/): "/" would leave the site, "./" from /imge/graph_editor is /imge/.
import { redirect } from '@sveltejs/kit';

export function load(): never {
	redirect(308, './');
}
