import { writable } from 'svelte/store';

// State (Writable Stores)
export const screenSize         = writable<number>(1920);
export const screenSizeName     = writable<string>("pc");  // "pc" "tablet" "mobile"
export const screenSizeIndex    = writable<number>(2);     // 2 = pc, 1 = tablet, 0 = mobile

export const colorMode          = writable<string>("dark");
export const assistanceMsg      = writable<string>("");

export const zoomLevel          = writable<number>(1);
export const coordsBaseXOffset  = writable<number>(0);      // base offset based on screen size
export const coordsBaseYOffset  = writable<number>(0);      // set once and dont change
export const coordsStateXOffset = writable<number>(0);      // offset from origin on current state
export const coordsStateYOffset = writable<number>(0);      // ! mouse position calculated directly in page
export const tempDragStartX     = writable<number>(0);
export const tempDragStartY     = writable<number>(0);

// Single store for both x and y offsets
// export const coordBaseOffset  = writable<{ x: number; y: number }>({ x: 0, y: 0 });
// export const coordsStateOffset = writable<{ x: number; y: number }>({ x: 0, y: 0 });