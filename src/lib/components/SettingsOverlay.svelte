<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-16
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// The Esc menu, mounted once in the layout. Esc toggles it, unless the page already used
	// that key press (it calls preventDefault, e.g. the graph editor cancelling a link drag).
	// It shows the menu the current page registered in `pageMenu` (see stores/imge_main.ts),
	// or the default menu below for pages without one. A page menu with tabs gets a switch
	// at the header's right (e.g. Config / Examples / Keybindings); the open tab is
	// remembered per page in localStorage. How to add a page menu: docs/graph-saving.md,
	// "A menu for each page".
	import { onMount } from 'svelte';
	import { menuOpen, pageMenu, menuTab } from '../../stores/imge_main';
	import Kbd from './Kbd.svelte';
	import IconUpload from '$lib/icons/icon-upload.svelte';

	const tabKey = (title: string) => `imge.menuTab.${title}`;

	// a page registering its menu reopens the tab last used on that page
	let menuTitle: string | null = null;
	$: if ($pageMenu?.title !== menuTitle) {
		menuTitle = $pageMenu?.title ?? null;
		let stored: string | null = null;
		try {
			if (menuTitle) stored = localStorage.getItem(tabKey(menuTitle));
		} catch {}
		menuTab.set(stored);
	}

	$: tabs = $pageMenu?.tabs ?? [];
	$: activeTab = tabs.find((t) => t.id === $menuTab) ?? tabs[0];
	$: shown = activeTab?.component ?? $pageMenu?.component;

	function pickTab(id: string): void {
		menuTab.set(id);
		try {
			if (menuTitle) localStorage.setItem(tabKey(menuTitle), id);
		} catch {}
	}

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
			<span class="overlay-close-text">Close <Kbd keys="Esc" /></span> <span class="overlay-close-icon">&times;</span>
		</button>

		{#if $pageMenu}
			<div class="overlay-content page-menu">
				<div class="page-menu-header">
					<h2 class="page-menu-title">{$pageMenu.title}</h2>
					{#if tabs.length > 1}
						<div class="menu-tabs" role="tablist">
							{#each tabs as tab (tab.id)}
								<button
									class="menu-tab"
									class:active={tab === activeTab}
									role="tab"
									aria-selected={tab === activeTab}
									on:click={() => pickTab(tab.id)}>{tab.label}</button
								>
							{/each}
						</div>
					{/if}
				</div>
				{#if shown}<svelte:component this={shown} />{/if}
			</div>
		{:else}
			<!-- default menu, for pages that don't register their own -->
			<div class="overlay-content">
				<div class="overlay-menu">
					<button
						class={mainSelectionName === 'upload' ? 'selected' : 'selected'}
						on:click={() => setMenu(true, true, 'upload')}
					>
						<IconUpload width="21" height="21" />
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

	/* at most 80% of the window's height; a taller menu scrolls under its header */
	.overlay-content.page-menu {
		max-height: 80vh;
		overflow-y: auto;
		box-sizing: border-box;
		scrollbar-width: thin;
	}

	/* up to 1024 px the global .overlay-content takes min-width 100% of the overlay, which is
	   twice the window wide (settings_overlay.css), so a page menu started off-screen left;
	   here it stays inside the window (and scrolls when taller, see above) */
	@media (max-width: 1024px) {
		.overlay-content.page-menu {
			min-width: 0;
			width: calc(100vw - 2em);
			background: var(--bg);
		}
	}

	.page-menu-title {
		margin: 0;
		font-size: 1.2em;
		text-transform: lowercase;
	}

	.page-menu-header {
		position: sticky; /* title and tab switch stay visible while the menu scrolls */
		top: -1em; /* the menu's padding */
		z-index: 1;
		margin: -1em -1em 0;
		padding: 1em;
		background: var(--bg);
		align-self: stretch;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.6em 2em;
	}

	/* segmented switch: joined buttons, the outer corners slightly rounded, the middle square;
	   buttons are reset globally (settings_overlay.css), so every rule is set here */
	.menu-tabs {
		--col-accent: #2a9fd6; /* cerulean, readable on both themes */
		display: flex;
	}

	.menu-tab {
		cursor: pointer;
		user-select: none;
		padding: 0.25em 0.9em;
		font-size: 0.8em;
		border: 1px solid var(--col-border);
		border-radius: 0;
		opacity: 0.75;
	}

	.menu-tab + .menu-tab {
		margin-left: -1px; /* neighbours share one border line */
	}

	.menu-tab:first-child {
		border-radius: 4px 0 0 4px;
	}

	.menu-tab:last-child {
		border-radius: 0 4px 4px 0;
	}

	.menu-tab:hover {
		opacity: 1;
	}

	.menu-tab.active {
		position: relative; /* its border on top of the neighbours' */
		opacity: 1;
		background: color-mix(in srgb, var(--col-accent) 7%, transparent);
		border-color: color-mix(in srgb, var(--col-accent) 30%, var(--col-border));
	}
</style>
