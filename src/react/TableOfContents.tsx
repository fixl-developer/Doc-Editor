import * as React from "react"
import type { DocEditor } from "../core/DocEditor.js"
import { buildTOCFromHTML } from "../core/toc.js"

export function TableOfContents({ editor, content }: { editor: DocEditor; content: string }) {
  const entries = React.useMemo(() => buildTOCFromHTML(content), [content])

  if (entries.length === 0) {
    return <p className="doc-editor-sidebar-hint">No headings yet.</p>
  }

  return (
    <div className="doc-editor-toc-list">
      {entries.map((entry, i) => (
        <button
          key={i}
          type="button"
          className="doc-editor-toc-item"
          style={{ paddingLeft: `${0.5 + (entry.level - 1) * 0.75}rem` }}
          onClick={() => editor.scrollToHeadingIndex(i)}
          title={entry.text}
        >
          {entry.text}
        </button>
      ))}
    </div>
  )
}
