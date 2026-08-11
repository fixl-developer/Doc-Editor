/**
 * Selection/Range helpers built entirely on native browser APIs
 * (window.getSelection / Range). No third-party dependency.
 */

export interface SavedSelection {
  range: Range
}

export function getSelection(): Selection | null {
  return window.getSelection()
}

export function saveSelection(root: HTMLElement): SavedSelection | null {
  const sel = getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  return { range: range.cloneRange() }
}

export function restoreSelection(saved: SavedSelection | null): void {
  if (!saved) return
  const sel = getSelection()
  if (!sel) return
  sel.removeAllRanges()
  sel.addRange(saved.range)
}

export function isSelectionCollapsed(): boolean {
  const sel = getSelection()
  return !sel || sel.isCollapsed
}

export function getCurrentRange(root: HTMLElement): Range | null {
  const sel = getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.commonAncestorContainer)) return null
  return range
}

/** Walk up from a node to find the nearest ancestor matching a tag, stopping at `root`. */
export function closestWithin(
  node: Node | null,
  root: HTMLElement,
  predicate: (el: HTMLElement) => boolean
): HTMLElement | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE && predicate(current as HTMLElement)) {
      return current as HTMLElement
    }
    current = current.parentNode
  }
  return null
}

/** Find the block-level element (p, h1-h3, li, blockquote, div) containing the selection anchor. */
export function getBlockElement(root: HTMLElement): HTMLElement | null {
  const range = getCurrentRange(root)
  if (!range) return null
  const blockTags = new Set(["P", "H1", "H2", "H3", "LI", "BLOCKQUOTE", "DIV", "TD", "TH"])
  return closestWithin(range.startContainer, root, (el) => blockTags.has(el.tagName))
}

/**
 * Toggle an inline wrapper tag (e.g. <strong>, <em>) around the current selection.
 * If the selection is already fully wrapped, unwraps it; otherwise wraps it.
 */
export function toggleInlineTag(root: HTMLElement, tagName: string, style?: Partial<CSSStyleDeclaration>): void {
  const range = getCurrentRange(root)
  if (!range || range.collapsed) return

  const existing = closestWithin(range.commonAncestorContainer, root, (el) => el.tagName === tagName.toUpperCase())
  if (existing) {
    unwrapElement(existing)
    return
  }

  const wrapper = document.createElement(tagName)
  if (style) Object.assign(wrapper.style, style)

  try {
    range.surroundContents(wrapper)
  } catch {
    // Range spans multiple elements (partial overlap) — fall back to extract/wrap.
    const fragment = range.extractContents()
    wrapper.appendChild(fragment)
    range.insertNode(wrapper)
  }

  const sel = getSelection()
  if (sel) {
    const newRange = document.createRange()
    newRange.selectNodeContents(wrapper)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }
}

export function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode
  if (!parent) return
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el)
  }
  parent.removeChild(el)
}

/** Replace the tag of a block element (e.g. p -> h1) while preserving children. */
export function setBlockTag(root: HTMLElement, tagName: string): void {
  const block = getBlockElement(root)
  if (!block) return
  const el = document.createElement(tagName)
  el.innerHTML = block.innerHTML
  block.replaceWith(el)

  const sel = getSelection()
  if (sel) {
    const newRange = document.createRange()
    newRange.selectNodeContents(el)
    newRange.collapse(false)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }
}

export function insertNodeAtSelection(root: HTMLElement, node: Node): void {
  const range = getCurrentRange(root) ?? (() => {
    const r = document.createRange()
    r.selectNodeContents(root)
    r.collapse(false)
    return r
  })()

  range.deleteContents()
  range.insertNode(node)

  const sel = getSelection()
  if (sel) {
    const newRange = document.createRange()
    newRange.setStartAfter(node)
    newRange.collapse(true)
    sel.removeAllRanges()
    sel.addRange(newRange)
  }
}
