import { defineStore } from 'pinia';
import AssistanceMessage from '~/components/AssistanceMessage.vue';

export const imgeState = defineStore("imgeStore", {
    state: () => ({
        screenSize              : 1920,
        screenSizeName          : "pc",  // "pc" "tablet" "mobile"
        screenSizeIndex         : 2,     // 2 pc 1 tablet 0 mobile

        colorMode               : 'dark',
        assistanceMsg       : "",

        zoomLevel               : 1,
        coords_base_x_offset    : 0,
        coords_base_y_offset    : 0,
        coords_state_x_offset   : 0,
        coords_state_y_offset   : 0,

        // Uncomment if needed
        // isOverlayVisible        : true,
        // isSettingsVisible       : true,
        // mainSelectionName       : "",
        // sub1SelectionName       : "",
    }),

    // Getters
    getters: {
        get_screenSize(state) {
            return state.screenSize;
        },
        get_screenSizeName(state) {
            return state.screenSizeName;
        },
        get_screenSizeIndex(state) {
            return state.screenSizeIndex;
        },
        get_colorMode(state) {
            return state.colorMode;
        },
        get_assistanceMsg(state) {
            return state.assistanceMsg;
        },
        get_zoomLevel(state) {
            return state.zoomLevel;
        },
        get_coordsBaseXOffset(state) {
            return state.coords_base_x_offset;
        },
        get_coordsBaseYOffset(state) {
            return state.coords_base_y_offset;
        },
        get_coordsStateXOffset(state) {
            return state.coords_state_x_offset;
        },
        get_coordsStateYOffset(state) {
            return state.coords_state_y_offset;
        }
    },

    // Actions
    actions: {
        set_screenSize(val: number) {
            this.screenSize = val;
        },
        set_screenSizeName(val: string) {
            this.screenSizeName = val;
        },
        set_screenSizeIndex(val: number) {
            this.screenSizeIndex = val;
        },
        set_colorMode(val: string) {
            this.colorMode = val;
        },
        set_assistanceMsg(val: string) {
            this.assistanceMsg = val;
        },
        set_zoomLevel(val: number) {
            val < 0.16 ? val = 0.16 : val = val;
            val > 2.00 ? val = 2.00 : val = val;
            this.zoomLevel = val;

        },
        set_coordsBaseXOffset(val: number) {
            this.coords_base_x_offset = val;
        },
        set_coordsBaseYOffset(val: number) {
            this.coords_base_y_offset = val;
        },
        set_coordsStateXOffset(val: number) {
            this.coords_state_x_offset = val;
        },
        set_coordsStateYOffset(val: number) {
            this.coords_state_y_offset = val;
        }
    },
});
