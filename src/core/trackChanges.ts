/**
 * Track changes / suggestion mode. Implemented via the native
 * `beforeinput` event (InputEvent.inputType + getTargetRanges()) — no
 * diff library. Insertions land normally, then get retroactively wrapped
 * in <ins>; deletions are intercepted before they happen and the target
 * range is wrapped in <del> instead of being removed.
 */

function makeId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID()
  return `tc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export interface TrackChangesHandlers {
  isEnabled: () => boolean
  getAuthor: () => string
}

/**
 * Call from a `beforeinput` listener. Returns true if the event was
 * handled here (deletion converted to a <del> wrap) and should not
 * proceed to the browser's default behavior.
 */
export function interceptDeletion(e: InputEvent, root: HTMLElement, author: string): boolean {
  if (!e.inputType.startsWith("delete")) return false
  const ranges = e.getTargetRanges?.()
  if (!ranges || ranges.length === 0) return false

  const staticRange = ranges[0]
  const range = document.createRange()
  range.setStart(staticRange.startContainer, staticRange.startOffset)
  range.setEnd(staticRange.endContainer, staticRange.endOffset)
  if (range.collapsed) return false

  e.preventDefault()

  const del = document.createElement("del")
  del.className = "doc-editor-tracked-del"
  del.dataset.changeId = makeId()
  del.dataset.author = author
  del.dataset.createdAt = String(Date.now())

  const fragment = range.extractContents()
  del.appendChild(fragment)
  range.insertNode(del)

  const sel = window.getSelection()
  if (sel) {
    const collapseRange = document.createRange()
    if (e.inputType === "deleteContentBackward") collapseRange.setStartBefore(del)
    else collapseRange.setStartAfter(del)
    collapseRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(collapseRange)
  }

  return true
}

/**
 * Call after an insertion-type input event has already been applied by
 * the browser. Wraps the just-inserted text (length = insertedLength,
 * ending at the current caret) in <ins>, extending an adjacent <ins> by
 * the same author instead of nesting a new one where possible.
 */
export function wrapInsertion(root: HTMLElement, insertedLength: number, author: string): void {
  if (insertedLength <= 0) return
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const caret = sel.getRangeAt(0)
  if (!caret.collapsed) return

  const range = document.createRange()
  range.setEnd(caret.startContainer, caret.startOffset)
  let remaining = insertedLength
  let node: Node = caret.startContainer
  let offset = caret.startOffset

  // Walk backward from the caret to find the start point `insertedLength` characters back.
  while (remaining > 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      const available = offset
      if (remaining <= available) {
        offset -= remaining
        remaining = 0
        break
      }
      remaining -= available
      const prev = node.previousSibling
      if (!prev) break
      node = prev
      offset = node.nodeType === Node.TEXT_NODE ? (node.textContent?.length ?? 0) : 0
    } else {
      break
    }
  }
  range.setStart(node, offset)

  const existingIns = range.startContainer.parentElement?.closest("ins.doc-editor-tracked-ins")
  if (existingIns instanceof HTMLElement && existingIns.dataset.author === author && existingIns.contains(range.endContainer)) {
    return // already inside our own pending insertion span
  }

  const ins = document.createElement("ins")
  ins.className = "doc-editor-tracked-ins"
  ins.dataset.changeId = makeId()
  ins.dataset.author = author
  ins.dataset.createdAt = String(Date.now())

  try {
    const fragment = range.extractContents()
    ins.appendChild(fragment)
    range.insertNode(ins)
  } catch {
    return
  }

  const after = document.createRange()
  after.setStartAfter(ins)
  after.collapse(true)
  sel.removeAllRanges()
  sel.addRange(after)
}

export function acceptAllChanges(root: HTMLElement): void {
  root.querySelectorAll(".doc-editor-tracked-del").forEach((el) => el.remove())
  root.querySelectorAll(".doc-editor-tracked-ins").forEach((el) => unwrap(el as HTMLElement))
}

export function rejectAllChanges(root: HTMLElement): void {
  root.querySelectorAll(".doc-editor-tracked-ins").forEach((el) => el.remove())
  root.querySelectorAll(".doc-editor-tracked-del").forEach((el) => unwrap(el as HTMLElement))
}

export function acceptChange(root: HTMLElement, id: string): void {
  const el = root.querySelector(`[data-change-id="${id}"]`)
  if (!el) return
  if (el.classList.contains("doc-editor-tracked-del")) el.remove()
  else unwrap(el as HTMLElement)
}

export function rejectChange(root: HTMLElement, id: string): void {
  const el = root.querySelector(`[data-change-id="${id}"]`)
  if (!el) return
  if (el.classList.contains("doc-editor-tracked-ins")) el.remove()
  else unwrap(el as HTMLElement)
}

function unwrap(el: HTMLElement): void {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  parent.removeChild(el)
}

export interface TrackedChangeSummary {
  id: string
  type: "insertion" | "deletion"
  text: string
  author: string
  createdAt: number
}

export function listTrackedChanges(root: HTMLElement): TrackedChangeSummary[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(".doc-editor-tracked-ins, .doc-editor-tracked-del"))
  return nodes.map((el) => ({
    id: el.dataset.changeId ?? "",
    type: el.classList.contains("doc-editor-tracked-ins") ? "insertion" : "deletion",
    text: el.textContent ?? "",
    author: el.dataset.author ?? "",
    createdAt: Number(el.dataset.createdAt ?? 0),
  }))
}
