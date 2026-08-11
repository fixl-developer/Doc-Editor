import type { DocComment } from "./types.js"
import { getCurrentRange } from "./selection.js"

function makeId(): string {
  if ("randomUUID" in crypto) return crypto.randomUUID()
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Comments are stored directly as data-* attributes on the anchor span —
 * the DOM is the single source of truth, so comments survive save/reload
 * of the HTML content without a separate store to keep in sync.
 */
export function addComment(root: HTMLElement, text: string, author: string): DocComment | null {
  const range = getCurrentRange(root)
  if (!range || range.collapsed) return null

  const comment: DocComment = { id: makeId(), text, author, createdAt: Date.now(), resolved: false }
  const span = document.createElement("span")
  span.className = "doc-editor-comment"
  applyCommentAttrs(span, comment)

  try {
    range.surroundContents(span)
  } catch {
    const fragment = range.extractContents()
    span.appendChild(fragment)
    range.insertNode(span)
  }
  return comment
}

function applyCommentAttrs(span: HTMLElement, comment: DocComment): void {
  span.dataset.commentId = comment.id
  span.dataset.commentAuthor = comment.author
  span.dataset.commentText = comment.text
  span.dataset.commentCreated = String(comment.createdAt)
  span.dataset.commentResolved = String(comment.resolved)
}

export function getComments(root: HTMLElement): DocComment[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".doc-editor-comment")).map((el) => ({
    id: el.dataset.commentId ?? "",
    text: el.dataset.commentText ?? "",
    author: el.dataset.commentAuthor ?? "",
    createdAt: Number(el.dataset.commentCreated ?? 0),
    resolved: el.dataset.commentResolved === "true",
  }))
}

export function setCommentResolved(root: HTMLElement, id: string, resolved: boolean): void {
  const span = root.querySelector<HTMLElement>(`.doc-editor-comment[data-comment-id="${id}"]`)
  if (!span) return
  span.dataset.commentResolved = String(resolved)
}

export function deleteComment(root: HTMLElement, id: string): void {
  const span = root.querySelector<HTMLElement>(`.doc-editor-comment[data-comment-id="${id}"]`)
  if (!span) return
  const parent = span.parentNode
  if (!parent) return
  while (span.firstChild) parent.insertBefore(span.firstChild, span)
  parent.removeChild(span)
}
