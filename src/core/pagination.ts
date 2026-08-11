/**
 * Approximate multi-page flow: walks the top-level block children of the
 * content element, accumulates their rendered height, and inserts a
 * non-editable "soft" page-break marker whenever a block would cross a
 * page boundary. Recomputed on a debounce after edits — not on every
 * keystroke, since it mutates sibling structure.
 *
 * This is a heuristic layout pass, not a real pagination engine: it does
 * not split a single tall block (e.g. one huge table) across two pages,
 * it just pushes the whole block onto the next page. Good enough for
 * letters/policies/contracts; not a Word-perfect typesetting replacement.
 */

const AUTO_BREAK_ATTR = "data-auto-page-break"

export function clearAutoPageBreaks(contentEl: HTMLElement): void {
  contentEl.querySelectorAll(`[${AUTO_BREAK_ATTR}]`).forEach((el) => el.remove())
}

export function recomputePagination(contentEl: HTMLElement, pageHeightPx: number): void {
  clearAutoPageBreaks(contentEl)
  if (pageHeightPx <= 0) return

  const children = Array.from(contentEl.children) as HTMLElement[]
  let pageStartTop: number | null = null
  let pageBudget = pageHeightPx

  for (const child of children) {
    if (child.hasAttribute(AUTO_BREAK_ATTR)) continue
    if (child.classList.contains("doc-editor-page-break")) {
      // A manual break resets the page budget.
      pageStartTop = null
      continue
    }

    const rect = child.getBoundingClientRect()
    if (pageStartTop === null) pageStartTop = rect.top

    const heightSoFar = rect.bottom - pageStartTop
    if (heightSoFar > pageBudget && rect.height <= pageBudget) {
      const marker = document.createElement("div")
      marker.className = "doc-editor-page-break doc-editor-page-break--auto"
      marker.setAttribute(AUTO_BREAK_ATTR, "true")
      marker.contentEditable = "false"
      child.before(marker)
      pageStartTop = rect.top
    }
  }
}
