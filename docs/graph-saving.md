# Saving graphs and the Esc menu

How the graph editor opens and saves graphs on your computer, what it remembers and where, and how each page gets its own Esc menu.

State as of 2026-10-27.

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

You point the editor at a folder on your computer; the imge graphs in it and in its subfolders are listed by name and open with a click (the menu then closes). A graph file can also be **dropped on the page** from anywhere on the computer. Graphs are never stored inside the browser.

Open the menu with **Esc**, or with the toolbar's open button (the arrow pointing up). The editor starts with the base graph (the feature map in `static/data/test-node-graph.json`); your own graphs are opened from the menu.

### Which files are listed

- `.json` files in the chosen folder **and its subfolders, up to 4 levels down**, that are **imge graphs**: their `metadata.format` is `imge-graph`, or they are old unversioned graphs (see [graph-format.md](graph-format.md)). Hidden folders (`.git`, `.svelte-kit` ...) and `node_modules` aren't searched.
- Each is shown by its name (the file name without `.json`) with its node count, e.g. `feature map · 34 nodes`; a graph in a subfolder has its folder in front, faint: `uml/kugel-uml.imge`. The folder's own graphs come first, then by subfolder.
- Other `.json` files are not listed, and not hidden silently either: the menu says how many were skipped ("1 other .json file in this folder isn't an imge graph"), their names on hover.
- Clicking a name opens that graph and closes the menu; older format versions are upgraded on load. **Save** writes it back where it came from, also into its subfolder.
- A folder that can't be read (access withdrawn, a file locked) says so at the bottom of the menu instead of showing an empty list.

### Dropping a graph file

Drag a graph file (`.json`) from the computer onto the page, anywhere (also onto the open menu): the page shows a dashed frame while the file is over it, and the graph opens when it's dropped (asking first if the open graph has unsaved changes); the menu closes.

- With a writable folder open (Chrome, Edge), the dropped graph opens **without a file name**, so Save can't overwrite another file of the same name in that folder; **Save as** stores it there.
- Otherwise it keeps its file name, so **Save (download)** downloads it under that name.
- Dropping something else (an image, a text file) says it isn't a graph file. Of several files, the first `.json` one opens.

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
- **Open a single file…** uploads one graph file, without choosing a folder (dropping it on the page does the same).

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

## Exporting an image

The toolbar's picture button (bottom left) opens three choices; each downloads the **whole graph** (not only the part in view) as an image, named like the graph's file (`my graph.png`) or `imgegraph-<date>.png` / `.jpg` / `.svg` for a graph without a file:

| Format | Background | Good for |
|---|---|---|
| **PNG** | transparent | Documents, slides, chats, on any background: a picture at twice the size (2 pixels per world unit), so text stays sharp. |
| **JPG** | the theme's (light or dark) | Places that don't take transparency, smaller files for photos-style sharing; twice the size like PNG. |
| **SVG** | transparent | Full vector: shapes and text, sharp at any size; opens as editable shapes in vector editors (Inkscape, Illustrator, Figma). |

