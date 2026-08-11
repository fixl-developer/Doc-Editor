import * as React from "react"
import { useDocEditor } from "./useDocEditor.js"
import { EditorToolbar } from "./Toolbar.js"
import { Dropdown, DropdownItem } from "./Dropdown.js"
import { countWordsAndChars, downloadAsHtml, printDocument } from "../core/export.js"
import { DownloadIcon, PrinterIcon, SaveIcon, VariableIcon } from "../icons/index.js"

export interface DocEditorViewProps {
  content: string
  onChange: (content: string) => void
  onSave?: (content: string) => Promise<void> | void
  placeholder?: string
  title?: string
  subtitle?: string
  showToolbar?: boolean
  showSidebar?: boolean
  templateVariables?: string[]
  enableAutoSave?: boolean
  autoSaveKey?: string
  minHeight?: string
  maxWidth?: string
  className?: string
}

export function DocEditorView({
  content,
  onChange,
  onSave,
  placeholder = "Start typing your document...",
  title,
  subtitle,
  showToolbar = true,
  showSidebar = true,
  templateVariables = [],
  enableAutoSave = true,
  autoSaveKey = "doc-editor-autosave",
  minHeight = "600px",
  maxWidth = "100%",
  className,
}: DocEditorViewProps) {
  const [isSaving, setIsSaving] = React.useState(false)
  const { containerRef, editor, activeState, ready } = useDocEditor({
    content,
    placeholder,
    onChange: (html) => {
      onChange(html)
      if (enableAutoSave) {
        try {
          window.localStorage.setItem(autoSaveKey, html)
        } catch {
          // storage unavailable (e.g. private mode quota) — ignore, autosave is best-effort
        }
      }
    },
  })

  const stats = React.useMemo(() => countWordsAndChars(content), [content])

  const handleSave = async () => {
    if (!onSave) return
    setIsSaving(true)
    try {
      await onSave(content)
    } finally {
      setIsSaving(false)
    }
  }

  const handleInsertImage = async (file: File) => {
    if (!editor.current) return
    await editor.current.insertImageFromFile(file)
  }

  const handlePrint = () => {
    printDocument({ title, subtitle, html: content })
  }

  const handleExportHtml = () => {
    downloadAsHtml(content, `${(title || "document").toLowerCase().replace(/\s+/g, "-")}.html`)
  }

  return (
    <div className={`doc-editor-root${className ? ` ${className}` : ""}`} style={{ maxWidth }}>
      {(title || subtitle) && (
        <div className="doc-editor-header">
          {title && <h2 className="doc-editor-title">{title}</h2>}
          {subtitle && <p className="doc-editor-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className="doc-editor-body">
        <div className="doc-editor-main">
          {showToolbar && ready && editor.current && (
            <EditorToolbar
              editor={editor.current}
              activeState={activeState}
              variables={templateVariables}
              onInsertVariable={(v) => editor.current?.insertVariable(v)}
              onInsertImage={handleInsertImage}
            />
          )}

          <div ref={containerRef} className="doc-editor-content-wrapper" style={{ minHeight }} />

          <div className="doc-editor-footer">
            <div className="doc-editor-stats">
              <span>
                Words: <strong>{stats.words}</strong>
              </span>
              <span>
                Characters: <strong>{stats.chars}</strong>
              </span>
            </div>

            <div className="doc-editor-actions">
              {enableAutoSave && <span className="doc-editor-badge">Auto-saved</span>}

              <button type="button" className="doc-editor-action-btn" onClick={handlePrint} title="Print document">
                <PrinterIcon size={14} />
                Print
              </button>

              <Dropdown
                trigger={
                  <button type="button" className="doc-editor-action-btn" title="More options">
                    <DownloadIcon size={14} />
                    Export
                  </button>
                }
              >
                <DropdownItem onClick={handlePrint}>Print / Save as PDF…</DropdownItem>
                <DropdownItem onClick={handleExportHtml}>Export as HTML</DropdownItem>
              </Dropdown>

              {onSave && (
                <button
                  type="button"
                  className="doc-editor-action-btn doc-editor-action-btn--primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  title="Save document"
                >
                  <SaveIcon size={14} />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>

        {showSidebar && templateVariables.length > 0 && (
          <div className="doc-editor-sidebar">
            <p className="doc-editor-sidebar-title">
              <VariableIcon size={14} />
              Template Variables
            </p>
            <p className="doc-editor-sidebar-hint">Click to insert variables</p>

            <div className="doc-editor-variable-list">
              {templateVariables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  className="doc-editor-variable-btn"
                  onClick={() => editor.current?.insertVariable(variable)}
                  title={`Insert {{${variable}}}`}
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
