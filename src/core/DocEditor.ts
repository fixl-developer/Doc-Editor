import type { ActiveState, Alignment, DocEditorOptions, HeadingLevel, ImageInsertOptions } from "./types.js"
import { HistoryManager } from "./history.js"
import {
  closestWithin,
  getBlockElement,
  getCurrentRange,
  insertNodeAtSelection,
  saveSelection,
  restoreSelection,
  toggleInlineTag,
  unwrapElement,
  type SavedSelection,
} from "./selection.js"
import {
  addColumnRight,
  addRowBelow,
  createTable,
  enableColumnResize,
  findTable,
  findTableCell,
  removeColumn,
  removeRow,
} from "./table.js"

/**
 * Core rich-text document editor.
 *
 * Implementation notes on "no third-party libraries":
 * - Editing surface: native `contenteditable`.
 * - Formatting commands: `document.execCommand` (a browser-native API,
 *   still implemented by every major engine) is used for the handful of
 *   commands it covers well (bold/italic/underline/strike/lists/align/
 *   links/formatBlock). Nothing here is an npm editor package.
 * - Everything execCommand does NOT cover (tables, template variables,
 *   inline code/highlight toggling, undo/redo, PDF/HTML export, column
 *   resize) is hand-rolled on top of the Selection/Range API in
 *   `selection.ts` and `table.ts`.
 * - Undo/redo does not use execCommand's native undo stack — it uses our
 *   own `HistoryManager` snapshotting HTML, so custom operations (tables,
 *   variables) participate in undo/redo consistently.
 */
export class DocEditor {
  readonly root: HTMLElement
  private options: DocEditorOptions
  private history: HistoryManager
  private changeRaf: number | null = null
  private tableCleanupFns: Array<() => void> = []
  private lastSavedSelection: SavedSelection | null = null

  constructor(options: DocEditorOptions) {
    this.options = options
    this.root = options.root
    this.root.contentEditable = String(options.editable ?? true)
    this.root.classList.add("doc-editor-content")
    if (options.placeholder) {
      this.root.setAttribute("data-placeholder", options.placeholder)
    }
    this.root.innerHTML = options.content && options.content.length > 0 ? options.content : "<p><br></p>"

    this.history = new HistoryManager()
    this.history.reset(this.getHTML())

    this.root.addEventListener("input", this.handleInput)
    this.root.addEventListener("keydown", this.handleKeyDown)
    document.addEventListener("selectionchange", this.handleSelectionChange)

    this.decorateExistingTables()
    this.updatePlaceholderState()
  }

  destroy(): void {
    this.root.removeEventListener("input", this.handleInput)
    this.root.removeEventListener("keydown", this.handleKeyDown)
    document.removeEventListener("selectionchange", this.handleSelectionChange)
    this.tableCleanupFns.forEach((fn) => fn())
    this.tableCleanupFns = []
    if (this.changeRaf) cancelAnimationFrame(this.changeRaf)
  }

  // ---- content -----------------------------------------------------

  getHTML(): string {
    return this.root.innerHTML
  }

  setHTML(html: string, opts: { pushHistory?: boolean } = {}): void {
    this.root.innerHTML = html.length > 0 ? html : "<p><br></p>"
    this.decorateExistingTables()
    this.updatePlaceholderState()
    if (opts.pushHistory !== false) this.history.push(this.getHTML())
  }

  focus(): void {
    this.root.focus()
    restoreSelection(this.lastSavedSelection)
  }

  // ---- formatting (execCommand-backed, native browser API) ---------

  toggleBold(): void {
    this.exec("bold")
  }

  toggleItalic(): void {
    this.exec("italic")
  }

  toggleUnderline(): void {
    this.exec("underline")
  }

  toggleStrike(): void {
    this.exec("strikeThrough")
  }

  toggleBulletList(): void {
    this.exec("insertUnorderedList")
  }

  toggleOrderedList(): void {
    this.exec("insertOrderedList")
  }

  setAlign(align: Alignment): void {
    const map: Record<Alignment, string> = {
      left: "justifyLeft",
      center: "justifyCenter",
      right: "justifyRight",
      justify: "justifyFull",
    }
    this.exec(map[align])
  }

  setLink(url: string): void {
    this.exec("createLink", url)
  }

  unsetLink(): void {
    this.exec("unlink")
  }

  setHeading(level: HeadingLevel): void {
    const current = this.getActiveState()
    this.focus()
    if (current.heading === level) {
      document.execCommand("formatBlock", false, "P")
    } else {
      document.execCommand("formatBlock", false, `H${level}`)
    }
    this.commit()
  }

  toggleBlockquote(): void {
    const block = getBlockElement(this.root)
    this.focus()
    if (block?.tagName === "BLOCKQUOTE") {
      document.execCommand("formatBlock", false, "P")
    } else {
      document.execCommand("formatBlock", false, "BLOCKQUOTE")
    }
    this.commit()
  }

  // ---- formatting (custom, Range-based) -----------------------------

  toggleCode(): void {
    this.focus()
    toggleInlineTag(this.root, "code")
    this.commit()
  }

  toggleHighlight(color = "#fef08a"): void {
    this.focus()
    const range = getCurrentRange(this.root)
    if (!range || range.collapsed) return
    const existing = closestWithin(range.commonAncestorContainer, this.root, (el) => el.tagName === "MARK")
    if (existing) {
      unwrapElement(existing)
    } else {
      toggleInlineTag(this.root, "mark", { backgroundColor: color })
    }
    this.commit()
  }

  setTextColor(color: string): void {
    this.focus()
    document.execCommand("foreColor", false, color)
    this.commit()
  }

