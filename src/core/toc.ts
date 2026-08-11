export interface TocEntry {
  level: number
  text: string
}

const HEADING_SELECTOR = "h1, h2, h3, h4, h5, h6"

export function getHeadings(root: ParentNode): TocEntry[] {
  return Array.from(root.querySelectorAll(HEADING_SELECTOR)).map((el) => ({
    level: Number(el.tagName[1]),
    text: el.textContent?.trim() || "(untitled)",
  }))
}

/** Parses a standalone HTML string (not attached to the live editor) to extract headings. No DOM library — uses the browser's native DOMParser. */
export function buildTOCFromHTML(html: string): TocEntry[] {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return getHeadings(doc.body)
}
