<template>
    <div class="viewport" ref="viewport">
        <div class="zoomable-background" ref="zoomableBackground">
            <div class="content">
                <!-- Render nodes  -->
                <div v-for="node in nodes" :key="node._id" class="node" :style="{
                    left: node.position.x + base_offset_x + 'px',
                    top: -(node.position.y - base_offset_y) + 'px'
                }" @mousedown="handleNodeMouseDown($event, node)">
                    <h3>{{ node.data.title }}</h3>
                </div>
            </div>
        </div>
        <div class="polka-dots" ref="background"></div>
    </div>

    <CoordTracker />
    <AccessibilityUI />

</template>

<script setup>
// state
import { imgeState } from '~/stores/imge';
const imState = imgeState();

// imports
import data_json from '@/data/test_node-graph.json';
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';

// color mode
const colorMode = useColorMode()

// computed
const base_offset_x = computed(() => imState.get_coordsBaseXOffset);
const base_offset_y = computed(() => imState.get_coordsBaseYOffset);

// reactive data
const nodes = ref(data_json.data.nodes);
const viewport = ref(null);
const zoomableBackground = ref(null);
const background = ref(null);

const zoomLevel = ref(1); // Initial zoom level (100%)

const panStart = ref({ x: 0, y: 0 });
const panOffset = ref({ x: 0, y: 0 });
const bgOffset = ref({ x: 0, y: 0 });


// ____functions
const handleScroll = (event) => {
    const maxZoom = 1.2;    // Maximum zoom level (200%)
    const minZoom = 0.4;    // Minimum zoom level (50%)
    const zoomStep = 0.001; // Zoom step size
    event.preventDefault();

    // Determine zoom change based on scroll direction
    const zoomChange = event.deltaY * -zoomStep;
    zoomLevel.value = Math.min(
        Math.max(zoomLevel.value + zoomChange, minZoom),
        maxZoom
    );

    updateTransform();  // <-- Call to updateTransform
};

const handleNodeMouseDown = (event, node) => {
    event.preventDefault();
    panStart.value = { x: event.clientX, y: event.clientY };

    const onNodeMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - panStart.value.x;
        const dy = moveEvent.clientY - panStart.value.y;

        // Update node position based on mouse movement
        node.position.x += dx;
        node.position.y -= dy;

        // Update start position for next movement
        panStart.value = { x: moveEvent.clientX, y: moveEvent.clientY };
    };

    const onNodeMouseUp = () => {
        document.removeEventListener('mousemove', onNodeMouseMove);
        document.removeEventListener('mouseup', onNodeMouseUp);
    };

    document.addEventListener('mousemove', onNodeMouseMove);
    document.addEventListener('mouseup', onNodeMouseUp);
};

const handleMouseDown = (event) => {
    event.preventDefault();
    panStart.value = { x: event.clientX, y: event.clientY };

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
        imState.set_coordsStateXOffset(panOffset.value.x);
        imState.set_coordsStateYOffset(panOffset.value.y);
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
    colorMode.value = imState.get_colorMode;
    if (viewport.value) {
        viewport.value.addEventListener('wheel', handleScroll);
        viewport.value.addEventListener('mousedown', handleMouseDown);
    }
});

onBeforeUnmount(() => {
    if (zoomableBackground.value) {
        zoomableBackground.value.removeEventListener('wheel', handleScroll);
        zoomableBackground.value.removeEventListener('mousedown', handleMouseDown);
    }
});

watch(
    () => imState.get_colorMode,
    (newMode) => {
        colorMode.value = newMode;
    }
);

</script>

<!-- ----------------------------------------------------------------------
                STYLE
----------------------------------------------------------------------- -->
<style src="@/assets/stylesheets/imge.css" scoped></style>

<style scoped></style>