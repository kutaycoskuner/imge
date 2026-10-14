// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-14
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// imge_main.ts -- app-wide UI state (screen size, color mode, assistance message).
// The graph editor's camera (pan + zoom) lives in $lib/camera.ts.
import { writable } from 'svelte/store';

// State (Writable Stores)
export const screenSize         = writable<number>(1920);
export const screenSizeName     = writable<string>("pc");  // "pc" "tablet" "mobile"
export const screenSizeIndex    = writable<number>(2);     // 2 = pc, 1 = tablet, 0 = mobile

export const colorMode          = writable<string>("dark");
export const assistanceMsg      = writable<string>("");