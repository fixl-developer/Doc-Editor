import { getBlockElement, getCurrentRange } from "./selection.js"

export interface MarkdownContext {
  root: HTMLElement
  applyHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void
  applyBulletList: () => void
  applyOrderedList: () => void
  applyBlockquote: () => void
  applyCodeBlock: () => void
}

const BLOCK_PATTERNS: Array<{ pattern: RegExp; apply: (ctx: MarkdownContext, match: RegExpMatchArray) => void }> = [
  { pattern: /^(#{1,6})\s$/, apply: (ctx, m) => ctx.applyHeading(m[1].length as 1 | 2 | 3 | 4 | 5 | 6) },
  { pattern: /^[-*]\s$/, apply: (ctx) => ctx.applyBulletList() },
  { pattern: /^1\.\s$/, apply: (ctx) => ctx.applyOrderedList() },
  { pattern: /^>\s$/, apply: (ctx) => ctx.applyBlockquote() },
  { pattern: /^```$/, apply: (ctx) => ctx.applyCodeBlock() },
]

/**
 * Called on every input event. If the text content of the current block
 * matches a markdown block prefix (e.g. "# ", "- ", "1. ", "> ", "```"),
 * strips it and applies the corresponding block command.
 */
export function tryApplyBlockMarkdownShortcut(ctx: MarkdownContext): boolean {
  const block = getBlockElement(ctx.root)
  const range = getCurrentRange(ctx.root)
  if (!block || !range || !range.collapsed) return false
  if (block.tagName === "PRE" || block.closest("pre")) return false

  const text = block.textContent ?? ""
  for (const { pattern, apply } of BLOCK_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      block.textContent = ""
      apply(ctx, match)
      const newBlock = getBlockElement(ctx.root)
      if (newBlock) {
        const sel = window.getSelection()
        const r = document.createRange()
        r.selectNodeContents(newBlock)
        r.collapse(true)
        sel?.removeAllRanges()
        sel?.addRange(r)
      }
      return true
    }
  }
  return false
}

interface InlineMatch {
  tag: "strong" | "em" | "code" | "s"
  raw: string
  inner: string
}

const INLINE_PATTERNS: Array<{ regex: RegExp; tag: InlineMatch["tag"] }> = [
  { regex: /\*\*([^*\n]+)\*\*$/, tag: "strong" },
  { regex: /(?<!\*)\*([^*\n]+)\*$/, tag: "em" },
  { regex: /`([^`\n]+)`$/, tag: "code" },
  { regex: /~~([^~\n]+)~~$/, tag: "s" },
]

/**
 * Called after typing a character that could complete an inline markdown
 * span (space, or the trigger char itself). Looks at the text node under
 * the caret; if it ends with **bold**, *italic*, `code`, or ~~strike~~,
 * replaces the raw markers with the corresponding inline element.
 */
export function tryApplyInlineMarkdownShortcut(root: HTMLElement): boolean {
  const range = getCurrentRange(root)
  if (!range || !range.collapsed) return false
  const node = range.startContainer
  if (node.nodeType !== Node.TEXT_NODE) return false

  const text = node.textContent ?? ""
  const before = text.slice(0, range.startOffset)

  for (const { regex, tag } of INLINE_PATTERNS) {
    const match = before.match(regex)
    if (!match) continue
    const raw = match[0]
    const inner = match[1]
    const matchStart = range.startOffset - raw.length

    const el = document.createElement(tag)
    el.textContent = inner

    const replaceRange = document.createRange()
    replaceRange.setStart(node, matchStart)
    replaceRange.setEnd(node, range.startOffset)
    replaceRange.deleteContents()
    replaceRange.insertNode(el)

    const sel = window.getSelection()
    const after = document.createRange()
    after.setStartAfter(el)
    after.collapse(true)
    sel?.removeAllRanges()
    sel?.addRange(after)
    return true
  }
  return false
}
