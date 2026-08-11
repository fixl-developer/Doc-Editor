import type {
  ActiveState,
  Alignment,
  BulletListStyle,
  DocComment,
  DocEditorOptions,
  HeadingLevel,
  ImageInsertOptions,
  OrderedListStyle,
  SlashState,
} from "./types.js"
import { HistoryManager } from "./history.js"
import {
  applyInlineStyle,
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
import { getCaretOffsetInBlock, getCaretRect, setCaretOffsetInBlock } from "./caret.js"
import { tryApplyBlockMarkdownShortcut, tryApplyInlineMarkdownShortcut, type MarkdownContext } from "./markdown.js"
import { tintCode } from "./syntaxHighlight.js"
import { clearFindHighlights, findMatches, highlightMatches, replaceAllMatches, scrollToActiveMatch } from "./findReplace.js"
import { addComment, deleteComment, getComments, setCommentResolved } from "./comments.js"
import { sanitizeHtml } from "./sanitize.js"
import { enableImageResizeHandle, setImageAlign, wrapImageInFigure, type ImageAlign } from "./imageResize.js"
import { clearAutoPageBreaks, recomputePagination } from "./pagination.js"
import {
  acceptAllChanges,
  acceptChange,
  interceptDeletion,
  listTrackedChanges,
  rejectAllChanges,
  rejectChange,
  wrapInsertion,
  type TrackedChangeSummary,
} from "./trackChanges.js"

export type SlashBlockType =
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "table"
  | "image"
  | "pageBreak"
  | "horizontalRule"
  | "codeBlock"

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

    this.markdownContext = {
      root: this.root,
      applyHeading: (level) => this.setHeading(level),
      applyBulletList: () => this.toggleBulletList(),
      applyOrderedList: () => this.toggleOrderedList(),
      applyBlockquote: () => this.toggleBlockquote(),
      applyCodeBlock: () => this.insertCodeBlock(),
    }

    this.history = new HistoryManager()
    this.history.reset(this.getHTML())

    this.root.addEventListener("input", this.handleInput)
    this.root.addEventListener("keydown", this.handleKeyDown)
    this.root.addEventListener("paste", this.handlePaste)
    this.root.addEventListener("click", this.handleRootClick)
    this.root.addEventListener("beforeinput", this.handleBeforeInput)
    document.addEventListener("selectionchange", this.handleSelectionChange)

    this.decorateExistingTables()
    this.decorateExistingImages()
    this.updatePlaceholderState()
    this.notifyComments()
  }

  destroy(): void {
    this.root.removeEventListener("input", this.handleInput)
    this.root.removeEventListener("keydown", this.handleKeyDown)
    this.root.removeEventListener("paste", this.handlePaste)
    this.root.removeEventListener("click", this.handleRootClick)
    this.root.removeEventListener("beforeinput", this.handleBeforeInput)
    document.removeEventListener("selectionchange", this.handleSelectionChange)
    this.tableCleanupFns.forEach((fn) => fn())
    this.tableCleanupFns = []
    this.imageCleanupFns.forEach((fn) => fn())
    this.imageCleanupFns = []
    if (this.changeRaf) cancelAnimationFrame(this.changeRaf)
    if (this.paginationTimer) clearTimeout(this.paginationTimer)
  }

  // ---- content -----------------------------------------------------

  getHTML(): string {
    return this.root.innerHTML
  }

  setHTML(html: string, opts: { pushHistory?: boolean } = {}): void {
    this.root.innerHTML = html.length > 0 ? html : "<p><br></p>"
    this.decorateExistingTables()
    this.decorateExistingImages()
    this.updatePlaceholderState()
    if (opts.pushHistory !== false) this.history.push(this.getHTML())
  }

  setTrackChanges(enabled: boolean): void {
    this.options.trackChanges = enabled
  }

  isTrackChangesEnabled(): boolean {
    return !!this.options.trackChanges
  }

  setEditable(editable: boolean): void {
    this.root.contentEditable = String(editable)
  }

  isEditable(): boolean {
    return this.root.contentEditable === "true"
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

  toggleSubscript(): void {
    this.exec("subscript")
  }

  toggleSuperscript(): void {
    this.exec("superscript")
  }

  /** Strips inline formatting (bold/italic/color/etc.) from the current selection. */
  clearFormatting(): void {
    this.exec("removeFormat")
  }

  setFontFamily(fontFamily: string): void {
    this.focus()
    if (!fontFamily) return
    applyInlineStyle(this.root, "font-family", fontFamily)
    this.commit()
  }

  setFontSize(sizePx: number): void {
    this.focus()
    applyInlineStyle(this.root, "font-size", `${sizePx}px`)
    this.commit()
  }

  // ---- line height / spacing --------------------------------------------

  setLineHeight(value: number): void {
    const block = getBlockElement(this.root)
    if (!block) return
    block.style.lineHeight = String(value)
    this.commit()
  }

  setParagraphSpacing(marginBottomEm: number): void {
    const block = getBlockElement(this.root)
    if (!block) return
    block.style.marginBottom = `${marginBottomEm}em`
    this.commit()
  }

  // ---- list styles -----------------------------------------------------

  setBulletListStyle(style: BulletListStyle): void {
    const list = this.getClosestList("UL")
    if (!list) return
    list.style.listStyleType = style
    this.commit()
  }

  setOrderedListStyle(style: OrderedListStyle): void {
    const list = this.getClosestList("OL")
    if (!list) return
    list.style.listStyleType = style
    this.commit()
  }

  private getClosestList(tag: "UL" | "OL"): HTMLElement | null {
    const range = getCurrentRange(this.root)
    if (!range) return null
    return closestWithin(range.commonAncestorContainer, this.root, (el) => el.tagName === tag)
  }

  // ---- task list ---------------------------------------------------------

  toggleTaskList(): void {
    this.focus()
    const existingItem = this.getClosestTaskItem()
    if (existingItem) {
      const list = existingItem.closest("ul.doc-editor-tasklist")
      const p = document.createElement("p")
      p.innerHTML = existingItem.querySelector(".doc-editor-task-label")?.innerHTML || existingItem.innerHTML
      existingItem.replaceWith(p)
      if (list && list.children.length === 0) list.remove()
      this.commit()
      return
    }

    const block = getBlockElement(this.root)
    const list = document.createElement("ul")
    list.className = "doc-editor-tasklist"
    const li = document.createElement("li")
    li.className = "doc-editor-task-item"
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.contentEditable = "false"
    const label = document.createElement("span")
    label.className = "doc-editor-task-label"
    label.innerHTML = block ? block.innerHTML || "<br>" : "<br>"
    li.appendChild(checkbox)
    li.appendChild(label)
    list.appendChild(li)

    if (block) block.replaceWith(list)
    else insertNodeAtSelection(this.root, list)

    this.commit()
  }

  private getClosestTaskItem(): HTMLElement | null {
    const range = getCurrentRange(this.root)
    if (!range) return null
    return closestWithin(range.commonAncestorContainer, this.root, (el) => el.classList.contains("doc-editor-task-item"))
  }

  // ---- page break ---------------------------------------------------------

  insertPageBreak(): void {
    this.focus()
    const marker = document.createElement("div")
    marker.className = "doc-editor-page-break"
    marker.contentEditable = "false"
    insertNodeAtSelection(this.root, marker)
    const p = document.createElement("p")
    p.innerHTML = "<br>"
    marker.after(p)
    this.commit()
  }

  // ---- comments -----------------------------------------------------------

  addComment(text: string): DocComment | null {
    this.focus()
    const author = this.options.author?.name ?? "Anonymous"
    const comment = addComment(this.root, text, author)
    if (comment) this.commit()
    this.notifyComments()
    return comment
  }

  resolveComment(id: string, resolved = true): void {
    setCommentResolved(this.root, id, resolved)
    this.commit()
    this.notifyComments()
  }

  deleteComment(id: string): void {
    deleteComment(this.root, id)
    this.commit()
    this.notifyComments()
  }

  getComments(): DocComment[] {
    return getComments(this.root)
  }

  private notifyComments(): void {
    this.options.onCommentsChange?.(this.getComments())
  }

  // ---- pagination -----------------------------------------------------

  private paginationEnabled = false
  private pageHeightPx = 1000
  private paginationTimer: ReturnType<typeof setTimeout> | null = null

  setPagination(enabled: boolean, pageHeightPx = 1000): void {
    this.paginationEnabled = enabled
    this.pageHeightPx = pageHeightPx
    if (enabled) this.schedulePagination()
    else clearAutoPageBreaks(this.root)
  }

  private schedulePagination(): void {
    if (!this.paginationEnabled) return
    if (this.paginationTimer) clearTimeout(this.paginationTimer)
    this.paginationTimer = setTimeout(() => {
      recomputePagination(this.root, this.pageHeightPx)
    }, 400)
  }

  // ---- table of contents ------------------------------------------------

  scrollToHeadingIndex(index: number): void {
    const headings = this.root.querySelectorAll("h1, h2, h3, h4, h5, h6")
    headings[index]?.scrollIntoView({ block: "center", behavior: "smooth" })
  }

  // ---- find & replace ---------------------------------------------------

  private findQuery = ""
  private findCaseSensitive = false
  private findActiveIndex = 0
  private findMatchCount = 0

  find(query: string, caseSensitive = false): number {
    this.findQuery = query
    this.findCaseSensitive = caseSensitive
    this.findActiveIndex = 0
    this.findMatchCount = highlightMatches(this.root, query, this.findActiveIndex, caseSensitive)
    scrollToActiveMatch(this.root)
    return this.findMatchCount
  }

  findNext(): void {
    if (this.findMatchCount === 0) return
    this.findActiveIndex = (this.findActiveIndex + 1) % this.findMatchCount
    highlightMatches(this.root, this.findQuery, this.findActiveIndex, this.findCaseSensitive)
    scrollToActiveMatch(this.root)
  }

  findPrev(): void {
    if (this.findMatchCount === 0) return
    this.findActiveIndex = (this.findActiveIndex - 1 + this.findMatchCount) % this.findMatchCount
    highlightMatches(this.root, this.findQuery, this.findActiveIndex, this.findCaseSensitive)
    scrollToActiveMatch(this.root)
  }

  replaceCurrentMatch(replacement: string): void {
    if (this.findMatchCount === 0) return
    const matches = findMatches(this.root, this.findQuery, this.findCaseSensitive)
    const match = matches[this.findActiveIndex]
    if (!match) return
    match.node.textContent = match.node.textContent!.slice(0, match.start) + replacement + match.node.textContent!.slice(match.end)
    this.root.normalize()
    this.findMatchCount = highlightMatches(this.root, this.findQuery, this.findActiveIndex, this.findCaseSensitive)
    this.commit()
  }

  replaceAllMatches(replacement: string): number {
    clearFindHighlights(this.root)
    const total = replaceAllMatches(this.root, this.findQuery, replacement, this.findCaseSensitive)
    this.findMatchCount = 0
    this.commit()
    return total
  }

  closeFind(): void {
    clearFindHighlights(this.root)
    this.findQuery = ""
    this.findMatchCount = 0
  }

  // ---- horizontal rule / code block ------------------------------------

  insertHorizontalRule(): void {
    this.focus()
    const hr = document.createElement("hr")
    hr.contentEditable = "false"
    insertNodeAtSelection(this.root, hr)
    const p = document.createElement("p")
    p.innerHTML = "<br>"
    hr.after(p)
    this.commit()
  }

  insertCodeBlock(language = "plaintext"): void {
    this.focus()
    const pre = document.createElement("pre")
    pre.className = "doc-editor-codeblock"
    pre.dataset.language = language
    const code = document.createElement("code")
    code.innerHTML = "<br>"
    pre.appendChild(code)

    const block = getBlockElement(this.root)
    if (block && (block.textContent ?? "").length === 0) block.replaceWith(pre)
    else insertNodeAtSelection(this.root, pre)

    this.commit()
  }

  // ---- slash command menu ----------------------------------------------

  /** Deletes the "/query" text that triggered the slash menu, leaving the caret in its place. */
  consumeSlashQuery(): void {
    const block = getBlockElement(this.root)
    if (!block) return
    block.textContent = ""
    const range = document.createRange()
    range.selectNodeContents(block)
    range.collapse(true)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  insertFromSlash(type: SlashBlockType): void {
    this.consumeSlashQuery()
    switch (type) {
      case "heading1":
        return this.setHeading(1)
      case "heading2":
        return this.setHeading(2)
      case "heading3":
        return this.setHeading(3)
      case "bulletList":
        return this.toggleBulletList()
      case "orderedList":
        return this.toggleOrderedList()
      case "taskList":
        return this.toggleTaskList()
      case "blockquote":
        return this.toggleBlockquote()
      case "table":
        return this.insertTable()
      case "pageBreak":
        return this.insertPageBreak()
      case "horizontalRule":
        return this.insertHorizontalRule()
      case "codeBlock":
        return this.insertCodeBlock()
      case "image":
        return // handled by the caller (needs a file picker)
    }
  }

  private updateSlashState(): void {
    const block = getBlockElement(this.root)
    const text = block?.textContent ?? ""
    const match = text.match(/^\/(\S*)$/)
    if (!match) {
      this.options.onSlashStateChange?.(null)
      return
    }
    const rect = getCaretRect(this.root)
    if (!rect) {
      this.options.onSlashStateChange?.(null)
      return
    }
    const state: SlashState = { rect, query: match[1] }
    this.options.onSlashStateChange?.(state)
  }

  // ---- images --------------------------------------------------------

  private imageCleanupFns: Array<() => void> = []
  private selectedFigure: HTMLElement | null = null

  insertImage({ src, alt }: ImageInsertOptions): void {
    this.focus()
    const img = document.createElement("img")
    img.src = src
    if (alt) img.alt = alt
    img.className = "doc-editor-image"
    insertNodeAtSelection(this.root, img)
    const figure = wrapImageInFigure(img)
    this.imageCleanupFns.push(enableImageResizeHandle(figure))
    this.commit()
  }

  setSelectedImageAlign(align: ImageAlign): void {
    if (!this.selectedFigure) return
    setImageAlign(this.selectedFigure, align)
    this.commit()
  }

  hasSelectedImage(): boolean {
    return this.selectedFigure !== null
  }

  private decorateExistingImages(): void {
    this.imageCleanupFns.forEach((fn) => fn())
    this.imageCleanupFns = []
    this.root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      const figure = wrapImageInFigure(img)
      this.imageCleanupFns.push(enableImageResizeHandle(figure))
    })
  }

  private handleRootClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement
    const figure = target.closest("figure.doc-editor-figure")
    this.selectedFigure = figure instanceof HTMLElement ? figure : null
    this.root.querySelectorAll(".doc-editor-figure--selected").forEach((el) => el.classList.remove("doc-editor-figure--selected"))
    this.selectedFigure?.classList.add("doc-editor-figure--selected")
    this.options.onImageSelectionChange?.(this.selectedFigure !== null)
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
    const headingMatch = block?.tagName.match(/^H([1-6])$/)
    if (headingMatch) heading = Number(headingMatch[1]) as HeadingLevel

    let align: Alignment | null = null
    if (document.queryCommandState("justifyCenter")) align = "center"
    else if (document.queryCommandState("justifyRight")) align = "right"
    else if (document.queryCommandState("justifyFull")) align = "justify"
    else if (document.queryCommandState("justifyLeft")) align = "left"

    const codeActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) => el.tagName === "CODE")
    const highlightActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) => el.tagName === "MARK")
    const linkActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) => el.tagName === "A")
    const taskListActive = !!closestWithin(range?.commonAncestorContainer ?? null, this.root, (el) =>
      el.classList.contains("doc-editor-task-item")
    )

    const fontFamilyEl = closestWithin(
      range?.commonAncestorContainer ?? null,
      this.root,
      (el) => el.tagName === "SPAN" && el.dataset.docEditorStyled === "font-family"
    )
    const fontSizeEl = closestWithin(
      range?.commonAncestorContainer ?? null,
      this.root,
      (el) => el.tagName === "SPAN" && el.dataset.docEditorStyled === "font-size"
    )

    return {
      bold: safeQueryState("bold"),
      italic: safeQueryState("italic"),
      underline: safeQueryState("underline"),
      strike: safeQueryState("strikeThrough"),
      code: codeActive,
      highlight: highlightActive,
      subscript: safeQueryState("subscript"),
      superscript: safeQueryState("superscript"),
      heading,
      bulletList: safeQueryState("insertUnorderedList"),
      orderedList: safeQueryState("insertOrderedList"),
      taskList: taskListActive,
      blockquote: block?.tagName === "BLOCKQUOTE",
      align,
      link: linkActive,
      fontFamily: fontFamilyEl?.style.fontFamily || null,
      fontSize: fontSizeEl ? parseInt(fontSizeEl.style.fontSize, 10) || null : null,
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

  private markdownContext!: MarkdownContext

  private handleInput = (e: Event): void => {
    this.updatePlaceholderState()

    const inputEvent = e as InputEvent
    if (this.options.trackChanges && inputEvent.data && inputEvent.inputType?.startsWith("insert")) {
      const author = this.options.author?.name ?? "Anonymous"
      wrapInsertion(this.root, inputEvent.data.length, author)
    }

    const codeEl = this.getFocusedCodeBlockElement()
    if (codeEl) {
      this.retintCodeBlock(codeEl)
    } else if (tryApplyBlockMarkdownShortcut(this.markdownContext)) {
      this.updateSlashState()
      return
    } else {
      tryApplyInlineMarkdownShortcut(this.root)
    }
    this.updateSlashState()

    if (this.changeRaf) cancelAnimationFrame(this.changeRaf)
    this.changeRaf = requestAnimationFrame(() => {
      this.history.push(this.getHTML())
      this.notifyChange()
      this.schedulePagination()
    })
  }

  private getFocusedCodeBlockElement(): HTMLElement | null {
    const range = getCurrentRange(this.root)
    if (!range) return null
    return closestWithin(range.commonAncestorContainer, this.root, (el) => el.tagName === "CODE" && !!el.closest(".doc-editor-codeblock"))
  }

  private retintCodeBlock(codeEl: HTMLElement): void {
    const offset = getCaretOffsetInBlock(this.root, codeEl)
    const text = codeEl.textContent ?? ""
    codeEl.innerHTML = tintCode(text) || "<br>"
    setCaretOffsetInBlock(codeEl, offset)
  }

  private handleBeforeInput = (e: InputEvent): void => {
    if (!this.options.trackChanges) return
    const author = this.options.author?.name ?? "Anonymous"
    if (interceptDeletion(e, this.root, author)) {
      this.commit()
    }
  }

  // ---- track changes ------------------------------------------------------

  acceptAllChanges(): void {
    acceptAllChanges(this.root)
    this.commit()
  }

  rejectAllChanges(): void {
    rejectAllChanges(this.root)
    this.commit()
  }

  acceptChange(id: string): void {
    acceptChange(this.root, id)
    this.commit()
  }

  rejectChange(id: string): void {
    rejectChange(this.root, id)
    this.commit()
  }

  listTrackedChanges(): TrackedChangeSummary[] {
    return listTrackedChanges(this.root)
  }

  private handlePaste = (e: ClipboardEvent): void => {
    e.preventDefault()
    const html = e.clipboardData?.getData("text/html")
    const text = e.clipboardData?.getData("text/plain") ?? ""

    if (html) {
      const fragment = sanitizeHtml(html)
      if (fragment.childNodes.length > 0) {
        insertNodeAtSelection(this.root, fragment)
        this.commit()
        return
      }
    }

    if (text) {
      insertNodeAtSelection(this.root, document.createTextNode(text))
      this.commit()
    }
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
    const html = this.getHTML()
    this.options.onChange?.(html)
    this.changeListeners.forEach((cb) => cb(html))
  }

  private changeListeners: Array<(html: string) => void> = []

  /** Subscribe to content changes independently of the `onChange` option (used by CollabClient). Returns an unsubscribe function. */
  onDidChange(cb: (html: string) => void): () => void {
    this.changeListeners.push(cb)
    return () => {
      this.changeListeners = this.changeListeners.filter((fn) => fn !== cb)
    }
  }

  /** Replaces content without pushing a new undo step or re-notifying listeners — used to apply remote updates. */
  applyRemoteHTML(html: string): void {
    if (html === this.getHTML()) return
    const saved = saveSelection(this.root)
    this.root.innerHTML = html.length > 0 ? html : "<p><br></p>"
    this.decorateExistingTables()
    this.decorateExistingImages()
    this.updatePlaceholderState()
    this.history.push(this.getHTML())
    restoreSelection(saved)
  }
}

function safeQueryState(command: string): boolean {
  try {
    return document.queryCommandState(command)
  } catch {
    return false
  }
}
