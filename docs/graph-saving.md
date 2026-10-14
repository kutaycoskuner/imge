# Saving graphs and the Esc menu

How the graph editor opens and saves graphs on your computer, what it remembers and where, and how each page gets its own Esc menu.

State as of 2026-10-14.

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
- Each is shown by its name (the file name without `.json`) with its node count, e.g. `feature map · 17 nodes`.
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
| **Save** | Writes the open graph back to its file. Enabled once the graph has a file name. |
| **Save as** | Type a name (`.json` is added; characters not allowed in file names become `-`) and the graph is saved under it in the folder. Asks before overwriting any existing file. |
| ☐ **Autosave** | Off by default. When on, the open file is saved 0.8 s after the last change (so a drag saves once, not on every frame). The setting is kept in this browser. |
| • unsaved changes | Shown next to the graph name when it changed since it was opened or saved. Opening another graph then asks first. |

All results and errors (saved, couldn't open, access not allowed ...) appear as a line at the bottom of the menu.

### Read-only folder (Firefox, Safari)

These browsers let a page **read** a folder you pick, but never write to it or remember it. The menu says so in one line. There:

- **Choose folder…** / **Edit folder…** picks a folder each visit; the imge graphs in it are listed the same way, marked "(read only)", and open with a click.
- **Save (download)** / **Save as (download)** downloads the updated graph under its file name; put it back into the folder yourself.
- There's no "remember" and no autosave, since the browser can't write to the folder.
- **Open a single file…** uploads one graph file, without choosing a folder.

The toolbar's export button (the arrow pointing down) always downloads, in every browser.

### What is stored where

| What | Where | Sent anywhere? |
|---|---|---|
| Your graphs | The `.json` files in the folder you chose, on your computer. | No. |
| Access to the folder ("remember") | A folder handle in the browser's IndexedDB storage (`imge` database), only after you answer **Yes**. A cookie can't hold folder access, and browsers never tell a page a folder's real path; the handle is the browser's safe equivalent. | No. |
| Autosave on/off | `localStorage` key `imge.graphEditor.autosave`. | No. |

Clearing the site's data in the browser removes the remembered folder and the autosave setting; your files stay where they are.

## The Esc menu

- **Esc** opens and closes the menu on every page; so does the menu's Close button.
- In the graph editor, Esc first cancels what's in progress, and only opens the menu when nothing is:
    - while dragging a new link: cancels the drag
    - while editing a title: cancels the edit
- While the menu is open, the editor's shortcuts are paused (typing a file name doesn't add or delete nodes).

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
3. If the page uses Esc itself, listen in the capture phase (`<svelte:window on:keydown|capture={...} />`) and call `event.preventDefault()` when the key press was used; the menu ignores Esc presses that were already used.

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
| `normalizeFileName(input)` | Turns typed text into a safe `.json` file name, or `null` if nothing usable is left. |
| `setAutosave(on)` | Turns autosave on or off and keeps the setting. |
| `uploadGraph()` / `downloadGraph()` | Open by upload / save by download, for browsers without folder access and the toolbar's export. |

## Known limits

- Writing to a folder and remembering it work in Chrome and Edge (desktop) only; Firefox and Safari read the folder and save by download.
- Only `.json` files directly in the chosen folder are listed; subfolders are not searched.
- Every `.json` in the folder is read once to check it, so a folder with very many large files lists slowly.
- Not covered by unit tests (it needs a real browser). Checked in headless Edge: the writable folder with the folder dialog replaced by a folder in the browser's private storage, and the read-only mode with folder access switched off.

## Changes

- 2026-10-14 — only imge graphs are listed (by name, with node count; other .json files are counted as skipped); "Edit folder…" and "Remove saved folder" replace "Change…" and "Forget"; Firefox and Safari can read a folder (read-only) instead of only uploading single files
- 2026-10-14 — first version: folder access (choose, remember, reopen, forget), open / save / save as, autosave, upload/download fallback, contextual Esc menu and how pages add one
