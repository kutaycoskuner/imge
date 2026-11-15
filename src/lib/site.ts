// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-15
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// site.ts -- which site this build is: the full imge (GitHub Pages, the default) or the
// keyboard-only site (built by the Dockerfile with SITE=keyboard, run on a self-hosted server).
//
// The value comes from the SITE environment variable at build time (vite.config.ts turns it
// into __SITE__). The keyboard site shares keymaps without the owner's name, so it hides the
// links to the GitHub repository and other projects and the page navigation. Its address
// and analytics are not in this repo at all: the server adds the analytics tag when the
// container starts (ANALYTICS_TAG, nginx.conf.template), from the server's private
// configuration. The same goes for its support link (e.g. Ko-fi): the server answers
// site-config.json from the container's SUPPORT_URL and SUPPORT_LABEL, and the bottom-left
// bar shows the link when there is one (loadSupportLink). Details: docs/keyboard-site.md

/** Build-time site name: '' (full imge) or 'keyboard'. */
export const SITE: string = __SITE__;

/** True for the keyboard-only site: no navigation, no personal links, no analytics tag. */
export const KEYBOARD_ONLY: boolean = SITE === 'keyboard';

/** Analytics of the full imge (self-hosted Umami): the script counts visits only on its
 *  domain, so local runs are not counted. null on the keyboard site, whose tag the server
 *  adds. */
export const ANALYTICS = KEYBOARD_ONLY
	? null
	: {
			script: 'https://analytics.archrium.net/script.js',
			websiteId: '46199731-2117-40f5-93fa-d74ecf1ac920',
			domain: 'kutaycoskuner.github.io'
		};

/** A support link (e.g. a Ko-fi page) and its hover text. */
export interface SupportLink {
	url: string;
	label: string;
}

/** Reads the support link from the server's answer ({"support": {"url", "label"}}): only an
 *  https address counts; no address (the server's setting is empty) or anything else → null.
 *  The label falls back to "Support". */
export function parseSupportLink(data: unknown): SupportLink | null {
	const support = (data as { support?: { url?: unknown; label?: unknown } } | null)?.support;
	const url = typeof support?.url === 'string' ? support.url.trim() : '';
	if (!/^https:\/\/[^\s"'<>]+$/.test(url)) return null;
	const label = typeof support?.label === 'string' && support.label.trim() ? support.label.trim() : 'Support';
	return { url, label };
}

/** The keyboard site's support link, asked from its server (site-config.json, filled from the
 *  container's environment, nginx.conf.template); null on the full imge, when the server has
 *  none, or when the file is missing (e.g. pnpm preview). */
export async function loadSupportLink(): Promise<SupportLink | null> {
	if (!KEYBOARD_ONLY) return null;
	try {
		const response = await fetch('site-config.json', { cache: 'no-cache' });
		return response.ok ? parseSupportLink(await response.json()) : null;
	} catch {
		return null;
	}
}
