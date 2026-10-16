// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	// set in vite.config.ts: package.json version and the build day (dd-Mmm-yyyy)
	const __APP_VERSION__: string;
	const __BUILD_DATE__: string;

	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
