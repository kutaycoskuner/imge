<script setup>

// state
import { imgeState } from '~/stores/imge';
const bank = imgeState();

// imports
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
// color mode
const colorMode = useColorMode()
const bank_colorMode = computed(() => bank.get_colorMode);


watch(bank_colorMode, (newMode) => {
        colorMode.value = newMode;
    }
    
);

</script>

<template>
    <LeftHoverNavigation />
    <AccessibilityUI/>
    some stuff
</template>

<style scoped>
@import "@/assets/stylesheets/blacksail_font.css";
@import "@/assets/stylesheets/wallpaper.css";

</style>