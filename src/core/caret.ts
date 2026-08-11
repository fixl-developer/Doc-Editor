import { getCurrentRange } from "./selection.js"

/** Bounding rect of the caret in viewport coordinates, or null if no selection in root. */
export function getCaretRect(root: HTMLElement): DOMRect | null {
  const range = getCurrentRange(root)
  if (!range) return null
  const rects = range.getClientRects()
  if (rects.length > 0) return rects[0]
  // Collapsed range at an empty block can report zero rects — fall back to
  // a temporary marker span inserted at the same position.
  const marker = document.createElement("span")
  marker.textContent = "​"
  const clone = range.cloneRange()
  clone.insertNode(marker)
  const rect = marker.getBoundingClientRect()
  marker.remove()
  return rect
}

/** Plain-text content of the block element containing the caret, up to the caret position. */
export function getTextBeforeCaretInBlock(root: HTMLElement, block: HTMLElement): string {
  const range = getCurrentRange(root)
  if (!range) return ""
  const blockRange = document.createRange()
  blockRange.selectNodeContents(block)
  blockRange.setEnd(range.endContainer, range.endOffset)
  return blockRange.toString()
}

/** Number of plain-text characters between the start of `block` and the current caret. */
export function getCaretOffsetInBlock(root: HTMLElement, block: HTMLElement): number {
  return getTextBeforeCaretInBlock(root, block).length
}

/** Places the caret `offset` plain-text characters into `block`, walking its text nodes. */
export function setCaretOffsetInBlock(block: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  let remaining = offset
  let node = walker.nextNode() as Text | null
  let target: Text | null = null
  let targetOffset = 0

  while (node) {
    const len = node.textContent?.length ?? 0
    if (remaining <= len) {
      target = node
      targetOffset = remaining
      break
    }
    remaining -= len
    node = walker.nextNode() as Text | null
  }

  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  if (target) {
    range.setStart(target, targetOffset)
  } else {
    range.selectNodeContents(block)
    range.collapse(false)
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}
