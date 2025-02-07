<script>
	import PolkaDots from '$lib/components/PolkaDots.svelte';
	import UI_GraphEditor from '$lib/components/UI_GraphEditor.svelte';
	import { zoomLevel, coordsStateXOffset, coordsStateYOffset } from '../stores/imge_main';


	$: _coordsStateXOffset = $coordsStateXOffset;

// Function to increase the store value
const increaseX = () => {
    coordsStateXOffset.update((state) => (state + 10 ));
	console.log(_coordsStateXOffset);
  };
</script>

<UI_GraphEditor />
<PolkaDots />
<!-- <button on:click={increaseX}>Increase Value</button> -->

