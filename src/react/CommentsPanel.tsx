import type { DocEditor } from "../core/DocEditor.js"
import type { DocComment } from "../core/types.js"

export function CommentsPanel({ editor, comments }: { editor: DocEditor; comments: DocComment[] }) {
  if (comments.length === 0) {
    return <p className="doc-editor-sidebar-hint">Select text and click "Comment" to start a thread.</p>
  }

  return (
    <div className="doc-editor-comments-panel">
      {comments.map((c) => (
        <div key={c.id} className={`doc-editor-comment-card${c.resolved ? " is-resolved" : ""}`}>
          <div className="doc-editor-comment-meta">
            <span>{c.author}</span>
            <span>{new Date(c.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="doc-editor-comment-text">{c.text}</p>
          <div className="doc-editor-comment-actions">
            <button type="button" onClick={() => editor.resolveComment(c.id, !c.resolved)}>
              {c.resolved ? "Reopen" : "Resolve"}
            </button>
            <button type="button" onClick={() => editor.deleteComment(c.id)}>
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
