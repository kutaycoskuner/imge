<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-14
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Esc menu, mounted once in the layout. Esc toggles it, unless the page already used
	// that key press (it calls preventDefault, e.g. the graph editor cancelling a link drag).
	// It shows the menu the current page registered in `pageMenu` (see stores/imge_main.ts),
	// or the default menu below for pages without one. How to add a page menu:
	// docs/graph-saving.md, "A menu for each page".
	import { onMount } from 'svelte';
	import { menuOpen, pageMenu } from '../../stores/imge_main';

	let mainSelectionName: string = '';

	function handleFileUpload(event: Event): void {}

	function setMenu(param1: boolean, param2: boolean, selection: string): void {
		mainSelectionName = selection;
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape' && !event.defaultPrevented) {
			menuOpen.update((open) => !open);
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		// lock page scrolling while the menu is open
		const unsubscribe = menuOpen.subscribe((open) => {
			document.body.style.overflow = open ? 'hidden' : '';
		});
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			unsubscribe();
		};
	});
</script>

<!-- Overlay -->
{#if $menuOpen}
	<div class="overlay">
		<button class="overlay-close" on:click={() => menuOpen.set(false)}>
			<span class="overlay-close-text">Close</span> <span class="overlay-close-icon">&times;</span>
		</button>

		{#if $pageMenu}
			<div class="overlay-content page-menu">
				<h2 class="page-menu-title">{$pageMenu.title}</h2>
				<svelte:component this={$pageMenu.component} />
			</div>
		{:else}
			<!-- default menu, for pages that don't register their own -->
			<div class="overlay-content">
				<div class="overlay-menu">
					<button
						class={mainSelectionName === 'upload' ? 'selected' : 'selected'}
						on:click={() => setMenu(true, true, 'upload')}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="21"
							height="21"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 4.2v10.3" />
						</svg>
						<span>upload</span>
					</button>
				</div>
				<div class="overlay-submenu">
					<div>
						<label class="custom-file-upload">
							<input class="default-input" type="file" multiple on:change={handleFileUpload} />
							Upload your GLTF model and related files
						</label>
					</div>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* page menus stack their sections; the default menu keeps the two-column grid */
	.page-menu {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 1em;
	}

	.page-menu-title {
		margin: 0;
		font-size: 1.2em;
		text-transform: lowercase;
	}
</style>
