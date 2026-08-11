import * as React from "react"
import type { DocEditor } from "../core/DocEditor.js"
import { FONT_FAMILIES, FONT_SIZES, type ActiveState, type HeadingLevel } from "../core/types.js"
import { Dropdown, DropdownItem } from "./Dropdown.js"
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  BulletListIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  CodeIcon,
  EraserIcon,
  HighlightIcon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  MessageIcon,
  MoreHorizontalIcon,
  OrderedListIcon,
  PageBreakIcon,
  PaletteIcon,
  QuoteIcon,
  RedoIcon,
  StrikeIcon,
  SubscriptIcon,
  SuperscriptIcon,
  TableColumnMinusIcon,
  TableColumnPlusIcon,
  TableIcon,
  TableRowMinusIcon,
  TableRowPlusIcon,
  UnderlineIcon,
  UndoIcon,
} from "../icons/index.js"

const TEXT_COLORS = [
  "#111827", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
]

const HIGHLIGHT_COLORS = [
  "#fef08a", "#bbf7d0", "#bfdbfe", "#fbcfe8", "#fed7aa", "#e9d5ff",
]

const BLOCK_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "paragraph", label: "Paragraph" },
  { value: "heading1", label: "Heading 1" },
  { value: "heading2", label: "Heading 2" },
  { value: "heading3", label: "Heading 3" },
  { value: "heading4", label: "Heading 4" },
  { value: "heading5", label: "Heading 5" },
  { value: "heading6", label: "Heading 6" },
  { value: "blockquote", label: "Quote" },
]

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

function currentBlockTypeValue(state: ActiveState): string {
  if (state.blockquote) return "blockquote"
  if (state.heading) return `heading${state.heading}`
  return "paragraph"
}

