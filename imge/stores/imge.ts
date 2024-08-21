import { defineStore } from 'pinia';

export const imgeState = defineStore("imgeStore", {
    state: () => ({
        screenSize              : 1920,
        screenSizeName          : "pc",  // "pc" "tablet" "mobile"
        screenSizeIndex         : 2,     // 2 pc 1 tablet 0 mobile

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
