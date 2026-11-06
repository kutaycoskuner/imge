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
| open, save, examples, keyboard shape | the **Esc** menu, see [Files](#files) |

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

The Esc menu (**Esc**):

- **New layout** — an empty one (asks first when the open one has bindings; download it first to keep it).
- **Open a file…** — a layout file (`.json`) from your computer. Or **drop** it anywhere on the page (a dashed frame shows while it is dragged over).
- **Download .json** — the open layout as `<name>.json`.
- **Examples** — *FPS game (typical)* (movement, combat, weapons, interaction, chat, with Shift, Ctrl+Alt and Ctrl+Shift layers) and *imge graph editor* (this site's graph editor shortcuts). Files: `static/data/keymaps/`, listed in `static/data/keymaps/index.json`.
- **Keyboard** — shape (ANSI / ISO), numpad, key labels.

The open layout is **kept in this browser** (`localStorage`, key `imge.keyboardLayout.keymap`) after every change, so a reload or a later visit continues where you were; the first visit opens the first example. Files are the way to keep layouts for good and to share them. View settings (numpad, labels) are kept too (`imge.keyboardLayout.view`).

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
| `src/lib/keymap/KeymapMenu.svelte` | The Esc menu. |
| `src/routes/keyboard_layout/+page.svelte` | The page: layer chips, keys pressed and held, dropping files. |

## Ideas for later

- More keyboards: TKL / 60 %, Mac (⌘ Cmd, ⌥ Option), split and ortholinear keyboards; mouse buttons.
- The Win / Cmd key as a fourth modifier.
- Print / image export of a layer, a cheat sheet of all layers.
- Undo / redo; several layouts side by side to compare.
- Import from games' config files.

## Changes

- 2026-11-06 — first version: keyboard layout page (ANSI / ISO full-size keyboard with numpad, 8 modifier layers, categories with colours (the graph editor's colour picker), key editor for every layer, list with search, pressing and holding real keys, labels from the user's own layout); keymap format version 1; JSON open / drop / download, kept in the browser; examples FPS game and imge graph editor
