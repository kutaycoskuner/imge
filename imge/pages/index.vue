<!-- ----------------------------------------------------------------------
                template
----------------------------------------------------------------------- -->
<template>
    <div class="viewport" ref="viewport">
        <div class="zoomable-background" ref="zoomableBackground">
            <div class="content">
                <!-- Render nodes  -->
                <div v-for="node in nodes" :key="node._id" class="node hover-control" :style="{
                    left: node.position.x + base_offset_x + 'px',
                    top: -(node.position.y - base_offset_y) + 'px'
                }" @mousedown="handleNodeMouseDown($event, node)" @mouseover="getNodeRelativeMouseCoords($event)">
                    <h3>{{ node.data.title }}</h3>

                    <!-- Dot in the middle of the edge line -->
                    <div class="inputs">
                        <div v-for="(input, index) in node.data.inputs" :id="`node${node._id}_${input.id}`"
                            :key="input.id" class="node-input">
                        </div>
                        <div class="indicator-io add-input hover-visible"> </div>
                    </div>

                    <div class="outputs">
                        <!-- Render output entry points -->
                        <div v-for="(output, index) in node.data.outputs" :id="`node${node._id}_${output.id}`"
                            :key="output.id" class="node-output">
                        </div>
                        <div class="indicator-io add-output hover-visible"> </div>
                    </div>

                    <div class="content">
                        <div class="add-content hover-visible"> </div>
                    </div>
                </div>
            </div>


            <!-- SVG for links -->
            <svg class="connections" ref="connectionsSvg">
                <line v-for="(link, index) in links" :key="index" stroke="currentColor" stroke-width="2" />
            </svg>
        </div>

        <div class="polka-dots" ref="background"></div>
    </div>

    <CoordTracker />
    <AccessibilityUI />

</template>

<!-- ----------------------------------------------------------------------
                scripts
----------------------------------------------------------------------- -->
<script setup>
// state
import { imgeState } from '~/stores/imge';
const bank = imgeState();

// imports
import data_json from '@/data/test_node-graph2.json';
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';

// color mode
const colorMode = useColorMode()

// computed
const base_offset_x = computed(() => bank.get_coordsBaseXOffset);
const base_offset_y = computed(() => bank.get_coordsBaseYOffset);
const offset_x = computed(() => bank.get_coordsStateXOffset);
const offset_y = computed(() => bank.get_coordsStateYOffset);

// reactive data
const nodes = ref(data_json.data.nodes);
const links = ref(data_json.data.links);
const viewport = ref(null);
const zoomableBackground = ref(null);
const background = ref(null);

const zoomLevel = ref(1); // Initial zoom level (100%)

const panStart = ref({ x: 0, y: 0 });
const panOffset = ref({ x: 0, y: 0 });
const bgOffset = ref({ x: 0, y: 0 });

const nodeRelativeXPos = ref(0);
const nodeRelativeYPos = ref(0);


// ---------------------------------------------------------------------------------------
//              functions
// ---------------------------------------------------------------------------------------

// Function to get the position of a node output
const getNodeIOPosition = (nodeId, ioId) => {
    const node = nodes.value.find(n => n._id === nodeId);

    const offset_x = bank.get_coordsStateXOffset;
    const offset_y = bank.get_coordsStateYOffset;

    if (!node)
        return { x: 0, y: 0 };

    const nodeElement = document.getElementById(
        `node${nodeId}_${ioId}`
    );

    if (!nodeElement) return { x: 0, y: 0 };
    const rect = nodeElement.getBoundingClientRect();
    return {
        x: (rect.left + rect.width / 2),
        y: (rect.top + rect.height / 2)
    };
};

function getNodeRelativeMouseCoords(event) {
    // Get the bounding box of the node
    const rect = event.target.getBoundingClientRect();

    // Calculate the node's center
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate the mouse's position relative to the center of the node
    nodeRelativeXPos.value = event.clientX - centerX;
    nodeRelativeYPos.value = -(event.clientY - centerY);

    // Debugging or logging (optional)
    // console.log(`xPos: ${nodeRelativeXPos.value}, yPos: ${nodeRelativeYPos.value}`);
}

const handleScroll = (event) => {
    const maxZoom = 4.0;    // Maximum zoom level (200%)
    const minZoom = 0.04;    // Minimum zoom level (50%)
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
        node.position.x += dx / zoomLevel.value;
        node.position.y -= dy / zoomLevel.value;

        // Update start position for next movement
        panStart.value = { x: moveEvent.clientX, y: moveEvent.clientY };

        updateTransform();
        updateAllLinks();

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
        bank.set_coordsStateXOffset(panOffset.value.x);
        bank.set_coordsStateYOffset(panOffset.value.y);
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
    if (zoomableBackground.value && background.value) {
        // Apply scaling to the zoomableBackground
        zoomableBackground.value.style.transform = `scale(${zoomLevel.value})`;
        background.value.style.transform = `scale(${zoomLevel.value})`;

        // Apply translation to the content (nodes and links)
        const content = zoomableBackground.value.querySelector('.content');
        if (content) {
            content.style.transform = `translate(${panOffset.value.x}px, ${panOffset.value.y}px)`;
        }

        // Apply the inverse of the zoom to keep the SVG lines' stroke width consistent
        const connections = zoomableBackground.value.querySelector('.connections');
        if (connections) {
            connections.style.transform = `scale(${1 / zoomLevel.value})`;
        }
        updateAllLinks(); // <-- Make sure to update links after transform
    }
};

const updateAllLinks = () => {
    links.value.forEach(link => {
        const sourcePosition = getNodeIOPosition(link.sourceNodeId, link.sourceOutputId);
        const targetPosition = getNodeIOPosition(link.targetNodeId, link.targetInputId);
        const linkElement = document.querySelector(`line:nth-child(${links.value.indexOf(link) + 1})`);
        if (linkElement) {
            // Adjust link positions considering the current zoom level and pan offset
            const adjustedSourceX = (sourcePosition.x);// + panOffset.value.x;
            const adjustedSourceY = (sourcePosition.y);// + panOffset.value.y;
            const adjustedTargetX = (targetPosition.x);// + panOffset.value.x;
            const adjustedTargetY = (targetPosition.y);// + panOffset.value.y;

            // Set the attributes for the line position
            linkElement.setAttribute('x1', adjustedSourceX);
            linkElement.setAttribute('y1', adjustedSourceY);
            linkElement.setAttribute('x2', adjustedTargetX);
            linkElement.setAttribute('y2', adjustedTargetY);
        }
    });
};

const positionAdjustment = (e) => {
    e.position.x += base_offset_x;
    e.position.y += base_offset_y;
}


// ---------------------------------------------------------------------------------------
//              lifecycle
// ---------------------------------------------------------------------------------------
onMounted(() => {
    // const e = document.getElementById('node0_output_0');
    // print(e)

    nextTick(() => {
        // Perform calculations or adjustments here
        updateAllLinks();
    });


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
    () => bank.get_colorMode,
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