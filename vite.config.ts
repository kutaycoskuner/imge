import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import pkg from './package.json';

// shown in the bottom-left bar: the version from package.json and the day the site was built
// (a deploy builds it, so the build date is the site's last update)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = new Date();
const buildDate = `${String(now.getDate()).padStart(2, '0')}-${MONTHS[now.getMonth()]}-${now.getFullYear()}`;

export default defineConfig({
	plugins: [sveltekit()],

	define: {
		__APP_VERSION__: JSON.stringify(pkg.version),
		__BUILD_DATE__: JSON.stringify(buildDate)
	},

	test: {
		include: ['src/**/*.{test,spec}.{js,ts}']
	}
});
