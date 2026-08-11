import * as React from "react"
import { useDocEditor } from "./useDocEditor.js"
import { EditorToolbar } from "./Toolbar.js"
import { Dropdown, DropdownItem } from "./Dropdown.js"
import { SlashMenu } from "./SlashMenu.js"
import { FindReplaceBar } from "./FindReplaceBar.js"
import { TableOfContents } from "./TableOfContents.js"
import { CommentsPanel } from "./CommentsPanel.js"
import { countWordsAndChars, downloadAsHtml, printDocument } from "../core/export.js"
import { downloadDocx } from "../core/docx.js"
import { CollabClient, type CollabStatus, type CollabUser } from "../collab/CollabClient.js"
import type { TrackChangeAuthor } from "../core/types.js"
import {
  CheckSquareIcon,
  DownloadIcon,
  FileTextIcon,
  KeyboardIcon,
  ListTreeIcon,
  LockIcon,
  MaximizeIcon,
  MessageIcon,
  MinimizeIcon,
  MoonIcon,
  PanelRightIcon,
  PrinterIcon,
  SaveIcon,
  SearchIcon,
  SunIcon,
  UnlockIcon,
  UsersIcon,
  VariableIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "../icons/index.js"

export interface DocEditorViewProps {
  content: string
  onChange: (content: string) => void
  onSave?: (content: string) => Promise<void> | void
  placeholder?: string
  title?: string
  subtitle?: string
  showToolbar?: boolean
  showSidebar?: boolean
  /** Renders the document as a centered, page-like canvas (Word-style) instead of a plain full-width card. Defaults to true. */
  pageMode?: boolean
  templateVariables?: string[]
  enableAutoSave?: boolean
  autoSaveKey?: string
  minHeight?: string
  maxWidth?: string
  className?: string
  /** Enables suggestion mode: edits are recorded as accept/reject-able insertions & deletions. */
  trackChanges?: boolean
  /** Identity used to attribute tracked changes and comments. */
  author?: TrackChangeAuthor
  /** Auto-inserts soft page-break markers as content grows past one page's height. Approximate — see README. */
  paginate?: boolean
  /** Enables basic real-time co-editing against server/collabServer.mjs. Last-write-wins broadcast, not a CRDT — see README. */
  collab?: { url: string; room: string }
}

const PAGE_CONTENT_HEIGHT_PX = 900

const ZOOM_MIN = 50
const ZOOM_MAX = 200
const ZOOM_STEP = 10

const SHORTCUTS: Array<[string, string]> = [
  ["Ctrl/Cmd + B", "Bold"],
  ["Ctrl/Cmd + I", "Italic"],
  ["Ctrl/Cmd + U", "Underline"],
  ["Ctrl/Cmd + Z", "Undo"],
  ["Ctrl/Cmd + Shift + Z", "Redo"],
  ["/", "Open slash command menu"],
  ["# / ## / ###", "Markdown heading shortcut"],
  ["- or *", "Markdown bullet list shortcut"],
  ["1.", "Markdown numbered list shortcut"],
  [">", "Markdown blockquote shortcut"],
  ["**text**", "Bold via markdown"],
  ["`code`", "Inline code via markdown"],
]

type SidebarTab = "variables" | "toc" | "comments" | "changes"

export function DocEditorView({
  content,
  onChange,
  onSave,
  placeholder = "Start typing your document...",
  title,
  subtitle,
  showToolbar = true,
  showSidebar = true,
  pageMode = true,
  templateVariables = [],
  enableAutoSave = true,
  autoSaveKey = "doc-editor-autosave",
  minHeight = "600px",
  maxWidth = "100%",
  className,
  trackChanges = false,
  author,
  paginate = false,
  collab,
}: DocEditorViewProps) {
  const [collabStatus, setCollabStatus] = React.useState<CollabStatus>("disconnected")
  const [collabUsers, setCollabUsers] = React.useState<CollabUser[]>([])
  const collabUserRef = React.useRef<CollabUser>({
    id: author?.id ?? Math.random().toString(36).slice(2),
    name: author?.name ?? "Anonymous",
  })
  const [isSaving, setIsSaving] = React.useState(false)
  const [zoom, setZoom] = React.useState(100)
  const [theme, setTheme] = React.useState<"light" | "dark">("light")
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [sidebarVisible, setSidebarVisible] = React.useState(showSidebar)
  const [sidebarTab, setSidebarTab] = React.useState<SidebarTab>(templateVariables.length > 0 ? "variables" : "toc")
  const [showFindBar, setShowFindBar] = React.useState(false)
  const [trackChangesOn, setTrackChangesOn] = React.useState(trackChanges)
  const [readOnly, setReadOnly] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const slashImageInputRef = React.useRef<HTMLInputElement>(null)

  const { containerRef, editor, activeState, slashState, setSlashState, comments, hasSelectedImage, ready } = useDocEditor({
    content,
    placeholder,
    trackChanges: trackChangesOn,
    author,
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

  React.useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current)
    document.addEventListener("fullscreenchange", onFsChange)
    return () => document.removeEventListener("fullscreenchange", onFsChange)
  }, [])

  React.useEffect(() => {
    editor.current?.setTrackChanges(trackChangesOn)
  }, [trackChangesOn, editor])

  React.useEffect(() => {
    editor.current?.setEditable(!readOnly)
  }, [readOnly, editor])

  React.useEffect(() => {
    if (ready) editor.current?.setPagination(paginate, PAGE_CONTENT_HEIGHT_PX)
  }, [paginate, ready, editor, content])

  React.useEffect(() => {
    if (!collab || !ready || !editor.current) return
    const client = new CollabClient({
      url: collab.url,
      room: collab.room,
      user: collabUserRef.current,
      editor: editor.current,
      onStatusChange: setCollabStatus,
      onPresenceChange: setCollabUsers,
    })
    return () => client.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collab?.url, collab?.room, ready])

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      rootRef.current?.requestFullscreen()
    }
  }

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

  const fileBaseName = (title || "document").toLowerCase().replace(/\s+/g, "-")

  const handleExportHtml = () => {
    downloadAsHtml(content, `${fileBaseName}.html`)
  }

  const handleExportDocx = () => {
    downloadDocx(content, `${fileBaseName}.docx`)
  }

  const handleAddComment = () => {
    const text = window.prompt("Comment")
    if (text) editor.current?.addComment(text)
  }

  const editorSurface = (
    <div ref={containerRef} className="doc-editor-content-wrapper" style={{ minHeight }} />
  )

  const slashMenu = slashState && editor.current && (
    <SlashMenu
      editor={editor.current}
      state={slashState}
      onClose={() => setSlashState(null)}
      onPickImage={() => slashImageInputRef.current?.click()}
    />
  )

  const sidebarTabs: SidebarTab[] = [
    ...(templateVariables.length > 0 ? (["variables"] as SidebarTab[]) : []),
    "toc",
    "comments",
    ...(trackChangesOn ? (["changes"] as SidebarTab[]) : []),
  ]

  return (
    <div
      ref={rootRef}
      data-theme={theme}
      className={`doc-editor-root${className ? ` ${className}` : ""}${pageMode ? " doc-editor-root--page-mode" : ""}`}
      style={{ maxWidth }}
    >
      {showToolbar && ready && editor.current && (
        <EditorToolbar
          editor={editor.current}
          activeState={activeState}
          variables={templateVariables}
          onInsertVariable={(v) => editor.current?.insertVariable(v)}
          onInsertImage={handleInsertImage}
          hasSelectedImage={hasSelectedImage}
          onAddComment={handleAddComment}
        />
      )}

      {showFindBar && editor.current && <FindReplaceBar editor={editor.current} onClose={() => setShowFindBar(false)} />}

      {trackChangesOn && (
        <div className="doc-editor-find-bar">
          <span className="doc-editor-find-count">Suggestion mode is on — edits are tracked.</span>
          <button type="button" className="doc-editor-action-btn" onClick={() => editor.current?.acceptAllChanges()}>
            Accept All
          </button>
          <button type="button" className="doc-editor-action-btn" onClick={() => editor.current?.rejectAllChanges()}>
            Reject All
          </button>
        </div>
      )}

      <div className="doc-editor-chrome-bar">
        {pageMode ? (
          <div className="doc-editor-zoom-controls">
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
              title="Zoom out"
            >
              <ZoomOutIcon size={15} />
            </button>
            <span className="doc-editor-zoom-value">{zoom}%</span>
            <button
              type="button"
              className="doc-editor-toolbar-btn"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
              title="Zoom in"
            >
              <ZoomInIcon size={15} />
            </button>
          </div>
        ) : (
          <div />
        )}

        <div className="doc-editor-chrome-actions">
          {collab && (
            <span className="doc-editor-collab-presence" title={`${collabStatus}${collabUsers.length ? " — " + collabUsers.map((u) => u.name).join(", ") : ""}`}>
              <span className={`doc-editor-collab-dot doc-editor-collab-dot--${collabStatus}`} />
              <UsersIcon size={14} />
              {collabUsers.length}
            </span>
          )}

          <button
            type="button"
            className={`doc-editor-toolbar-btn${showFindBar ? " is-active" : ""}`}
            onClick={() => setShowFindBar((v) => !v)}
            title="Find & replace"
          >
            <SearchIcon size={15} />
          </button>

          <button
            type="button"
            className={`doc-editor-toolbar-btn${trackChangesOn ? " is-active" : ""}`}
            onClick={() => setTrackChangesOn((v) => !v)}
            title="Toggle suggestion mode (track changes)"
          >
            <FileTextIcon size={15} />
          </button>

          <button
            type="button"
            className={`doc-editor-toolbar-btn${readOnly ? " is-active" : ""}`}
            onClick={() => setReadOnly((v) => !v)}
            title={readOnly ? "Switch to editing" : "Switch to read-only"}
          >
            {readOnly ? <LockIcon size={15} /> : <UnlockIcon size={15} />}
          </button>

          {pageMode && (
            <button type="button" className="doc-editor-toolbar-btn" onClick={toggleFullscreen} title="Toggle fullscreen">
              {isFullscreen ? <MinimizeIcon size={15} /> : <MaximizeIcon size={15} />}
            </button>
          )}

          <Dropdown
            trigger={
              <button type="button" className="doc-editor-toolbar-btn" title="Export">
                <DownloadIcon size={15} />
              </button>
            }
          >
            <DropdownItem onClick={handlePrint}>Print / Save as PDF…</DropdownItem>
            <DropdownItem onClick={handleExportHtml}>Export as HTML</DropdownItem>
            <DropdownItem onClick={handleExportDocx}>Export as Word (.docx)</DropdownItem>
          </Dropdown>

          <button
            type="button"
            className={`doc-editor-toolbar-btn${sidebarVisible ? " is-active" : ""}`}
            onClick={() => setSidebarVisible((v) => !v)}
            title="Toggle side panel"
          >
            <PanelRightIcon size={15} />
          </button>

          <Dropdown
            trigger={
              <button type="button" className="doc-editor-toolbar-btn" title="Keyboard shortcuts">
                <KeyboardIcon size={15} />
              </button>
            }
          >
            <div style={{ padding: "0.5rem", minWidth: 220 }}>
              {SHORTCUTS.map(([keys, label]) => (
                <div key={keys} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "0.75rem", padding: "0.2rem 0" }}>
                  <span style={{ opacity: 0.7 }}>{label}</span>
                  <code>{keys}</code>
                </div>
              ))}
            </div>
          </Dropdown>

          <button
            type="button"
            className="doc-editor-toolbar-btn"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            title="Toggle theme"
          >
            {theme === "light" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
          </button>
        </div>
      </div>

      <div className="doc-editor-body">
        <div className="doc-editor-main">
          {pageMode ? (
            <div className="doc-editor-page-backdrop">
              <div className="doc-editor-page" style={{ transform: `scale(${zoom / 100})` }}>
                {(title || subtitle) && (
                  <div className="doc-editor-page-header">
                    {title && <span className="doc-editor-page-title">{title}</span>}
                    {subtitle && <span className="doc-editor-page-subtitle">{subtitle}</span>}
                  </div>
                )}
                {editorSurface}
              </div>
            </div>
          ) : (
            <>
              {(title || subtitle) && (
                <div className="doc-editor-header">
                  {title && <h2 className="doc-editor-title">{title}</h2>}
                  {subtitle && <p className="doc-editor-subtitle">{subtitle}</p>}
                </div>
              )}
              {editorSurface}
            </>
          )}

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

              {!pageMode && (
                <button type="button" className="doc-editor-action-btn" onClick={handlePrint} title="Print document">
                  <PrinterIcon size={14} />
                  Print
                </button>
              )}

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

        {sidebarVisible && editor.current && (
          <div className="doc-editor-sidebar">
            <div className="doc-editor-sidebar-tabs">
              {sidebarTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`doc-editor-sidebar-tab${sidebarTab === tab ? " is-active" : ""}`}
                  onClick={() => setSidebarTab(tab)}
                  title={tab}
                >
                  {tab === "variables" && <VariableIcon size={13} />}
                  {tab === "toc" && <ListTreeIcon size={13} />}
                  {tab === "comments" && <MessageIcon size={13} />}
                  {tab === "changes" && <CheckSquareIcon size={13} />}
                </button>
              ))}
            </div>

            {sidebarTab === "variables" && templateVariables.length > 0 && (
              <>
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
              </>
            )}

            {sidebarTab === "toc" && (
              <>
                <p className="doc-editor-sidebar-title">
                  <ListTreeIcon size={14} />
                  Outline
                </p>
                <TableOfContents editor={editor.current} content={content} />
              </>
            )}

            {sidebarTab === "comments" && (
              <>
                <p className="doc-editor-sidebar-title">
                  <MessageIcon size={14} />
                  Comments
                </p>
                <CommentsPanel editor={editor.current} comments={comments} />
              </>
            )}

            {sidebarTab === "changes" && (
              <>
                <p className="doc-editor-sidebar-title">
                  <CheckSquareIcon size={14} />
                  Tracked Changes
                </p>
                <div className="doc-editor-comments-panel">
                  {editor.current.listTrackedChanges().length === 0 && (
                    <p className="doc-editor-sidebar-hint">No pending changes.</p>
                  )}
                  {editor.current.listTrackedChanges().map((c) => (
                    <div key={c.id} className="doc-editor-comment-card">
                      <div className="doc-editor-comment-meta">
                        <span>{c.author}</span>
                        <span>{c.type}</span>
                      </div>
                      <p className="doc-editor-comment-text">{c.text || "(empty)"}</p>
                      <div className="doc-editor-comment-actions">
                        <button type="button" onClick={() => editor.current?.acceptChange(c.id)}>
                          Accept
                        </button>
                        <button type="button" onClick={() => editor.current?.rejectChange(c.id)}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {slashMenu}
      <input
        ref={slashImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (file) await handleInsertImage(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