export function EditorToolbar({
  editor,
  activeState,
  variables,
  onInsertVariable,
  onInsertImage,
  hasSelectedImage,
  onAddComment,
}: {
  editor: DocEditor
  activeState: ActiveState
  variables: string[]
  onInsertVariable: (variable: string) => void
  onInsertImage: (file: File) => void
  hasSelectedImage?: boolean
  onAddComment?: () => void
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
    if (url === "") editor.unsetLink()
    else editor.setLink(url)
    forceRerender()
  }

  const applyBlockType = (value: string) => {
    if (value === "paragraph") {
      if (activeState.blockquote) editor.toggleBlockquote()
      else if (activeState.heading) document.execCommand("formatBlock", false, "P")
    } else if (value === "blockquote") {
      editor.toggleBlockquote()
    } else {
      const level = Number(value.replace("heading", "")) as HeadingLevel
      editor.setHeading(level)
    }
    forceRerender()
  }

  return (
    <div className="doc-editor-toolbar">
      <select
        className="doc-editor-select doc-editor-select--block"
        value={currentBlockTypeValue(activeState)}
        onChange={(e) => applyBlockType(e.target.value)}
        title="Paragraph style"
      >
        {BLOCK_TYPE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <select
        className="doc-editor-select doc-editor-select--font"
        value={activeState.fontFamily ?? ""}
        onChange={(e) => e.target.value && editor.setFontFamily(e.target.value)}
        title="Font family"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        className="doc-editor-select doc-editor-select--size"
        value={activeState.fontSize ?? ""}
        onChange={(e) => e.target.value && editor.setFontSize(Number(e.target.value))}
        title="Font size"
      >
        <option value="" disabled>
          Size
        </option>
        {FONT_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>

      <Divider />

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

      <Dropdown
        trigger={
          <ToolbarButton onClick={() => {}} title="Text color">
            <PaletteIcon />
          </ToolbarButton>
        }
      >
        <div className="doc-editor-swatch-grid">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="doc-editor-swatch"
              style={{ background: c }}
              title={c}
              onClick={withRerender(() => editor.setTextColor(c))}
            />
          ))}
        </div>
      </Dropdown>

      <Dropdown
        trigger={
          <ToolbarButton onClick={() => {}} active={activeState.highlight} title="Highlight">
            <HighlightIcon />
          </ToolbarButton>
        }
      >
        <div className="doc-editor-swatch-grid">
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className="doc-editor-swatch"
              style={{ background: c }}
              title={c}
              onClick={withRerender(() => editor.toggleHighlight(c))}
            />
          ))}
        </div>
      </Dropdown>

      {onAddComment && (
        <ToolbarButton onClick={onAddComment} title="Add comment">
          <MessageIcon />
        </ToolbarButton>
      )}

      <Divider />

      <ToolbarButton onClick={insertLink} active={activeState.link} title="Link">
        <LinkIcon />
      </ToolbarButton>
      <ToolbarButton onClick={() => fileInputRef.current?.click()} title="Image">
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

      {hasSelectedImage && (
        <>
          <ToolbarButton onClick={withRerender(() => editor.setSelectedImageAlign("left"))} title="Align image left">
            <AlignLeftIcon />
          </ToolbarButton>
          <ToolbarButton onClick={withRerender(() => editor.setSelectedImageAlign("center"))} title="Center image">
            <AlignCenterIcon />
          </ToolbarButton>
          <ToolbarButton onClick={withRerender(() => editor.setSelectedImageAlign("right"))} title="Align image right">
            <AlignRightIcon />
          </ToolbarButton>
        </>
      )}

      <Divider />

      <Dropdown
        trigger={
          <span className="doc-editor-split-btn">
            <ToolbarButton onClick={withRerender(() => editor.toggleBulletList())} active={activeState.bulletList} title="Bullet List">
              <BulletListIcon />
            </ToolbarButton>
            <ChevronDownIcon size={12} className="doc-editor-split-caret" />
          </span>
        }
      >
        <DropdownItem onClick={withRerender(() => editor.setBulletListStyle("disc"))}>Disc</DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setBulletListStyle("circle"))}>Circle</DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setBulletListStyle("square"))}>Square</DropdownItem>
      </Dropdown>

      <Dropdown
        trigger={
          <span className="doc-editor-split-btn">
            <ToolbarButton onClick={withRerender(() => editor.toggleOrderedList())} active={activeState.orderedList} title="Numbered List">
              <OrderedListIcon />
            </ToolbarButton>
            <ChevronDownIcon size={12} className="doc-editor-split-caret" />
          </span>
        }
      >
        <DropdownItem onClick={withRerender(() => editor.setOrderedListStyle("decimal"))}>1, 2, 3…</DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setOrderedListStyle("lower-alpha"))}>a, b, c…</DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setOrderedListStyle("upper-roman"))}>I, II, III…</DropdownItem>
      </Dropdown>

      <ToolbarButton onClick={withRerender(() => editor.toggleTaskList())} active={activeState.taskList} title="Task List">
        <CheckSquareIcon />
      </ToolbarButton>

      <ToolbarButton onClick={withRerender(() => editor.toggleBlockquote())} active={activeState.blockquote} title="Quote">
        <QuoteIcon />
      </ToolbarButton>

      <Divider />

      <Dropdown
        trigger={
          <span className="doc-editor-split-btn">
            <ToolbarButton onClick={() => {}} title="Alignment">
              {activeState.align === "center" ? (
                <AlignCenterIcon />
              ) : activeState.align === "right" ? (
                <AlignRightIcon />
              ) : activeState.align === "justify" ? (
                <AlignJustifyIcon />
              ) : (
                <AlignLeftIcon />
              )}
            </ToolbarButton>
            <ChevronDownIcon size={12} className="doc-editor-split-caret" />
          </span>
        }
      >
        <DropdownItem onClick={withRerender(() => editor.setAlign("left"))}>
          <AlignLeftIcon size={14} /> Left
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setAlign("center"))}>
          <AlignCenterIcon size={14} /> Center
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setAlign("right"))}>
          <AlignRightIcon size={14} /> Right
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.setAlign("justify"))}>
          <AlignJustifyIcon size={14} /> Justify
        </DropdownItem>
      </Dropdown>

      <ToolbarButton onClick={withRerender(() => editor.insertPageBreak())} title="Page Break">
        <PageBreakIcon />
      </ToolbarButton>

      <select
        className="doc-editor-select"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) editor.setLineHeight(Number(e.target.value))
          forceRerender()
        }}
        title="Line height"
        style={{ maxWidth: "5.5rem" }}
      >
        <option value="" disabled>
          Line height
        </option>
        <option value="1">1.0</option>
        <option value="1.15">1.15</option>
        <option value="1.5">1.5</option>
        <option value="2">2.0</option>
      </select>

      {editor.isInsideTable() ? (
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
      ) : (
        <ToolbarButton onClick={withRerender(() => editor.insertTable())} title="Insert Table">
          <TableIcon />
        </ToolbarButton>
      )}

      <Dropdown
        trigger={
          <ToolbarButton onClick={() => {}} title="More formatting">
            <MoreHorizontalIcon />
          </ToolbarButton>
        }
      >
        <DropdownItem onClick={withRerender(() => editor.toggleSubscript())}>
          <SubscriptIcon size={14} /> Subscript
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.toggleSuperscript())}>
          <SuperscriptIcon size={14} /> Superscript
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.clearFormatting())}>
          <EraserIcon size={14} /> Clear Formatting
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.insertHorizontalRule())}>
          <PageBreakIcon size={14} /> Horizontal Rule
        </DropdownItem>
        <DropdownItem onClick={withRerender(() => editor.insertCodeBlock())}>
          <CodeIcon size={14} /> Code Block
        </DropdownItem>
      </Dropdown>

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
            className="doc-editor-select doc-editor-variable-select"
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
