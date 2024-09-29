<!-- Component Template 1.3 -->
<!-- ----------------------------------------------------------------------
        SCRIPT
----------------------------------------------------------------------- -->
<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

// Access the store's state
import { imgeState } from '~/stores/imge';
const ibank = imgeState();

// reactive data
const assistanceMsg = computed(() => ibank.get_assistanceMsg);

</script>

<!-- ----------------------------------------------------------------------
        TEMPLATE
----------------------------------------------------------------------- -->
<template>
    <div class="assistance-msg">
        {{ assistanceMsg }}
    </div>
</template>


<!-- ----------------------------------------------------------------------
        STYLE
----------------------------------------------------------------------- -->
<style scoped>
@media (max-width: 480px) {}

@media (min-width: 481px) and (max-width: 1024px) {}

@media (min-width: 1025px) {
    .assistance-msg {
        user-select: none;
        font-size: .9em;
        font-weight: 600;
        text-transform: uppercase;
        position: fixed;
        top: -10%;
        left: -50%;
        width: 200%;
        height: 200%;
        /* transform: translate(-50%, -50%); */
        display: flex;
        justify-content: center;
        align-items: center;
    }

}
</style>
