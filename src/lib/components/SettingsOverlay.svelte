<script lang="ts">
	import { onMount } from 'svelte';

	let overlayVisible: boolean = false;
	let mainSelectionName: string = '';

	function handleFileUpload(event: Event): void {
	}

	function setMenu(param1: boolean, param2: boolean, selection: string): void {
		mainSelectionName = selection;
	}

	function toggleOverlay(visible?: boolean): void {
		overlayVisible = visible !== undefined ? visible : !overlayVisible;
		document.body.style.overflow = overlayVisible ? 'hidden' : '';
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Escape') {
			toggleOverlay();
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleKeydown);
		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>


<!-- Overlay -->
{#if overlayVisible}
	<div class="overlay">
		<button class="overlay-close" on:click={() => toggleOverlay(false)}>
			<span class="overlay-close-text">Close</span> <span class="overlay-close-icon">&times;</span>
		</button>

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
	</div>
{/if}
