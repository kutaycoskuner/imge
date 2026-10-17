<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : unknown (before 2026-10-15), Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-15
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Short hint line in the middle of the screen (`assistanceMsg` store): toolbar hover
	// hints, refused-action messages, and "esc for menu" at startup. Parts of the message in
	// square brackets are shown as key caps: "Add node [Shift+A]" -> Add node [Shift]+[A].
	import { onMount } from 'svelte';
	import { assistanceMsg } from '../../stores/imge_main'; // Import store
	import { fade } from 'svelte/transition';
	import Kbd from './Kbd.svelte';

	onMount(() => {
		// set initial message to show at start
		assistanceMsg.set('[Esc] for menu');
		setTimeout(() => {
			assistanceMsg.set('');
		}, 3000);
	});

	// "text [keys] text" -> alternating text and key parts (odd indexes are keys)
	$: parts = $assistanceMsg.split(/\[([^\]]+)\]/);
</script>

{#if $assistanceMsg}
	<div class="assistance-msg" transition:fade={{ duration: 100 }}>
		<span>
			{#each parts as part, i}{#if i % 2 === 1}<Kbd keys={part} />{:else}{part}{/if}{/each}
		</span>
	</div>
{/if}

<style>
	/* at every window width (it used to apply above 1024 px only, so narrow or zoomed
	   windows got an unstyled message behind the graph) */
	.assistance-msg {
		user-select: none;
		font-size: 0.9em;
		font-weight: 600;
		text-transform: lowercase;
		position: fixed;
		left: 50%;
		bottom: 10%;
		transform: translateX(-50%);
		max-width: 90vw;
		text-align: center;
		pointer-events: none;
		/* above the graph (world layer 10-20), the toolbar (30) and the Esc menu (100) */
		z-index: 950;
	}

	/* the message itself sits on a plain background, so it stays readable over nodes and links */
	.assistance-msg > span {
		display: inline-block;
		padding: 0.35em 0.9em;
		color: var(--col);
		background: var(--bg);
		border-radius: 4px;
	}
</style>
