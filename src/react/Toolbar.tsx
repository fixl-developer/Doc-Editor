import * as React from "react"
import type { DocEditor } from "../core/DocEditor.js"
import type { ActiveState } from "../core/types.js"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  HighlightIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  OrderedListIcon,
  QuoteIcon,
  RedoIcon,
  StrikeIcon,
  TableColumnMinusIcon,
  TableColumnPlusIcon,
  TableIcon,
  TableRowMinusIcon,
  TableRowPlusIcon,
  UnderlineIcon,
  UndoIcon,
} from "../icons/index.js"

export function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={`doc-editor-toolbar-btn${active ? " is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="doc-editor-toolbar-divider" />
}

export function EditorToolbar({
  editor,
  activeState,
  variables,
  onInsertVariable,
  onInsertImage,
}: {
  editor: DocEditor
  activeState: ActiveState
  variables: string[]
  onInsertVariable: (variable: string) => void
  onInsertImage: (file: File) => void
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [, forceRerender] = React.useReducer((x) => x + 1, 0)

  const withRerender = (fn: () => void) => () => {
    fn()
    forceRerender()
  }

  const insertLink = () => {
    const url = window.prompt("URL", "")
    if (url === null) return
    if (url === "") {
      editor.unsetLink()
    } else {
      editor.setLink(url)
    }
    forceRerender()
  }

  const insertImage = () => fileInputRef.current?.click()

  return (
    <div className="doc-editor-toolbar">
      <ToolbarButton onClick={withRerender(() => editor.toggleBold())} active={activeState.bold} title="Bold">
        <BoldIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleItalic())} active={activeState.italic} title="Italic">
        <ItalicIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleUnderline())} active={activeState.underline} title="Underline">
        <UnderlineIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleStrike())} active={activeState.strike} title="Strikethrough">
        <StrikeIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleCode())} active={activeState.code} title="Code">
        <CodeIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleHighlight())} active={activeState.highlight} title="Highlight">
        <HighlightIcon />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={withRerender(() => editor.setHeading(1))} active={activeState.heading === 1} title="Heading 1">
        <Heading1Icon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.setHeading(2))} active={activeState.heading === 2} title="Heading 2">
        <Heading2Icon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.setHeading(3))} active={activeState.heading === 3} title="Heading 3">
        <Heading3Icon />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={withRerender(() => editor.toggleBulletList())} active={activeState.bulletList} title="Bullet List">
        <BulletListIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleOrderedList())} active={activeState.orderedList} title="Numbered List">
        <OrderedListIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.toggleBlockquote())} active={activeState.blockquote} title="Quote">
        <QuoteIcon />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={withRerender(() => editor.setAlign("left"))} active={activeState.align === "left"} title="Align Left">
        <AlignLeftIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.setAlign("center"))} active={activeState.align === "center"} title="Align Center">
        <AlignCenterIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.setAlign("right"))} active={activeState.align === "right"} title="Align Right">
        <AlignRightIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.setAlign("justify"))} active={activeState.align === "justify"} title="Justify">
        <AlignJustifyIcon />
      </ToolbarButton>

      <Divider />

      <ToolbarButton onClick={insertLink} active={activeState.link} title="Link">
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton onClick={insertImage} title="Image">
        <ImageIcon />
      </ToolbarButton>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onInsertImage(file)
          e.target.value = ""
        }}
      />
      <ToolbarButton onClick={withRerender(() => editor.insertTable())} title="Insert Table">
        <TableIcon />
      </ToolbarButton>

      {editor.isInsideTable() && (
        <>
          <ToolbarButton onClick={withRerender(() => editor.addTableRowBelow())} title="Add Row Below">
            <TableRowPlusIcon />
          </ToolbarButton>
          <ToolbarButton onClick={withRerender(() => editor.removeTableRow())} title="Remove Row">
            <TableRowMinusIcon />
          </ToolbarButton>
          <ToolbarButton onClick={withRerender(() => editor.addTableColumnRight())} title="Add Column">
            <TableColumnPlusIcon />
          </ToolbarButton>
          <ToolbarButton onClick={withRerender(() => editor.removeTableColumn())} title="Remove Column">
            <TableColumnMinusIcon />
          </ToolbarButton>
        </>
      )}

      <Divider />

      <ToolbarButton onClick={withRerender(() => editor.undo())} disabled={!editor.canUndo()} title="Undo">
        <UndoIcon />
      </ToolbarButton>
      <ToolbarButton onClick={withRerender(() => editor.redo())} disabled={!editor.canRedo()} title="Redo">
        <RedoIcon />
      </ToolbarButton>

      {variables.length > 0 && (
        <>
          <Divider />
          <select
            className="doc-editor-variable-select"
            value=""
            onChange={(e) => {
              if (e.target.value) onInsertVariable(e.target.value)
              e.target.value = ""
            }}
          >
            <option value="" disabled>
              Insert variable…
            </option>
            {variables.map((v) => (
              <option key={v} value={v}>
                {`{{${v}}}`}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  )
}
