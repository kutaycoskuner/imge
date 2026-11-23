# Keyboard layout

A page for writing down what the keys of a keyboard do, for a game, a program, or your own setup: every key with and without modifiers (Shift, Ctrl, Alt and their combinations), coloured by category, on a picture of the keyboard and in a list. Layouts are kept as JSON files.

Page: **keyboard layout** in the top links (`/keyboard_layout`). State as of 2026-11-06 (keymap format version 1).

- [Using it](#using-it)
- [Layers (modifiers)](#layers-modifiers)
- [The keyboard](#the-keyboard)
- [Files](#files)
- [File format](#file-format)
- [Code](#code)
- [Ideas for later](#ideas-for-later)
- [Changes](#changes)

## Using it

| To | Do |
|---|---|
| bind a key | **Click it**, or **press it** on your keyboard: it is selected and the field for its layer takes your typing; type what it does, Enter. Pressing with modifiers (e.g. Shift+W) selects that layer |
| see a layer | click its chip (No modifier, Shift, Ctrl, Alt, Ctrl+Shift ...), or **hold** the modifier keys: the keyboard shows their layer while they are held |
| edit a key in every layer | the editor under the keyboard lists the selected key in all 8 layers at once: what it does, its category, × to remove it. Clicking a row's key caps shows that layer |
| colour by meaning | **Categories** (right of the editor): name and colour each, a count of their bindings; the colour is set with the graph editor's colour field (a click on the swatch opens the picker: saturation / brightness square, hue bar, tints and shades, presets; or type a hex), the keys follow live; **+ Add category**; × removes one (its bindings stay, without a category). A binding gets its category in the editor |
| find a binding | **All bindings** (bottom): every binding of every layer, grouped by category, as key caps and what it does; the search filters by action, key or modifier ("ctrl", "shift w"); a click shows it on the keyboard |
| name the layout | click the title at the top |
| open, save, examples, keyboard shape | the **Esc** menu or the **toolbar** at the bottom left, see [Files](#files) |
| read how it works | the Esc menu's **How to use** tab |

- On the keyboard, a key bound in the shown layer is drawn in its category's colour with what it does. Small letters in a key's top-right corner say which **other** modifier layers use it: `S` Shift, `C` Ctrl, `A` Alt, `CS` Ctrl+Shift, `CA`, `SA`, `CSA`. The modifier keys of the shown layer look pressed.
- Keys the browser keeps for itself can't be pressed into the page (Ctrl+W, Ctrl+T, Ctrl+N close or open tabs and windows; F11 full screen): click them instead. **Esc** opens the menu; click the Esc key to bind it.

## Layers (modifiers)

A layer is one combination of Ctrl, Shift and Alt; there are 8:

| Layer | Example |
|---|---|
| No modifier | `W` forward |
| Shift | `Shift+W` sprint forward |
| Ctrl | `Ctrl+Space` crouch jump |
| Alt | `Alt+Z` ping danger |
| Ctrl+Shift | `Ctrl+Shift+Z` clear pings |
| Ctrl+Alt | `Ctrl+Alt+1` quick message |
| Shift+Alt | |
| Ctrl+Shift+Alt | |

The chips show how many bindings each layer has. A modifier key itself can be bound too, e.g. `Shift` sprint, `Ctrl` crouch (in the No modifier layer).

## The keyboard

- **Full size:** function row, main block, navigation block with the arrows, and the numpad (Esc menu: **Numpad** on / off).
- **Shape:** **ANSI** (US: wide left Shift, `\` above Enter) or **ISO** (most of Europe, e.g. Turkish Q, German: an extra key left of Z, a tall Enter). The shape is stored in the layout file.
- **Keys are physical positions** (the browser's key *code*: `KeyW`, `Digit1`, `ShiftLeft`), not characters, so a layout means the same keys on every language setting; a game's WASD stays where it is on a Turkish Q or a German QWERTZ keyboard.
- **Labels:** in Chrome and Edge the keys show the characters of **your own** keyboard layout (the browser tells them: Turkish `Ğ Ü Ş İ Ö Ç`, upper case in your language, so `i` / `ı` become `İ` / `I`); other browsers show US labels. Esc menu: **Key labels from my keyboard layout** switches between the two.

## Files

**Toolbar** at the bottom left, placed and styled as the graph editor's (`.access-*` in `static/styles/imge.css`); hovering a button shows what it does in the hint line:

| Button | Does |
|---|---|
| gear | opens the Esc menu (settings, saved layouts and help) |
| ↑ | opens a layout file (`.json`) from your computer |
| disk | saves the open layout as a profile under its name, and changes then go into it (a name already saved asks to save over it); the result shows in the hint line |
| ↓ | downloads the open layout as `<name>.json` |

The **Esc menu** (**Esc** or the gear), in four tabs like the graph editor's menu:

- **Config**
    - **New layout** — an empty one (asks first when the open one has bindings; download it first to keep it).
    - **Open a file…** — a layout file (`.json`) from your computer. Or **drag and drop** it anywhere on the page (a dashed frame shows while it is dragged over).
    - **Download .json** — the open layout as `<name>.json`.
    - **Keyboard** — shape (ANSI / ISO), numpad, key labels.
- **Saved** — the profiles (layouts saved in this browser), see [Saved layouts (profiles)](#saved-layouts-profiles); the profile switch itself is at the top of **Config**.
- **Examples** — *FPS game (typical)* (movement, combat, weapons, interaction, chat, with Shift, Ctrl+Alt and Ctrl+Shift layers) and *imge graph editor* (this site's graph editor shortcuts). Files: `static/data/keymaps/`, listed in `static/data/keymaps/index.json`.
- **How to use** — short instructions: selecting and binding keys, layers, categories and the list, files (kept and saved in the browser, download, drag and drop, open), the toolbar and the menu.

The open layout is **kept in this browser** (`localStorage`, key `imge.keyboardLayout.keymap`) after every change, so a reload or a later visit continues where you were; the first visit opens the first example. Files are the way to keep layouts for good and to share them. View settings (numpad, labels) are kept too (`imge.keyboardLayout.view`).

### Saved layouts (profiles)

Several layouts kept in this browser under names ("loadouts"), e.g. one per game, used as **profiles**: one is active, and the open layout belongs to it.

- **switch**: the **Profile** list at the top of the Esc menu's Config tab (the tab it opens on), or **switch** in the Saved tab; the profile opens and becomes active
    - nothing is lost when switching: the active profile already holds every change (below), so there is no question; only when the open layout is in no profile and has bindings (a new layout, an example, a file) does it ask first
- **changes go into the active profile by themselves**: every edit (binding, category, name, keyboard shape) is saved into it as you make it; no save button needed
- **save as a profile**: **Save as new profile…** in Config, the Saved tab's name field (the open layout's name until you type another) and **Save as profile**, or the toolbar's disk button (saves under the layout's name); the open layout becomes that profile and active; a name already saved (any case) asks to **save over** that profile instead of adding a second one (no question for the active one)
- **new layout, examples, files** open outside the profiles: the active profile is left as it was, and the open layout is in no profile until saved as one (Config says so)
- **the Saved tab**: last saved first; each profile shows its name, its number of bindings, its keyboard shape and when it was saved; the active one is marked; per profile **switch** (or click the name), **save over** (the open layout replaces what it holds and it becomes active; asks), **rename** (a taken name gets a number: `Game (2)`), **download** (as `<its name>.json`, without opening it), **delete** (asks; the open layout stays, now in no profile if it was the active one)
- **where**: `localStorage`, key `imge.keyboardLayout.saved`: a list of `{ id, name, savedAt, keymap }`, each `keymap` in the [file format](#file-format); an entry that isn't a valid layout (broken, or from a newer version) is left out when reading, the others still show; the active profile's id: `imge.keyboardLayout.activeProfile` (remembered for the next visit)
- **limits**: at most 50 entries (delete one to save more); when the browser refuses to store (storage full, or blocked e.g. in a private window) the page says so and keeps the list as it was; download instead
- saved layouts belong to **this browser on this device and this site**: the keyboard-only site ([Keyboard site](keyboard-site.md)) has its own list, and clearing the site's data removes them; download to keep a layout elsewhere or to share it
- code: rules in `src/lib/keymap/saved.ts` (tests: `saved.spec.ts`), the profiles' behaviour (active profile, saving each change, switching, questions) in `store.ts` (tests: `store.spec.ts`), the switch in `KeymapMenu.svelte`, the tab in `KeymapSavedMenu.svelte`

A file that isn't a keyboard layout is refused with the reason (a graph file is pointed to the graph editor); a file from a newer version of the page is refused rather than guessed at.

## File format

```json
{
  "metadata": { "format": "imge-keymap", "version": 1, "name": "FPS game (typical)", "physical": "ansi" },
  "data": {
    "categories": [ { "id": "move", "name": "Movement", "color": "#0090ff" } ],
    "bindings": [
      { "key": "KeyW", "mods": [], "action": "Forward", "category": "move" },
      { "key": "KeyW", "mods": ["shift"], "action": "Sprint forward", "category": "move" }
    ]
  }
}
```

- `metadata.format` is always `imge-keymap`; `version` the format version (1); `name`; `physical`: `ansi` or `iso`. Other keys are kept.
- `categories[]`: `id` (referenced by bindings), `name`, `color` (`#rrggbb`).
- `bindings[]`: `key` (a KeyboardEvent code), `mods` (any of `ctrl`, `shift`, `alt`, written in that order), `action` (what it does), `category` (an id, or `null`).
- One binding per key and layer; a binding without an action is dropped; a category id that doesn't exist becomes `null`. Saved bindings are sorted by key and layer, so files compare well.

## Code

| File | Role |
|---|---|
| `src/lib/keymap/keymap.ts` | The data: layers, bindings, categories (pure functions), reading and writing files. Tests in `keymap.spec.ts`. |
| `src/lib/keymap/keyboards.ts` | The physical keyboards as data (ANSI, ISO, numpad): every key's code, US label, place and size in key units; `keyLabel`. |
| `src/lib/keymap/store.ts` | The page's state (open layout, layers, selected key, view), kept in the browser; opening, examples, downloading. |
| `src/lib/keymap/KeyboardView.svelte` | Draws the keyboard. |
| `src/lib/keymap/KeyEditor.svelte`, `CategoryList.svelte`, `BindingList.svelte` | The editor, the categories (colours with the graph editor's `PropColor` / `ColorPicker`), the list. |
| `src/lib/keymap/KeymapMenu.svelte`, `KeymapSavedMenu.svelte`, `KeymapExamplesMenu.svelte`, `KeymapHelpMenu.svelte` | The Esc menu's tabs: Config, Saved, Examples, How to use (the help text is a data list; keep it in step with this page). |
| `src/lib/keymap/saved.ts` | Saved layouts: reading the stored list, adding, saving over, renaming, removing (tests: `saved.spec.ts`). |
| `src/lib/icons/icon-gear.svelte`, `icon-floppy.svelte` | The toolbar's menu and save buttons. |
| `src/routes/keyboard_layout/+page.svelte` | The page: layer chips, keys pressed and held, dropping files. |

## Ideas for later

- More keyboards: TKL / 60 %, Mac (⌘ Cmd, ⌥ Option), split and ortholinear keyboards; mouse buttons.
- The Win / Cmd key as a fourth modifier.
- Print / image export of a layer, a cheat sheet of all layers.
- Undo / redo; several layouts side by side to compare.
- Import from games' config files.

## Shared on its own

The page also runs alone, without the rest of imge or personal links, on a self-hosted server: [Keyboard site](keyboard-site.md).

## Changes

- 2026-11-23 — saved layouts work as profiles: a profile switch at the top of the Esc menu (Config), the active profile takes every change by itself, switching never asks or loses anything, new / example / file open outside the profiles
- 2026-11-23 — saved layouts ("loadouts"): several named layouts kept in this browser, a Saved tab (open, save over, rename, download, delete) and a save button in the toolbar
- 2026-11-15 — toolbar at the bottom left as in the graph editor (menu, open, download, with hover hints); the Esc menu in tabs: Config, Examples, How to use (instructions, incl. drag and drop and download)
- 2026-11-07 — also served alone on a self-hosted server ([Keyboard site](keyboard-site.md))

- 2026-11-06 — first version: keyboard layout page (ANSI / ISO full-size keyboard with numpad, 8 modifier layers, categories with colours (the graph editor's colour picker), key editor for every layer, list with search, pressing and holding real keys, labels from the user's own layout); keymap format version 1; JSON open / drop / download, kept in the browser; examples FPS game and imge graph editor
