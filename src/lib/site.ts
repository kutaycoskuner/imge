// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-11-07
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
// configuration. Details: docs/keyboard-site.md

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
