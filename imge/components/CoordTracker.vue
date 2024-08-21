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

// Store the coordinates relative to the center of the screen
const x = ref(0);
const y = ref(0);

// // Track the initial offset (center of the screen)
// const offsetX = ref(0);
// const offsetY = ref(0);


const offsetX = computed(() => imState.get_coordsBaseXOffset);
const offsetY = computed(() => imState.get_coordsBaseYOffset);
const stateoffsetX = computed(() => imState.get_coordsStateXOffset);
const stateoffsetY = computed(() => imState.get_coordsStateYOffset);


// Function to update mouse position relative to the center of the screen
const updateMousePosition = (event) => {
    x.value = event.clientX - offsetX.value;
    y.value = -(event.clientY - offsetY.value);
    // x.value = event.clientX - offsetX.value - stateoffsetX.value;
    // y.value = -(event.clientY - offsetY.value - stateoffsetY.value);
};

// Calculate the initial offset (center of the screen)
const calculateBaseOffset = () => {
    imState.set_coordsBaseXOffset(window.innerWidth / 2);
    imState.set_coordsBaseYOffset(window.innerHeight / 2);
    print(imState.get_coordsBaseYOffset)
};
// const calculateOffset = () => {
//     offsetX.value = window.innerWidth / 2;
//     offsetY.value = window.innerHeight / 2;
// };

// Add event listeners when the component is mounted
onMounted(() => {
    // calculateOffset(); // Set initial offset when mounted
    calculateBaseOffset();
    window.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('resize', calculateBaseOffset); // Recalculate center on resize
});

// Remove event listeners when the component is unmounted
onBeforeUnmount(() => {
    window.removeEventListener('mousemove', updateMousePosition);
    window.removeEventListener('resize', calculateBaseOffset);
});
</script>

<style scoped>
.mouse-tracker {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-family: Arial, sans-serif;
    font-size: 14px;
    z-index: 1000;
}

.coordinates {
    pointer-events: none;
}
</style>