- **What is in it:** nodes, links, groups (with the gap for the name in the frame), names, colours, square and circle shapes, UML compartments with highlighting and the red marks of invalid lines, arrowheads and link names, text nodes, image nodes' pictures (read and carried inside the SVG as `data:` URLs, so it is complete on its own), exactly as drawn, with a 40-unit margin.
- **In the text view** ([graph-text-view.md](graph-text-view.md)) the image is the text as the view shows it: the characters on their columns in the view's font, with its colours, bold, italics and underlines (`drawTextViewSvg`); PNG / JPG / SVG as above, with a 40 px margin. The SVG keeps the text as text, so it needs a monospace font with box-drawing characters where it is opened (the view's font list: Cascadia Mono, Consolas, DejaVu Sans Mono, Menlo); PNG and JPG are pictures and look the same everywhere.
- **What is left out:** the selection highlight (the selection is cleared for a moment and restored), the dot grid, group resize marks, link grab areas, shadows, the toolbar, the panel; ports when the port look is hidden (see [graph-editing.md](graph-editing.md#port-look)).
- **How:** `src/lib/graph/export-svg.ts` reads the drawing element by element and writes it as SVG shapes: backgrounds and borders as rectangles / ellipses (rounded corners, single-side lines), text line by line where the browser placed each character (font, colour, baseline), group frames as a border path with a gap; the link layer is SVG already and is copied with its styles. `export-image.ts` turns that SVG into a PNG (transparent) or JPG (theme background) on a canvas. Before saving, the SVG is checked to be valid.
- **Very large graphs:** a browser's canvas holds at most about 268 million pixels and 32 767 px a side (much less in Safari on iPhones and iPads). A graph too big for that at twice its size comes out as large as the browser allows, e.g. `Exported map.jpg at 1.34× (the graph is too big for 2×; SVG keeps every detail)`; if the browser refuses even that, the size is halved until it works (`rasterScale`, `rasterise`). SVG has no such limit. Before this, such an export failed without a word while SVG worked.
- **Messages:** the result (exported, at what size, or why not) stays at the bottom of the screen for 4 s, also when the mouse moves on.
- **Fonts:** the text keeps its font names (Arial, monospace); a viewer without them uses a similar font.

## The Esc menu

- **Esc** opens and closes the menu on every page; so does the menu's Close button (shown as "Close <kbd>Esc</kbd>").
- In the graph editor, Esc first cancels what's in progress, and only opens the menu when nothing is:
    - while dragging a new link: cancels the drag
    - while editing a title: cancels the edit
- While the menu is open, the editor's shortcuts are paused (typing a file name doesn't add or delete nodes).
- The graph editor's menu has three tabs, switched at the top right of the menu (a segmented switch: the outer corners slightly rounded, the middle square, the open tab faintly tinted cerulean). The menu takes at most 80% of the window's height and scrolls when it is taller (title and switch stay at the top). The tab you used last is opened again, also after a reload; the toolbar's open button and Ctrl+S without a file go straight to Config.
    - **Config:** folder, graphs in the folder, save, the graph's direction, links, new graph and download (everything described on this page).
    - **Examples:** one example graph per kind of graph (see [graph-types.md](graph-types.md)), under category headings (**Mind mapping**, **Math**, **Circuits**, **Software architecture**, **Other**; `category` per example and the order in `categories` in `index.json`; each heading left of its examples), as cerulean chips with the name (the kind of graph and the description in the hover text), each with its description under it in at most two lines (the whole text on hover), in columns at least 12em wide (the tab is 80% of the window wide, so all 19 examples fit without scrolling from 1280 × 720 up; headings above their examples and one column in narrow windows). Kinds the editor can't draw yet are **sketches** (a small dashed "sketch" tag): drawn with basic nodes to show what the type is about. A click opens it without a file name (asks first if the open graph has unsaved changes); Save as in Config stores it in your folder under a name of your own. The examples are `static/data/examples/*.json`, listed in `static/data/examples/index.json`; the Feature map (the start graph) is listed first.
    - **Keybindings:** every shortcut as key caps and the mouse actions (the same as [graph-editing.md](graph-editing.md#mouse-and-keys), shorter).
- The Config tab also has a **Graph** section with the direction (left-to-right / top-to-bottom; Transpose turns the layout, see [graph-editing.md](graph-editing.md#direction-and-transpose)), and a **Links** section: "Show all links as …" and "Show all arrows as …" (display only, not saved in the graph), "Apply shape / arrow to all links" (writes into every link) the direction-chevrons toggle, the port look (filled, hollow, hidden; display only) and image captions (each image's own, show all, hide all; display only); see [graph-editing.md](graph-editing.md#link-shapes) and [Port look](graph-editing.md#port-look).

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
| `openLocalFile(file)` | Opens a graph file from anywhere (dropped on the page, or picked by `uploadGraph`); with a writable folder open, without a file name. True when it opened. |
| `uploadGraph()` / `downloadGraph()` | Open by upload / save by download, for browsers without folder access and the toolbar's export. |
| `listExamples()` | Reads `data/examples/index.json`: the example graphs (`ExampleGraph`: name, kind, file, description). |
| `openExample(example)` | Opens an example graph without a file name; asks first if there are unsaved changes. |

## Known limits

- Writing to a folder and remembering it work in Chrome and Edge (desktop) only; Firefox and Safari read the folder and save by download.
- Only `.json` files directly in the chosen folder are listed; subfolders are not searched.
- Every `.json` in the folder is read once to check it, so a folder with very many large files lists slowly.
- Not covered by unit tests (it needs a real browser). Checked in headless Edge: the writable folder with the folder dialog replaced by a folder in the browser's private storage, and the read-only mode with folder access switched off.

## Changes

- 2026-11-05 — fix: PNG / JPG of very large graphs failed silently (canvas too big) while SVG worked: now as large as the browser allows, said in the message; the SVG reaches the canvas as a Blob URL; export messages stay 4 s
- 2026-11-05 — the folder's subfolders are searched too (up to 4 levels; hidden folders and node_modules skipped), listed with their folder, saved back there; a folder that can't be read says so; skipped files named on hover; opening a graph from the list or by upload closes the menu; dropping a graph file on the page opens it (`openLocalFile`)
- 2026-11-02 — Config tab: Image captions (show all / hide all / each image's own)
- 2026-11-02 — image export carries image nodes' pictures inside the SVG; the scale handle is left out like the other editing aids
- 2026-10-27 — image export in the text view: the text as the view shows it (drawTextViewSvg)
- 2026-10-27 — Config tab: port look in the Links section; image export leaves hidden ports out
- 2026-10-27 — export the graph as an image from the toolbar: PNG (transparent), JPG (theme background), SVG (full vector, transparent)
- 2026-11-02 — Examples tab fits without scrolling again with 19 examples: 80% of the window wide, headings left of their examples, descriptions in two lines (whole text on hover); new examples Weather station and LED circuit (symbols)
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
