<script lang="ts">
    type Column = {
        id: string;
        title: string;
        color: string;
    };

    type Row = {
        id: string;
        values: Record<string, string>;
    };

    type CellChange = {
        rowId: string;
        columnId: string;
        columnTitle: string;
        rowIndex: number;
        originalValue: string;
        newValue: string;
    };

    const COLOR_PALETTE = [
        "#06b4ba",
        "#3cba06",
        "#ffa100",
        "#da1991",
        "#008080",
        "#6b8e23"
    ];

    let columns: Column[] = $state([
        { id: "column-1", title: "Name", color: "#06b4ba" },
        { id: "column-2", title: "Age", color: "#3cba06" },
        { id: "column-3", title: "City", color: "#ffa100" }
    ]);

    let rows: Row[] = $state([
        {
            id: "row-1",
            values: { "column-1": "Alice", "column-2": "25", "column-3": "Berlin" }
        },
        {
            id: "row-2",
            values: { "column-1": "Bob", "column-2": "30", "column-3": "Leipzig" }
        },
        {
            id: "row-3",
            values: { "column-1": "Charlie", "column-2": "22", "column-3": "Hamburg" }
        }
    ]);

    let originalRowsMap = $state<Record<string, Record<string, string>>>({
        "row-1": { "column-1": "Alice", "column-2": "25", "column-3": "Berlin" },
        "row-2": { "column-1": "Bob", "column-2": "30", "column-3": "Leipzig" },
        "row-3": { "column-1": "Charlie", "column-2": "22", "column-3": "Hamburg" }
    });

    let draggedColumnId: string | null = $state(null);
    let activeCell: { rowId: string; columnId: string } | null = $state(null);
    let showExportModal = $state(false);

    /* ==================================================
       EDIT TRACKING
    ================================================== */

    function isCellEdited(rowId: string, columnId: string, currentValue: string): boolean {
        const origVal = originalRowsMap[rowId]?.[columnId] ?? "";
        return (currentValue ?? "") !== origVal;
    }

    function getEditedCellsList(): CellChange[] {
        const changes: CellChange[] = [];

        rows.forEach((row, rowIndex) => {
            columns.forEach((column, colIndex) => {
                const currentVal = row.values[column.id] ?? "";
                const origVal = originalRowsMap[row.id]?.[column.id] ?? "";

                if (currentVal !== origVal) {
                    changes.push({
                        rowId: row.id,
                        columnId: column.id,
                        columnTitle: column.title || columnName(colIndex),
                        rowIndex: rowIndex + 1,
                        originalValue: origVal,
                        newValue: currentVal
                    });
                }
            });
        });

        return changes;
    }

    /* ==================================================
       COLUMN & ROW UPDATES
    ================================================== */

    function updateColumn(id: string, property: keyof Column, value: string) {
        columns = columns.map((column) =>
            column.id === id ? { ...column, [property]: value } : column
        );
    }

    function updateCell(rowId: string, columnId: string, value: string) {
        rows = rows.map((row) =>
            row.id === rowId
                ? {
                        ...row,
                        values: {
                            ...row.values,
                            [columnId]: value
                        }
                    }
                : row
        );
    }

    function addRow() {
        const id = `row-${crypto.randomUUID()}`;
        const emptyValues = Object.fromEntries(columns.map((col) => [col.id, ""]));

        rows = [...rows, { id, values: emptyValues }];
        originalRowsMap[id] = { ...emptyValues };
    }

    function addColumn() {
        const id = `column-${crypto.randomUUID()}`;

        columns = [
            ...columns,
            {
                id,
                title: "",
                color: COLOR_PALETTE[columns.length % COLOR_PALETTE.length]
            }
        ];

        rows = rows.map((row) => ({
            ...row,
            values: { ...row.values, [id]: "" }
        }));
    }

    /* ==================================================
       DRAG & DROP
    ================================================== */

    function startColumnDrag(event: DragEvent, id: string) {
        draggedColumnId = id;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", id);
        }
    }

    function dropColumn(targetId: string) {
        if (!draggedColumnId || draggedColumnId === targetId) {
            draggedColumnId = null;
            return;
        }

        const draggedIndex = columns.findIndex((c) => c.id === draggedColumnId);
        const targetIndex = columns.findIndex((c) => c.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) {
            draggedColumnId = null;
            return;
        }

        const reordered = [...columns];
        const [dragged] = reordered.splice(draggedIndex, 1);
        reordered.splice(targetIndex, 0, dragged);

        columns = reordered;
        draggedColumnId = null;
    }

    /* ==================================================
       COLOR & UTILS
    ================================================== */

    function normalizeHex(value: string): string | null {
        const hex = value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
        if (/^[0-9a-fA-F]{6}$/.test(hex)) return `#${hex}`;
        return null;
    }

    function updateColor(id: string, value: string) {
        const normalized = normalizeHex(value);
        if (!normalized) return;
        updateColumn(id, "color", normalized);
    }

    function columnName(index: number): string {
        let name = "";
        let n = index;

        do {
            name = String.fromCharCode(65 + (n % 26)) + name;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);

        return name;
    }

    /* ==================================================
       CSV PARSER & IMPORT
    ================================================== */

    function parseCSV(text: string, delimiter: string): string[][] {
        const result: string[][] = [];
        let row: string[] = [];
        let value = "";
        let insideQuotes = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const next = text[i + 1];

            if (char === '"' && insideQuotes && next === '"') {
                value += '"';
                i++;
                continue;
            }

            if (char === '"') {
                insideQuotes = !insideQuotes;
                continue;
            }

            if (char === delimiter && !insideQuotes) {
                row.push(value);
                value = "";
                continue;
            }

            if ((char === "\n" || char === "\r") && !insideQuotes) {
                if (char === "\r" && next === "\n") i++;
                row.push(value);
                result.push(row);
                row = [];
                value = "";
                continue;
            }

            value += char;
        }

        if (value.length > 0 || row.length > 0) {
            row.push(value);
            result.push(row);
        }

        return result;
    }

    function detectDelimiter(text: string): string {
        const firstLine = text.split(/\r?\n/)[0] || "";
        const delimiters = [",", ";", "\t"];

        let bestDelimiter = ",";
        let bestCount = 0;

        for (const delimiter of delimiters) {
            const count = firstLine.split(delimiter).length - 1;
            if (count > bestCount) {
                bestCount = count;
                bestDelimiter = delimiter;
            }
        }

        return bestDelimiter;
    }

    function importCSV(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onload = () => {
            const text = reader.result as string;
            const delimiter = detectDelimiter(text);
            const data = parseCSV(text, delimiter);

            if (data.length === 0) return;

            const columnCount = Math.max(...data.map((row) => row.length));

            const newColumns = Array.from({ length: columnCount }, (_, index) => ({
                id: `column-${crypto.randomUUID()}`,
                title: "",
                color: COLOR_PALETTE[index % COLOR_PALETTE.length]
            }));

            const newSnapshot: Record<string, Record<string, string>> = {};

            const newRows = data
                .filter((row) => row.some((value) => value.trim() !== ""))
                .map((row) => {
                    const rowId = `row-${crypto.randomUUID()}`;
                    const rowValues = Object.fromEntries(
                        newColumns.map((column, columnIndex) => [
                            column.id,
                            row[columnIndex] ?? ""
                        ])
                    );

                    newSnapshot[rowId] = { ...rowValues };

                    return { id: rowId, values: rowValues };
                });

            columns = newColumns;
            rows = newRows;
            originalRowsMap = newSnapshot;
            input.value = "";
        };

        reader.readAsText(file);
    }

    /* ==================================================
       EXPORT
    ================================================== */

    function escapeCSV(value: string): string {
        if (
            value.includes('"') ||
            value.includes(",") ||
            value.includes(";") ||
            value.includes("\n") ||
            value.includes("\r")
        ) {
            return `"${value.replaceAll('"', '""')}"`;
        }

        return value;
    }

    function triggerExportModal() {
        showExportModal = true;
    }

    function confirmAndDownloadCSV() {
        const csv = rows
            .map((row) =>
                columns
                    .map((column) => escapeCSV(row.values[column.id] ?? ""))
                    .join(",")
            )
            .join("\r\n");

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "data.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showExportModal = false;
    }
