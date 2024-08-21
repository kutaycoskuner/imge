<template>
    <div class="mouse-tracker">
        <div class="coordinates">
            x: {{ x }}, y: {{ y }}
        </div>
    </div>
</template>

<script setup>
// state
import { imgeState } from '~/stores/imge';
const imState = imgeState();

import { ref, onMounted, onBeforeUnmount } from 'vue';

const x = ref(0);
const y = ref(0);

const offsetX = computed(() => imState.get_coordsBaseXOffset);  
const offsetY = computed(() => imState.get_coordsBaseYOffset);
const stateoffsetX = computed(() => imState.get_coordsStateXOffset);
const stateoffsetY = computed(() => imState.get_coordsStateYOffset);


// Function to update mouse position relative to the center of the screen
const updateMousePosition = (event) => {

    x.value = event.clientX - offsetX.value - stateoffsetX.value;
    y.value = -(event.clientY - offsetY.value - stateoffsetY.value);
};

// Calculate the initial offset (center of the screen)
const calculateBaseOffset = () => {
    imState.set_coordsBaseXOffset(window.innerWidth / 2);
    imState.set_coordsBaseYOffset(window.innerHeight / 2);
};


onMounted(() => {
    calculateBaseOffset();
    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('resize', calculateBaseOffset);
});

onBeforeUnmount(() => {
    window.removeEventListener('mousemove', updateMousePosition);
    window.removeEventListener('resize', calculateBaseOffset);
});
</script>

<style scoped>
.mouse-tracker {
    position: fixed;
    bottom: 1em;
    right: 1em;
    background-color: var(--bg);
    background-color: #000000ee ;
    color: #ffffffee;
    padding: 5px 10px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1000;
    opacity: .8;
}

.coordinates {
    pointer-events: none;
}
</style>