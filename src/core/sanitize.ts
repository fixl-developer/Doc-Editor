/**
 * Hand-rolled HTML sanitizer for pasted content — no DOMPurify/sanitize-html.
 * Whitelists a small set of tags/attributes relevant to a document editor
 * and strips everything else (scripts, styles, event handlers, iframes,
 * javascript: URLs, foreign inline styles).
 */

const ALLOWED_TAGS = new Set([
  "P", "BR", "H1", "H2", "H3", "H4", "H5", "H6", "STRONG", "B", "EM", "I",
  "U", "S", "STRIKE", "CODE", "MARK", "A", "UL", "OL", "LI", "BLOCKQUOTE",
  "TABLE", "THEAD", "TBODY", "TR", "TD", "TH", "IMG", "HR", "SPAN", "SUB", "SUP",
])

const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ["href"],
  IMG: ["src", "alt"],
  SPAN: ["style"],
  TD: ["style"],
  TH: ["style"],
}

const ALLOWED_STYLE_PROPS = new Set(["font-family", "font-size", "color", "background-color", "text-align", "width"])

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase()
  return !trimmed.startsWith("javascript:") && !trimmed.startsWith("data:text/html")
}

function sanitizeStyle(styleText: string): string {
  return styleText
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const [prop] = rule.split(":")
      return prop && ALLOWED_STYLE_PROPS.has(prop.trim().toLowerCase())
    })
    .join("; ")
}

function sanitizeNode(node: Node): Node | null {
  if (node.nodeType === Node.TEXT_NODE) return node.cloneNode()

  if (node.nodeType !== Node.ELEMENT_NODE) return null
  const el = node as HTMLElement

  if (!ALLOWED_TAGS.has(el.tagName)) {
    // Unwrap disallowed containers (e.g. <div>, <span style with tracking>) by keeping children.
    const frag = document.createDocumentFragment()
    el.childNodes.forEach((child) => {
      const cleaned = sanitizeNode(child)
      if (cleaned) frag.appendChild(cleaned)
    })
    return frag.childNodes.length > 0 ? frag : null
  }

  const clean = document.createElement(el.tagName)
  const allowedAttrs = ALLOWED_ATTRS[el.tagName] ?? []

  for (const attr of allowedAttrs) {
    const value = el.getAttribute(attr)
    if (!value) continue
    if ((attr === "href" || attr === "src") && !isSafeUrl(value)) continue
    if (attr === "style") {
      const cleanedStyle = sanitizeStyle(value)
      if (cleanedStyle) clean.setAttribute("style", cleanedStyle)
      continue
    }
    clean.setAttribute(attr, value)
  }

  el.childNodes.forEach((child) => {
    const cleaned = sanitizeNode(child)
    if (cleaned) clean.appendChild(cleaned)
  })

  return clean
}

export function sanitizeHtml(html: string): DocumentFragment {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const frag = document.createDocumentFragment()
  doc.body.childNodes.forEach((child) => {
    const cleaned = sanitizeNode(child)
    if (cleaned) frag.appendChild(cleaned)
  })
  return frag
}
