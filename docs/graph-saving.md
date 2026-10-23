# Saving graphs and the Esc menu

How the graph editor opens and saves graphs on your computer, what it remembers and where, and how each page gets its own Esc menu.

State as of 2026-10-23.

- [Opening and saving](#opening-and-saving)
    - [Which files are listed](#which-files-are-listed)
    - [With folder access (Chrome, Edge)](#with-folder-access-chrome-edge)
    - [Read-only folder (Firefox, Safari)](#read-only-folder-firefox-safari)
    - [What is stored where](#what-is-stored-where)
- [The Esc menu](#the-esc-menu)
    - [A menu for each page](#a-menu-for-each-page)
- [Functions](#functions)
- [Known limits](#known-limits)

## Opening and saving

You point the editor at a folder on your computer; the imge graphs in it are listed by name and open with a click. Graphs are never stored inside the browser.

Open the menu with **Esc**, or with the toolbar's open button (the arrow pointing up). The editor starts with the base graph (the feature map in `static/data/test-node-graph.json`); your own graphs are opened from the menu.

### Which files are listed

- Only `.json` files **directly in the chosen folder** (subfolders aren't searched) that are **imge graphs**: their `metadata.format` is `imge-graph`, or they are old unversioned graphs (see [graph-format.md](graph-format.md)).
- Each is shown by its name (the file name without `.json`) with its node count, e.g. `feature map · 34 nodes`.
- Other `.json` files are not listed, and not hidden silently either: the menu says how many were skipped ("1 other .json file in this folder isn't an imge graph").
- Clicking a name opens that graph; older format versions are upgraded on load.

### With folder access (Chrome, Edge)

The folder is read and written directly.

| Step | What happens |
|---|---|
| **Choose folder…** | Pick a folder in the browser's folder dialog. The imge graphs in it are listed. |
| Remember this folder for next time? | Asked right after choosing. **Yes** stores access to the folder in this browser (see [What is stored where](#what-is-stored-where)); **No** keeps it for this visit only. |
| **Edit folder…** | Point the editor at another folder (the folder dialog opens again). |
| **Remove saved folder** | Deletes the remembered folder from the browser; it's no longer offered next time. Your files are not touched. |
| **Reopen "*folder*"** | On a later visit, when a folder was remembered. The browser asks once to allow access again, then the graphs are listed. |
| **Save** (<kbd>Ctrl</kbd>+<kbd>S</kbd>) | Writes the open graph back to its file. Enabled once the graph has a file name; pressing Ctrl+S before that opens the menu so you can choose a folder or use Save as. |
| **Save as** | Type a name (`.json` is added; characters not allowed in file names become `-`) and the graph is saved under it in the folder. Left empty, it uses the default name shown in the field: `imgegraph-<date>-<NN>`, e.g. `imgegraph-20261014-01`, with the first number not yet in the folder. Asks before overwriting any existing file. |
| **New graph** (<kbd>Shift</kbd>+<kbd>N</kbd>) | Starts an empty graph without a file name (asks first if the open graph has unsaved changes); the folder stays chosen, so Save as puts it there. Available in every browser. |
| ☐ **Autosave** | Off by default. When on, the open file is saved 0.8 s after the last change (so a drag saves once, not on every frame). The setting is kept in this browser. |
| • unsaved changes | Shown next to the graph name when it changed since it was opened or saved (undoing back to that state removes it again). Opening another graph then asks first. |

All results and errors (saved, couldn't open, access not allowed ...) appear as a line at the bottom of the menu.

### Read-only folder (Firefox, Safari)

These browsers let a page **read** a folder you pick, but never write to it or remember it. The menu says so in one line. There:

- **Choose folder…** / **Edit folder…** picks a folder each visit; the imge graphs in it are listed the same way, marked "(read only)", and open with a click.
- **Save (download)** (<kbd>Ctrl</kbd>+<kbd>S</kbd>) / **Save as (download)** downloads the updated graph under its file name; put it back into the folder yourself.
- There's no "remember" and no autosave, since the browser can't write to the folder.
- **Open a single file…** uploads one graph file, without choosing a folder.

The toolbar's export button (the arrow pointing down), the menu's **Download a copy** and <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> always download, in every browser. A graph that doesn't have a file yet downloads as `imgegraph-<date>-<NN>.json` (e.g. `imgegraph-20261014-01.json`); the number counts up with each such download and starts again at `01` the next day.

### What is stored where

| What | Where | Sent anywhere? |
|---|---|---|
| Your graphs | The `.json` files in the folder you chose, on your computer. | No. |
| Access to the folder ("remember") | A folder handle in the browser's IndexedDB storage (`imge` database), only after you answer **Yes**. A cookie can't hold folder access, and browsers never tell a page a folder's real path; the handle is the browser's safe equivalent. | No. |
| Autosave on/off | `localStorage` key `imge.graphEditor.autosave`. | No. |
| Last open menu tab | `localStorage` key `imge.menuTab.<page title>`, e.g. `imge.menuTab.Graph editor`. | No. |
| Last default download number of the day | `localStorage` key `imge.graphEditor.downloadCounter` (the browser can't see your downloads folder, so it counts here). | No. |

Clearing the site's data in the browser removes the remembered folder and the autosave setting; your files stay where they are.

## The Esc menu

- **Esc** opens and closes the menu on every page; so does the menu's Close button (shown as "Close <kbd>Esc</kbd>").
- In the graph editor, Esc first cancels what's in progress, and only opens the menu when nothing is:
    - while dragging a new link: cancels the drag
    - while editing a title: cancels the edit
- While the menu is open, the editor's shortcuts are paused (typing a file name doesn't add or delete nodes).
- The graph editor's menu has three tabs, switched at the top right of the menu (a segmented switch: the outer corners slightly rounded, the middle square, the open tab faintly tinted cerulean). The menu takes at most 80% of the window's height and scrolls when it is taller (title and switch stay at the top). The tab you used last is opened again, also after a reload; the toolbar's open button and Ctrl+S without a file go straight to Config.
    - **Config:** folder, graphs in the folder, save, the graph's direction, links, new graph and download (everything described on this page).
    - **Examples:** one example graph per kind of graph (see [graph-types.md](graph-types.md)), under category headings (**Mind mapping**, **Math**, **Circuits**, **Software architecture**, **Other**; `category` per example and the order in `categories` in `index.json`), as cerulean chips with the name (the kind of graph and the description in the hover text), each with its description under it, in columns (the tab is 60% of the window wide on wide screens, so all examples fit without scrolling; one column in narrow windows). Kinds the editor can't draw yet are **sketches** (a small dashed "sketch" tag): drawn with basic nodes to show what the type is about. A click opens it without a file name (asks first if the open graph has unsaved changes); Save as in Config stores it in your folder under a name of your own. The examples are `static/data/examples/*.json`, listed in `static/data/examples/index.json`; the Feature map (the start graph) is listed first.
    - **Keybindings:** every shortcut as key caps and the mouse actions (the same as [graph-editing.md](graph-editing.md#mouse-and-keys), shorter).
- The Config tab also has a **Graph** section with the direction (left-to-right / top-to-bottom; Transpose turns the layout, see [graph-editing.md](graph-editing.md#direction-and-transpose)), and a **Links** section: "Show all links as …" and "Show all arrows as …" (display only, not saved in the graph), "Apply shape / arrow to all links" (writes into every link) and the direction-chevrons toggle; see [graph-editing.md](graph-editing.md#link-shapes).

### A menu for each page

`SettingsOverlay.svelte` (mounted once in `src/routes/+layout.svelte`) is the frame. Each page can put its own menu into it:

1. Write the menu as a component, e.g. `src/lib/components/<Page>Menu.svelte`.
2. In the page, register it on mount and remove it when the page closes:
    ```ts
    import { pageMenu, menuOpen } from '../../stores/imge_main';
    import MyPageMenu from '$lib/components/MyPageMenu.svelte';

    onMount(() => {
        pageMenu.set({ title: 'My page', component: MyPageMenu });
        return () => {
            pageMenu.set(null);
            menuOpen.set(false);
        };
    });
    ```
3. For tabs, give `tabs` instead of `component`; a switch appears in the menu's header (with more than one tab), and `menuTab` holds the open tab's id (set it to open a given tab from code):
    ```ts
    pageMenu.set({
        title: 'My page',
        tabs: [
            { id: 'config', label: 'Config', component: MyConfigMenu },
            { id: 'help', label: 'Help', component: MyHelpMenu }
        ]
    });
    ```
4. If the page uses Esc itself, listen in the capture phase (`<svelte:window on:keydown|capture={...} />`) and call `event.preventDefault()` when the key press was used; the menu ignores Esc presses that were already used.

Pages without their own menu (currently the matrix and CSV pages) show the default menu.

Note: buttons are reset globally in `static/styles/settings_overlay.css` (`button { all: unset }`), so a page menu styles its own buttons.

## Functions

All in `src/lib/graph/file-access.ts`; the `workspace` store holds the state the menu shows.

| Function | Does |
|---|---|
| `initWorkspace()` | Checks folder-access support, reads the autosave setting and the remembered folder's name. Called once by the page. |
| `loadGraph(raw, fileName)` | Upgrades parsed file content to the current format and makes it the open graph. Throws `GraphFormatError` for files that aren't graphs or are from a newer app. |
| `trackChanges()` | Marks the graph as having unsaved changes after each edit and runs autosave. Returns a function that stops it. |
| `chooseFolder()` | Opens the folder dialog, lists the folder's graphs and asks whether to remember it. |
| `rememberFolder(yes)` | Answer to "remember this folder?": stores the handle in IndexedDB on yes. |
| `reopenRememberedFolder()` | Asks the browser for access to the remembered folder again (must run from a click). |
| `forgetFolder()` | "Remove saved folder": deletes the remembered folder from IndexedDB. |
| `chooseFolderReadOnly()` | Read-only folder pick for browsers without folder access (a directory file input); lists the imge graphs directly in it. |
| `refreshFiles()` | Re-reads the folder and lists its imge graphs (`GraphEntry`: file name, name, node count); counts other `.json` files in `skipped`. |
| `openFile(fileName)` | Opens a graph from the folder (writable or read-only); asks first if there are unsaved changes. |
| `save()` / `saveAs(name)` | Writes the open graph (as the current format version) to its file / under a new name; in a read-only folder they download instead. |
| `defaultGraphName(taken?, date?, start?)` | `imgegraph-YYYYMMDD-NN` with the first number from `start` not in `taken`. |
| `normalizeFileName(input)` | Turns typed text into a safe `.json` file name, or `null` if nothing usable is left. |
| `setAutosave(on)` | Turns autosave on or off and keeps the setting. |
| `uploadGraph()` / `downloadGraph()` | Open by upload / save by download, for browsers without folder access and the toolbar's export. |
| `listExamples()` | Reads `data/examples/index.json`: the example graphs (`ExampleGraph`: name, kind, file, description). |
| `openExample(example)` | Opens an example graph without a file name; asks first if there are unsaved changes. |

## Known limits

- Writing to a folder and remembering it work in Chrome and Edge (desktop) only; Firefox and Safari read the folder and save by download.
- Only `.json` files directly in the chosen folder are listed; subfolders are not searched.
- Every `.json` in the folder is read once to check it, so a folder with very many large files lists slowly.
- Not covered by unit tests (it needs a real browser). Checked in headless Edge: the writable folder with the folder dialog replaced by a folder in the browser's private storage, and the read-only mode with folder access switched off.

## Changes

- 2026-10-23 — Examples tab: category headings (Mind mapping, Math, Circuits, Software architecture, Other); the kind moved into the chip's hover text so the tab fits without scrolling
- 2026-10-21 — Examples tab: entries in columns (60% of the window wide), descriptions under the chips, "sketch" tag for types the editor can't draw yet; 17 examples (9 new sketches)
- 2026-10-17 — undoing back to the opened or saved graph clears the unsaved marker; loading a graph clears the undo history
- 2026-10-16 — the menu's tabs Config / Examples / Keybindings (switch at the top right, last tab remembered); Examples: example graphs, one per kind of graph, as cerulean chips that open without a file name; page menus fit the window up to 1024 px wide (they started off-screen to the left), take at most 80% of its height and scroll
- 2026-10-16 — the menu's Graph section with the direction (Transpose)
- 2026-10-16 — the menu's Links section also has the arrow override, apply arrow to all links and the chevron toggle
- 2026-10-15 — "New graph" button and Shift+N: empty graph without a file name
- 2026-10-15 — the graph editor menu has a Links section (display-only shape override, apply a shape to all links)
- 2026-10-15 — Ctrl+S saves (or opens the menu when the graph has no file yet), Ctrl+Shift+S and the new "Download a copy" button download; keys shown as key caps on the buttons
- 2026-10-14 — default graph name `imgegraph-<date>-<NN>` for downloads of graphs without a file and for an empty Save as; menu close button reads "Close (esc)"
- 2026-10-14 — only imge graphs are listed (by name, with node count; other .json files are counted as skipped); "Edit folder…" and "Remove saved folder" replace "Change…" and "Forget"; Firefox and Safari can read a folder (read-only) instead of only uploading single files
- 2026-10-14 — first version: folder access (choose, remember, reopen, forget), open / save / save as, autosave, upload/download fallback, contextual Esc menu and how pages add one
