<script lang="ts">
	import { onMount } from 'svelte';
	import { assistanceMsg } from '../../stores/imge_main'; // Import store
	import { fade } from 'svelte/transition';

	onMount(() => {
		// set initial message to show at start
		assistanceMsg.set('esc for settings');
		setTimeout(() => {
			assistanceMsg.set('');
		}, 3000);
	});
</script>

{#if $assistanceMsg}
	<div class="assistance-msg" transition:fade={{ duration: 100 }}>{$assistanceMsg}</div>
{/if}

<style>
	@media (min-width: 1025px) {
		.assistance-msg {
			user-select: none;
			font-size: 0.9em;
			font-weight: 600;
			text-transform: lowercase;
			position: fixed;
			top: -10%;
			left: -50%;
			width: 200%;
			height: 200%;
			display: flex;
			justify-content: center;
			align-items: center;
		}
	}
</style>
