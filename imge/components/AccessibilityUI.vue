<!-- Component Template 1.3 -->
<!-- ----------------------------------------------------------------------
        SCRIPT
----------------------------------------------------------------------- -->
<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

// Access the store's state
import { imgeState } from '~/stores/imge';
const ibank = imgeState();

// Computed properties derived from store
const screenSizeIndex = computed(() => ibank.get_screenSizeIndex);
const colorMode = computed(() => ibank.get_colorMode);

import { defineEmits } from 'vue'
const emit = defineEmits(['fitToScreen', 'addNode']);

// composable
setScreenSize()

// Lifecycle hooks
onMounted(() => {
    // Add event listeners if required
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    // Remove event listeners if required
    window.removeEventListener('keydown', handleKeydown);
});

const handleKeydown = (event) => {

};

// functions
// Mouseover event handlers
function handleMouseOver(message) {
    ibank.set_assistanceMsg(message);
}

function handleMouseLeave() {
    ibank.set_assistanceMsg("");
}

function zoomIn() {
    ibank.set_zoomLevel(ibank.get_zoomLevel + 0.1);
}

function zoomOut() {
    ibank.set_zoomLevel(ibank.get_zoomLevel - 0.1);
}

function fitToScreen() {
    emit('fitToScreen');
}

function addNode() {
    emit('addNode');
}

</script>

<!-- ----------------------------------------------------------------------
        TEMPLATE
----------------------------------------------------------------------- -->
<template>
    <div class="access-wrapper">
        <div class="access-function" @click="zoomIn()" @mouseenter="handleMouseOver(`Zoom In`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 12h14m-7 7V5" />
            </svg>
        </div>
        <div class="access-function" @click="zoomOut()" @mouseenter="handleMouseOver(`Zoom Out`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M5 12h14" />
            </svg>
        </div>
        <div class="access-function" @click="addNode()" @mouseenter="handleMouseOver(`add node`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <svg class="w-6 h-6 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" stroke-linecap="round" stroke-width="2"
                    d="M7.926 10.898 15 7.727m-7.074 5.39L15 16.29M8 12a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm12 5.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Zm0-11a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
            </svg>
        </div>
        <div class="access-function" @click="fitToScreen()" @mouseenter="handleMouseOver(`Fit to Screen`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24   24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3">
                </path>
            </svg>
        </div>
        <div class="access-function not-selected" @mouseenter="handleMouseOver(`Import graph`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 15l-6-6-6 6" />
            </svg>
        </div>
        <div class="access-function not-selected" @mouseenter="handleMouseOver(`Export graph`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6" />
            </svg>

        </div>
        <div class="access-function" @mouseenter="handleMouseOver(`Color Mode: ${colorMode}`)"
            @mouseleave="handleMouseLeave()">
            <!-- <span v-if="screenSizeIndex > 1">A</span> -->
            <ColorMode />
        </div>
    </div>
</template>


<!-- ----------------------------------------------------------------------
        STYLE
----------------------------------------------------------------------- -->
<style scoped>
.access-wrapper {
    display: grid;
    grid-template-columns: 1;
    grid-template-rows: repeat(auto, 1fr);
    grid-gap: 2px;
    position: fixed;
    bottom: 2em;
    left: 1em;
    z-index: 30;
}

.access-function {
    display: flex;
    width: 1.2em;
    height: 1.2em;
    padding: .2em;
    justify-content: center;
    align-items: center;
    text-align: center;
    background: var(--bg);
    /* border: 1px solid var(--col-border); */
    border-radius: 4px;
}

.access-function svg {
    width: 100%;
    height: 100%;
    opacity: .8;
}

@media (max-width: 480px) {}

@media (min-width: 481px) and (max-width: 1024px) {}

@media (min-width: 1025px) {}
</style>
