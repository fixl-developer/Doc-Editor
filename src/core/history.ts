/**
 * Custom undo/redo manager. We snapshot the editor's HTML + a rough
 * selection marker after each meaningful change, since we don't rely
 * on the deprecated document.execCommand("undo").
 */

interface HistoryEntry {
  html: string
}

export class HistoryManager {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private lastPushedHtml: string | null = null
  private readonly maxSize: number

  constructor(maxSize = 100) {
    this.maxSize = maxSize
  }

  /** Call after every committed change. Coalesces consecutive identical states. */
  push(html: string): void {
    if (html === this.lastPushedHtml) return
    this.undoStack.push({ html })
    if (this.undoStack.length > this.maxSize) this.undoStack.shift()
    this.redoStack = []
    this.lastPushedHtml = html
  }

  canUndo(): boolean {
    return this.undoStack.length > 1
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  /** Returns the HTML to restore, or null if nothing to undo. */
  undo(): string | null {
    if (!this.canUndo()) return null
    const current = this.undoStack.pop()!
    this.redoStack.push(current)
    const previous = this.undoStack[this.undoStack.length - 1]
    this.lastPushedHtml = previous.html
    return previous.html
  }

  /** Returns the HTML to restore, or null if nothing to redo. */
  redo(): string | null {
    if (!this.canRedo()) return null
    const entry = this.redoStack.pop()!
    this.undoStack.push(entry)
    this.lastPushedHtml = entry.html
    return entry.html
  }

  reset(html: string): void {
    this.undoStack = [{ html }]
    this.redoStack = []
    this.lastPushedHtml = html
  }
}
