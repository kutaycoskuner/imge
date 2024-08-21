<template>
    <div class="viewport" ref="viewport">
        <div class="zoomable-background" ref="zoomableBackground">
            <div class="content">
                <!-- Render nodes here -->
                <h1> Imge </h1>
                <div v-for="node in nodes" :key="node._id" class="node" :style="{
                    left: node.position.x + base_offset_x + 'px',
                    top: node.position.y + base_offset_y + 'px'
                }">
                    <h3>{{ node.data.title }}</h3>
                </div>
            </div>
        </div>
        <div class="polka-dots" ref="background"></div>
    </div>

    <CoordTracker />
    <BlackboardShortcuts />
</template>

<script setup>
// state
import { imgeState } from '~/stores/imge';
const imState = imgeState();



import data_json from '@/data/test_node-graph.json';
import { ref, onMounted, onBeforeUnmount } from 'vue';
// import { print } from '@/utils/utils';

const base_offset_x = computed(() => imState.get_coordsBaseXOffset);
const base_offset_y = computed(() => imState.get_coordsBaseYOffset);

const nodes = ref(data_json.data.nodes);
const viewport = ref(null);
const zoomableBackground = ref(null);
const background = ref(null);

const zoomLevel = ref(1); // Initial zoom level (100%)

const panStart = ref({ x: 0, y: 0 });
const panOffset = ref({ x: 0, y: 0 });
const bgOffset = ref({ x: 0, y: 0 });

const handleScroll = (event) => {
    const maxZoom = 1.2;    // Maximum zoom level (200%)
    const minZoom = 0.4;    // Minimum zoom level (50%)
    const zoomStep = 0.001; // Zoom step size
    event.preventDefault();

    const zoomChange = event.deltaY * -zoomStep; // Determine zoom change based on scroll direction
    zoomLevel.value = Math.min(
        Math.max(zoomLevel.value + zoomChange, minZoom),
        maxZoom
    );

    updateTransform();  // <-- Call to updateTransform
};

const handleMouseDown = (event) => {
    event.preventDefault();
    panStart.value = { x: event.clientX, y: event.clientY };

    print('handleMouseDown')
    if (viewport.value && zoomableBackground.value) {
        zoomableBackground.value.style.cursor = 'grabbing';
    }


    const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - panStart.value.x;
        const dy = moveEvent.clientY - panStart.value.y;
        const bgMaxOffset = 41;
        panOffset.value = {
            x: panOffset.value.x + dx,
            y: panOffset.value.y + dy
        };
        bgOffset.value = {
            x: bgOffset.value.x + dx > bgMaxOffset || bgOffset.value.x + dx < -bgMaxOffset
                ? bgOffset.value.x = 0
                : bgOffset.value.x = bgOffset.value.x + dx,
            y: bgOffset.value.y + dy > bgMaxOffset || bgOffset.value.y + dy < -bgMaxOffset
                ? bgOffset.value.y = 0
                : bgOffset.value.y = bgOffset.value.y + dy
        };

        updateTransform();

        panStart.value = { x: moveEvent.clientX, y: moveEvent.clientY };
        imState.set_coordsStateXOffset(panStart.value.x);
        imState.set_coordsStateYOffset(panStart.value.y);
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        if (zoomableBackground.value) {
            zoomableBackground.value.style.cursor = 'grab';
        }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
};

const updateTransform = () => {
    if (viewport.value && zoomableBackground.value && background.value) {
        zoomableBackground.value.style.transform = `scale(${zoomLevel.value}) translate(${panOffset.value.x}px, ${panOffset.value.y}px)`;
        background.value.style.transform = `scale(${zoomLevel.value}) translate(${bgOffset.value.x}px, ${bgOffset.value.y}px)`;
    }
};

onMounted(() => {

    if (viewport.value) {
        viewport.value.addEventListener('wheel', handleScroll);
        viewport.value.addEventListener('mousedown', handleMouseDown);
    }
});

onBeforeUnmount(() => {
    // Clean up event listener
    if (zoomableBackground.value) {
        // zoomableBackground.value.removeEventListener('wheel', handleScroll);
        zoomableBackground.value.removeEventListener('mousedown', handleMouseDown);

    }
});

function print(...args) {
    console.log(...args);
}
</script>

<!-- ----------------------------------------------------------------------
                STYLE
----------------------------------------------------------------------- -->
<style src="@/assets/stylesheets/imge.css" scoped></style>

<style scoped>
</style>