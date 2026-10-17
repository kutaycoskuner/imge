// -----------------------------------------------------------------------------------------
//   author          : Kutay Coskuner
//   ai-contributors : unknown (before 2026-10-14), Claude Opus 5.5 (claude-opus-5-5)
//   last update     : 2026-10-16
//   disclaimer      : Provided as is, without warranty of any kind; use at your own risk.
//                     Check outputs before relying on them.
// -----------------------------------------------------------------------------------------
// imge_main.ts -- app-wide UI state (screen size, color mode, assistance message, the
// Esc menu). The graph editor's camera (pan + zoom) lives in $lib/camera.ts.
import { writable } from 'svelte/store';
import type { Component } from 'svelte';

// State (Writable Stores)
export const screenSize         = writable<number>(1920);
export const screenSizeName     = writable<string>("pc");  // "pc" "tablet" "mobile"
export const screenSizeIndex    = writable<number>(2);     // 2 = pc, 1 = tablet, 0 = mobile

export const colorMode          = writable<string>("dark");
export const assistanceMsg      = writable<string>("");

// Esc menu (SettingsOverlay): open state, and the menu the current page puts into it.
// A page sets pageMenu on mount and clears it on destroy; null shows the default menu.
// A menu is one component, or tabs shown by a switch in its header (menuTab: the open
// tab's id, remembered per page; null or an unknown id opens the first tab).
export interface PageMenuTab    { id: string; label: string; component: Component<any>; }
export interface PageMenu       { title: string; component?: Component<any>; tabs?: PageMenuTab[]; }
export const menuOpen           = writable<boolean>(false);
export const pageMenu           = writable<PageMenu | null>(null);
export const menuTab            = writable<string | null>(null);