  // ---- images --------------------------------------------------------

  insertImage({ src, alt }: ImageInsertOptions): void {
    this.focus()
    const img = document.createElement("img")
    img.src = src
    if (alt) img.alt = alt
    img.className = "doc-editor-image"
    insertNodeAtSelection(this.root, img)
    this.commit()
  }

  /** Reads a File (e.g. from an <input type="file">) into a base64 data URL and inserts it. No upload server required. */
  insertImageFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        this.insertImage({ src: String(reader.result), alt: file.name })
        resolve()
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  // ---- tables ---------------------------------------------------------

  insertTable(rows = 3, cols = 3, withHeaderRow = true): void {
    this.focus()
    const table = createTable(rows, cols, withHeaderRow)
    insertNodeAtSelection(this.root, table)
    this.tableCleanupFns.push(enableColumnResize(table))
    this.commit()
  }

  addTableRowBelow(): void {
    const cell = this.getFocusedTableCell()
    if (!cell) return
    addRowBelow(cell)
    this.commit()
  }

  removeTableRow(): void {
    const cell = this.getFocusedTableCell()
    if (!cell) return
    removeRow(cell)
    this.commit()
  }

  addTableColumnRight(): void {
    const cell = this.getFocusedTableCell()
    if (!cell) return
    addColumnRight(cell)
    this.commit()
  }

  removeTableColumn(): void {
    const cell = this.getFocusedTableCell()
    if (!cell) return
    removeColumn(cell)
    this.commit()
  }

  isInsideTable(): boolean {
    return this.getFocusedTableCell() !== null
  }

  private getFocusedTableCell(): HTMLTableCellElement | null {
    const range = getCurrentRange(this.root) ?? this.lastSavedSelection?.range ?? null
    if (!range) return null
    return findTableCell(range.startContainer, this.root)
  }

  private decorateExistingTables(): void {
    this.tableCleanupFns.forEach((fn) => fn())
    this.tableCleanupFns = []
    this.root.querySelectorAll("table").forEach((table) => {
      this.tableCleanupFns.push(enableColumnResize(table as HTMLTableElement))
    })
  }

  // ---- template variables --------------------------------------------

  insertVariable(name: string): void {
    this.focus()
    insertNodeAtSelection(this.root, document.createTextNode(`{{${name}}}`))
    this.commit()
  }

  // ---- undo/redo (custom history, not execCommand) --------------------

  canUndo(): boolean {
    return this.history.canUndo()
  }

  canRedo(): boolean {
    return this.history.canRedo()
  }

  undo(): void {
    const html = this.history.undo()
    if (html === null) return
    this.setHTML(html, { pushHistory: false })
    this.notifyChange()
  }

  redo(): void {
    const html = this.history.redo()
    if (html === null) return
    this.setHTML(html, { pushHistory: false })
    this.notifyChange()
  }

  // ---- active state -----------------------------------------------------

  getActiveState(): ActiveState {
    const block = getBlockElement(this.root)
    const range = getCurrentRange(this.root)

    let heading: HeadingLevel | null = null
    if (block?.tagName === "H1") heading = 1
    else if (block?.tagName === "H2") heading = 2
    else if (block?.tagName === "H3") heading = 3

    let align: Alignment | null = null
    if (document.queryCommandState("justifyCenter")) align = "center"
    else if (document.queryCommandState("justifyRight")) align = "right"
    else if (document.queryCommandState("justifyFull")) align = "justify"
    else if (document.queryCommandState("justifyLeft")) align = "left"

    const codeActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) => el.tagName === "CODE")
    const highlightActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) => el.tagName === "MARK")
    const linkActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) => el.tagName === "A")

    return {
      bold: safeQueryState("bold"),
      italic: safeQueryState("italic"),
      underline: safeQueryState("underline"),
      strike: safeQueryState("strikeThrough"),
      code: codeActive,
      highlight: highlightActive,
      heading,
      bulletList: safeQueryState("insertUnorderedList"),
      orderedList: safeQueryState("insertOrderedList"),
      blockquote: block?.tagName === "BLOCKQUOTE",
      align,
      link: linkActive,
    }
  }

  // ---- internals -----------------------------------------------------

  private exec(command: string, value?: string): void {
    this.focus()
    document.execCommand(command, false, value)
    this.commit()
  }

  /** Push current state onto history + notify. Call after any programmatic mutation. */
  private commit(): void {
    this.history.push(this.getHTML())
    this.updatePlaceholderState()
    this.notifyChange()
  }

  private handleInput = (): void => {
    this.updatePlaceholderState()
    if (this.changeRaf) cancelAnimationFrame(this.changeRaf)
    this.changeRaf = requestAnimationFrame(() => {
      this.history.push(this.getHTML())
      this.notifyChange()
    })
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const isMod = e.ctrlKey || e.metaKey
    if (isMod && e.key.toLowerCase() === "z" && !e.shiftKey) {
      e.preventDefault()
      this.undo()
    } else if (isMod && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
      e.preventDefault()
      this.redo()
    }
  }

  private handleSelectionChange = (): void => {
    if (!this.root.contains(window.getSelection()?.anchorNode ?? null)) return
    this.lastSavedSelection = saveSelection(this.root)
    this.options.onSelectionChange?.(this.getActiveState())
  }

  private updatePlaceholderState(): void {
    const isEmpty = this.root.innerText.trim().length === 0
    this.root.classList.toggle("doc-editor-empty", isEmpty)
  }

  private notifyChange(): void {
    this.options.onChange?.(this.getHTML())
  }
}

function safeQueryState(command: string): boolean {
  try {
    return document.queryCommandState(command)
  } catch {
    return false
  }
}
