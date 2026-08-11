/**
 * Find & Replace. Walks text nodes directly — no library. Matches are
 * restricted to within a single text node (i.e. a single formatting run);
 * a query spanning a formatting boundary, e.g. "lo **wo" across a bold
 * split, will not be found. Acceptable trade-off for a hand-rolled search.
 */

export interface FindMatch {
  node: Text
  start: number
  end: number
}

export function findMatches(root: HTMLElement, query: string, caseSensitive = false): FindMatch[] {
  if (!query) return []
  const matches: FindMatch[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(".doc-editor-find-highlight") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  })

  const needle = caseSensitive ? query : query.toLowerCase()
  let node = walker.nextNode() as Text | null
  while (node) {
    const text = node.textContent ?? ""
    const haystack = caseSensitive ? text : text.toLowerCase()
    let fromIndex = 0
    let idx: number
    while ((idx = haystack.indexOf(needle, fromIndex)) !== -1) {
      matches.push({ node, start: idx, end: idx + needle.length })
      fromIndex = idx + needle.length
    }
    node = walker.nextNode() as Text | null
  }
  return matches
}

export function clearFindHighlights(root: HTMLElement): void {
  root.querySelectorAll(".doc-editor-find-highlight").forEach((el) => {
    const parent = el.parentNode
    if (!parent) return
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    parent.removeChild(el)
  })
  root.normalize()
}

/**
 * Highlights all matches for `query`, re-walking the (now-mutated) DOM
 * after each wrap since node references shift once wrapped.
 */
export function highlightMatches(root: HTMLElement, query: string, activeIndex: number, caseSensitive = false): number {
  clearFindHighlights(root)
  if (!query) return 0

  let count = 0
  let guard = 0
  while (guard++ < 5000) {
    const matches = findMatches(root, query, caseSensitive)
    if (matches.length <= count) break
    const match = matches[count]
    const range = document.createRange()
    range.setStart(match.node, match.start)
    range.setEnd(match.node, match.end)
    const span = document.createElement("span")
    span.className = `doc-editor-find-highlight${count === activeIndex ? " is-active" : ""}`
    range.surroundContents(span)
    count++
  }
  return count
}

export function scrollToActiveMatch(root: HTMLElement): void {
  root.querySelector(".doc-editor-find-highlight.is-active")?.scrollIntoView({ block: "center", behavior: "smooth" })
}

export function replaceAllMatches(root: HTMLElement, query: string, replacement: string, caseSensitive = false): number {
  let total = 0
  let matches = findMatches(root, query, caseSensitive)
  while (matches.length > 0) {
    const m = matches[0]
    m.node.textContent = m.node.textContent!.slice(0, m.start) + replacement + m.node.textContent!.slice(m.end)
    total++
    matches = findMatches(root, query, caseSensitive)
  }
  root.normalize()
  return total
}
