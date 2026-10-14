<script lang="ts">
	// -----------------------------------------------------------------------------------------
	//   author          : Kutay Coskuner
	//   ai-contributors : Claude Opus 5.5 (claude-opus-5-5)
	//   last update     : 2026-10-15
	//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
	//                     Check outputs before relying on them.
	// -----------------------------------------------------------------------------------------
	// Shows a keyboard shortcut as key caps: "Ctrl+Shift+S" -> [Ctrl]+[Shift]+[S]. A single
	// character, including "+" itself, is one key. The cap style is the global `kbd` rule in
	// static/styles/imge.css. Used by AssistanceMsg, SettingsOverlay and GraphEditorMenu.
	export let keys: string;

	$: parts = keys.length === 1 ? [keys] : keys.split('+');
</script>

<span class="kbd-combo">
	{#each parts as key, i}{#if i > 0}<span class="kbd-plus">+</span>{/if}<kbd>{key}</kbd>{/each}
</span>

<style>
	.kbd-combo {
		white-space: nowrap;
	}

	.kbd-plus {
		margin: 0 0.15em;
		opacity: 0.6;
	}
</style>
