import * as React from "react"
import type { DocEditor } from "../core/DocEditor.js"
import { CloseIcon } from "../icons/index.js"

export function FindReplaceBar({ editor, onClose }: { editor: DocEditor; onClose: () => void }) {
  const [query, setQuery] = React.useState("")
  const [replacement, setReplacement] = React.useState("")
  const [count, setCount] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
    return () => editor.closeFind()
  }, [editor])

  React.useEffect(() => {
    setCount(editor.find(query))
  }, [editor, query])

  const close = () => {
    editor.closeFind()
    onClose()
  }

  return (
    <div className="doc-editor-find-bar">
      <input
        ref={inputRef}
        className="doc-editor-find-input"
        placeholder="Find…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.shiftKey ? editor.findPrev() : editor.findNext()
          } else if (e.key === "Escape") {
            close()
          }
        }}
      />
      <span className="doc-editor-find-count">{count > 0 ? `${count} match${count === 1 ? "" : "es"}` : "No matches"}</span>
      <button type="button" className="doc-editor-toolbar-btn" onClick={() => editor.findPrev()} disabled={count === 0}>
        ↑
      </button>
      <button type="button" className="doc-editor-toolbar-btn" onClick={() => editor.findNext()} disabled={count === 0}>
        ↓
      </button>
      <input
        className="doc-editor-find-input"
        placeholder="Replace with…"
        value={replacement}
        onChange={(e) => setReplacement(e.target.value)}
      />
      <button
        type="button"
        className="doc-editor-action-btn"
        onClick={() => editor.replaceCurrentMatch(replacement)}
        disabled={count === 0}
      >
        Replace
      </button>
      <button
        type="button"
        className="doc-editor-action-btn"
        onClick={() => {
          editor.replaceAllMatches(replacement)
          setCount(0)
          setQuery("")
        }}
        disabled={count === 0}
      >
        Replace All
      </button>
      <button type="button" className="doc-editor-toolbar-btn" onClick={close} title="Close">
        <CloseIcon size={14} />
      </button>
    </div>
  )
}
