import { writable } from 'svelte/store';

// State (Writable Stores)
const screenSize = writable<number>(1920);
const screenSizeName = writable<string>("pc");  // "pc" "tablet" "mobile"
const screenSizeIndex = writable<number>(2);     // 2 = pc, 1 = tablet, 0 = mobile

const colorMode = writable<string>("dark");
const assistanceMsg = writable<string>("");

const zoomLevel = writable<number>(1);
const coordsBaseXOffset = writable<number>(0);
const coordsBaseYOffset = writable<number>(0);
const coordsStateXOffset = writable<number>(0);
const coordsStateYOffset = writable<number>(0);

// Store function (with TypeScript typings)
export const imgeState = () => {
  return {
    // Getters (using $store in the component)
    get_screenSize: (): number => {
      let value: number = 0;
      screenSize.subscribe(($screenSize) => {
        value = $screenSize;
      });
      return value;
    },

    get_screenSizeName: (): string => {
      let value: string = "";
      screenSizeName.subscribe(($screenSizeName) => {
        value = $screenSizeName;
      });
      return value;
    },

    get_screenSizeIndex: (): number => {
      let value: number = 0;
      screenSizeIndex.subscribe(($screenSizeIndex) => {
        value = $screenSizeIndex;
      });
      return value;
    },

    get_colorMode: (): string => {
      let value: string = "";
      colorMode.subscribe(($colorMode) => {
        value = $colorMode;
      });
      return value;
    },

    get_assistanceMsg: (): string => {
      let value: string = "";
      assistanceMsg.subscribe(($assistanceMsg) => {
        value = $assistanceMsg;
      });
      return value;
    },

    get_zoomLevel: (): number => {
      let value: number = 0;
      zoomLevel.subscribe(($zoomLevel) => {
        value = $zoomLevel;
      });
      return value;
    },

    get_coordsBaseXOffset: (): number => {
      let value: number = 0;
      coordsBaseXOffset.subscribe(($coordsBaseXOffset) => {
        value = $coordsBaseXOffset;
      });
      return value;
    },

    get_coordsBaseYOffset: (): number => {
      let value: number = 0;
      coordsBaseYOffset.subscribe(($coordsBaseYOffset) => {
        value = $coordsBaseYOffset;
      });
      return value;
    },

    get_coordsStateXOffset: (): number => {
      let value: number = 0;
      coordsStateXOffset.subscribe(($coordsStateXOffset) => {
        value = $coordsStateXOffset;
      });
      return value;
    },

    get_coordsStateYOffset: (): number => {
      let value: number = 0;
      coordsStateYOffset.subscribe(($coordsStateYOffset) => {
        value = $coordsStateYOffset;
      });
      return value;
    },

    // Setters (Actions) with type-safe parameter definitions
    set_screenSize: (val: number): void => screenSize.set(val),
    set_screenSizeName: (val: string): void => screenSizeName.set(val),
    set_screenSizeIndex: (val: number): void => screenSizeIndex.set(val),
    set_colorMode: (val: string): void => colorMode.set(val),
    set_assistanceMsg: (val: string): void => assistanceMsg.set(val),

    set_zoomLevel: (val: number): void => zoomLevel.set(Math.max(0.16, Math.min(2.0, val))), // Ensures min 0.16, max 2.00

    set_coordsBaseXOffset: (val: number): void => coordsBaseXOffset.set(val),
    set_coordsBaseYOffset: (val: number): void => coordsBaseYOffset.set(val),
    set_coordsStateXOffset: (val: number): void => coordsStateXOffset.set(val),
    set_coordsStateYOffset: (val: number): void => coordsStateYOffset.set(val),
  };
};