</script>

<div class="csv-editor">
    <!-- TOOLBAR -->
    <div class="toolbar">
        <div class="file-actions">
            <label class="file-button">
                import
                <input
                    type="file"
                    accept=".csv,text/csv"
                    on:change={importCSV}
                />
            </label>

            <button class="file-button" on:click={triggerExportModal}>
                export
            </button>
        </div>
    </div>

    <!-- TABLE CONTAINER -->
    <div class="table-container">
        <table>
            <thead>
                <tr>
                    <th class="row-index sticky-top-left">#</th>

                    {#each columns as column, index (column.id)}
                        <th
                            class="sticky-header"
                            class:dragging={draggedColumnId === column.id}
                            draggable="true"
                            on:dragstart={(e) => startColumnDrag(e, column.id)}
                            on:dragover={(e) => e.preventDefault()}
                            on:drop={() => dropColumn(column.id)}
                        >
                            <div class="column-header">
                                <span class="color-indicator" style={`background-color: ${column.color}`}></span>
                                <span class="drag-handle" title="Drag to reorder">⋮⋮</span>

                                <input
                                    class="title-input"
                                    placeholder={columnName(index)}
                                    value={column.title}
                                    on:input={(e) =>
                                        updateColumn(
                                            column.id,
                                            "title",
                                            e.currentTarget.value
                                        )}
                                />

                                <div class="color-editor">
                                    <input
                                        class="hex-input"
                                        value={column.color}
                                        on:change={(e) =>
                                            updateColor(
                                                column.id,
                                                e.currentTarget.value
                                            )}
                                    />
                                </div>
                            </div>
                        </th>
                    {/each}

                    <th class="add-column sticky-header">
                        <button on:click={addColumn} title="Add column">+</button>
                    </th>
                </tr>
            </thead>

            <tbody>
                {#each rows as row, rowIndex (row.id)}
                    <tr class="table-row">
                        <td class="row-index sticky-left">{rowIndex + 1}</td>

                        {#each columns as column}
                            {@const val = row.values[column.id] ?? ""}
                            {@const isEdited = isCellEdited(row.id, column.id, val)}

                            <td
                                class="cell-wrapper"
                                class:edited-cell={isEdited}
                                style={`--active-col: ${column.color}`}
                            >
                                <div class="cell-content">
                                    {#if isEdited}
                                        <!-- Exclamation in circle SVG badge -->
                                        <span class="edited-badge" title="Data modified">
                                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                                                <circle cx="8" cy="8" r="7" />
                                                <path d="M8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4zm0 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" fill="#ffffff" />
                                            </svg>
                                        </span>
                                    {/if}
                                    <input
                                        value={val}
                                        class:text-edited={isEdited}
                                        on:focus={() =>
                                            (activeCell = {
                                                rowId: row.id,
                                                columnId: column.id
                                            })}
                                        on:blur={() => (activeCell = null)}
                                        on:input={(e) =>
                                            updateCell(
                                                row.id,
                                                column.id,
                                                e.currentTarget.value
                                            )}
                                    />
                                </div>
                            </td>
                        {/each}

                        <td class="empty-cell"></td>
                    </tr>
                {/each}

                <tr>
                    <td class="add-row-cell sticky-left">
                        <button on:click={addRow}>+ row</button>
                    </td>

                    <td colspan={columns.length + 1} class="empty-cell"></td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- PRE-EXPORT CONFIRMATION MODAL -->
    {#if showExportModal}
        {@const changes = getEditedCellsList()}
        <div class="modal-backdrop" on:click|self={() => (showExportModal = false)}>
            <div class="modal-content">
                <h2>Export CSV Confirmation</h2>
                
                {#if changes.length > 0}
                    <p class="modal-summary">
                        Found <strong>{changes.length}</strong> edited cell(s) prior to download:
                    </p>
                    <div class="changes-list-container">
                        <table class="changes-table">
                            <thead>
                                <tr>
                                    <th>Row</th>
                                    <th>Column</th>
                                    <th>Original Value</th>
                                    <th>New Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each changes as change}
                                    <tr>
                                        <td>#{change.rowIndex}</td>
                                        <td><strong>{change.columnTitle}</strong></td>
                                        <td class="old-value">{change.originalValue || "<em>(empty)</em>"}</td>
                                        <td class="new-value">{change.newValue || "<em>(empty)</em>"}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {:else}
                    <p class="no-changes-text">No data modifications detected from original import state.</p>
                {/if}

                <div class="modal-actions">
                    <button class="btn-cancel" on:click={() => (showExportModal = false)}>
                        Cancel
                    </button>
                    <button class="btn-confirm" on:click={confirmAndDownloadCSV}>
                        Confirm & Download
                    </button>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
.csv-editor {
    width: 100%;
    margin-top: 4rem; /* Clearance for top navigation */
    height: calc(100vh - 5rem);
    display: flex;
    flex-direction: column;
    background: transparent;
    color: var(--col);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* =====================================================
   TOOLBAR
===================================================== */

.toolbar {
    height: 2.75rem;
    flex-shrink: 0;
    display: flex;
    justify-content: flex-end;
    background: transparent;
    padding: 0 1rem;
}

.file-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
}

.file-button {
    display: inline-flex;
    align-items: center;
    padding: 0.4rem 0.9rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--col);
    font-size: 0.85rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s ease;
}

.file-button:hover {
    opacity: 0.6;
}

.file-button input {
    display: none;
}

/* =====================================================
   TABLE & FRAMELESS LAYOUT
===================================================== */

.table-container {
    flex: 1;
    overflow: auto;
    position: relative;
    padding: 0.5rem 1rem 1rem 1rem;
}

table {
    border-collapse: separate;
    border-spacing: 2px 3px;
    min-width: 100%;
}

th,
td {
    border: none;
    padding: 0;
    color: var(--col);
}

/* Header Always on top with Blurred Background */
.sticky-header {
    position: sticky;
    top: 0;
    z-index: 30;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    text-align: left;
    font-weight: normal;
    border-radius: 6px;
    border: none;
}

.sticky-left {
    position: sticky;
    left: 0;
    z-index: 5;
    background: transparent;
}

.sticky-top-left {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-radius: 6px;
}

.cell-wrapper {
    background: transparent;
    border: none;
    border-radius: 6px;
}

.cell-content {
    display: flex;
    align-items: center;
    padding-left: 0.5rem;
    border-radius: 6px;
}

/* Apparent Exclamation Point in Circle Icon */
.edited-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #e67e22; /* Autumn yellow circle fill */
    flex-shrink: 0;
    margin-right: 0.2rem;
    user-select: none;
}

/* =====================================================
   ROW INDEX
===================================================== */

.row-index {
    width: 2.2rem;
    min-width: 2.2rem;
    text-align: center;
    color: var(--col);
    font-size: 0.8rem;
    user-select: none;
    opacity: 0.7;
}

/* =====================================================
   COLUMN HEADER
===================================================== */

.column-header {
    min-width: 10.5rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.5rem;
}

.color-indicator {
    width: 4px;
    height: 1.2rem;
    border-radius: 2px;
    flex-shrink: 0;
}

.drag-handle {
    flex-shrink: 0;
    color: var(--col);
    cursor: grab;
    user-select: none;
    font-size: 0.85rem;
    opacity: 0.7;
}

th.dragging {
    opacity: 0.4;
}

.title-input {
    flex: 1;
    min-width: 4rem;
    border: none;
    outline: none;
    background: transparent;
    color: var(--col);
    font-family: inherit;
    font-size: 0.88rem;
    font-weight: 600;
}

.title-input::placeholder {
    color: var(--col);
    opacity: 0.5;
    font-weight: 400;
}

.color-editor {
    display: flex;
    align-items: center;
}

.hex-input {
    width: 4.2rem;
    padding: 0.15rem 0.3rem;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--col);
    font-size: 0.7rem;
    text-align: center;
    opacity: 0.7;
}

.hex-input:focus {
    outline: none;
    opacity: 0.5;
}

/* =====================================================
   DATA INPUT STATES
===================================================== */

td input {
    width: 100%;
    min-width: 8rem;
    box-sizing: border-box;
    padding: 0.6rem 0.5rem;
    border: none;
    outline: none;
    background: transparent; /* Background remains unchanged */
    color: var(--col);
    font-family: inherit;
    font-size: 0.9rem;
    border-radius: 6px;
    transition: color 0.15s ease;
}

/* Active Editing State: Text color changes to column color */
td input:focus {
    color: var(--active-col);
    background: transparent;
}

/* Post-Editing State: Autumn Yellow Text */
td input.text-edited {
    color: #d35400; /* Deep Autumn Yellow */
    font-weight: 600;
}

/* Active edit state takes precedence over post-edit color */
td input.text-edited:focus {
    color: var(--active-col);
}

/* =====================================================
   ADD BUTTONS & EMPTY CELLS
===================================================== */

.add-column button,
.add-row-cell button {
    border: none;
    background: transparent;
    color: var(--col);
    cursor: pointer;
    font-size: 0.85rem;
    border-radius: 6px;
    transition: opacity 0.15s ease;
}

.add-column button {
    width: 100%;
    height: 100%;
    padding: 0.4rem 0;
    font-size: 1.1em;
}

.add-column button:hover,
.add-row-cell button:hover {
    opacity: 0.6;
}

.add-row-cell button {
    padding: 0.4rem 0.6rem;
}

.empty-cell {
    background: transparent;
}

/* =====================================================
   EXPORT MODAL
===================================================== */

.modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.modal-content {
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: none;
    color: var(--col);
    padding: 1.75rem;
    border-radius: 12px;
    width: 540px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--col);
}

.modal-summary {
    font-size: 0.9rem;
    color: var(--col);
    margin-bottom: 0.75rem;
}

.no-changes-text {
    font-size: 0.9rem;
    color: var(--col);
    opacity: 0.7;
    margin: 1.5rem 0;
}

.changes-list-container {
    flex: 1;
    overflow-y: auto;
    border-radius: 8px;
    border: none;
    background: transparent;
    margin-bottom: 1.25rem;
    max-height: 280px;
}

.changes-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    color: var(--col);
}

.changes-table th,
.changes-table td {
    padding: 0.6rem 0.8rem;
    border: none;
    text-align: left;
    color: var(--col);
}

.changes-table th {
    background: transparent;
    color: var(--col);
    font-weight: 600;
    position: sticky;
    top: 0;
}

.old-value {
    color: var(--col);
    text-decoration: line-through;
    opacity: 0.5;
}

.new-value {
    color: #e67e22;
    font-weight: 600;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
}

.btn-cancel {
    padding: 0.55rem 1.1rem;
    border: none;
    background: transparent;
    color: var(--col);
    border-radius: 6px;
    font-size: 0.88rem;
    cursor: pointer;
}

.btn-cancel:hover {
    opacity: 0.6;
}

.btn-confirm {
    padding: 0.55rem 1.1rem;
    border: none;
    background: transparent;
    color: var(--col);
    border-radius: 6px;
    font-size: 0.88rem;
    font-weight: 500;
    cursor: pointer;
}

.btn-confirm:hover {
    opacity: 0.6;
}
</style>