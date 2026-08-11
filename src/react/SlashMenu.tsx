import * as React from "react"
import type { DocEditor, SlashBlockType } from "../core/DocEditor.js"
import type { SlashState } from "../core/types.js"
import {
  BulletListIcon,
  CheckSquareIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ImageIcon,
  OrderedListIcon,
  PageBreakIcon,
  QuoteIcon,
  TableIcon,
} from "../icons/index.js"

interface SlashItem {
  type: SlashBlockType
  label: string
  keywords: string
  icon: React.ComponentType<{ size?: number }>
}

const ITEMS: SlashItem[] = [
  { type: "heading1", label: "Heading 1", keywords: "h1 heading title", icon: Heading1Icon },
  { type: "heading2", label: "Heading 2", keywords: "h2 heading subtitle", icon: Heading2Icon },
  { type: "heading3", label: "Heading 3", keywords: "h3 heading", icon: Heading3Icon },
  { type: "bulletList", label: "Bullet List", keywords: "ul bullet unordered", icon: BulletListIcon },
  { type: "orderedList", label: "Numbered List", keywords: "ol ordered numbered", icon: OrderedListIcon },
  { type: "taskList", label: "Task List", keywords: "todo checkbox check", icon: CheckSquareIcon },
  { type: "blockquote", label: "Quote", keywords: "blockquote quote", icon: QuoteIcon },
  { type: "table", label: "Table", keywords: "table grid rows columns", icon: TableIcon },
  { type: "image", label: "Image", keywords: "image picture photo upload", icon: ImageIcon },
  { type: "codeBlock", label: "Code Block", keywords: "code snippet pre", icon: CodeIcon },
  { type: "horizontalRule", label: "Divider", keywords: "hr rule divider line", icon: PageBreakIcon },
  { type: "pageBreak", label: "Page Break", keywords: "page break new page", icon: PageBreakIcon },
]

export function SlashMenu({
  editor,
  state,
  onClose,
  onPickImage,
}: {
  editor: DocEditor
  state: SlashState
  onClose: () => void
  onPickImage: () => void
}) {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const menuRef = React.useRef<HTMLDivElement>(null)

  const filtered = React.useMemo(() => {
    const q = state.query.toLowerCase()
    if (!q) return ITEMS
    return ITEMS.filter((item) => item.label.toLowerCase().includes(q) || item.keywords.includes(q))
  }, [state.query])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [state.query])

  const pick = React.useCallback(
    (item: SlashItem) => {
      if (item.type === "image") {
        editor.consumeSlashQuery()
        onPickImage()
      } else {
        editor.insertFromSlash(item.type)
      }
      onClose()
    },
    [editor, onClose, onPickImage]
  )

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (filtered.length === 0) {
        if (e.key === "Escape") onClose()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % filtered.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        pick(filtered[activeIndex])
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener("keydown", onKeyDown, true)
    return () => document.removeEventListener("keydown", onKeyDown, true)
  }, [filtered, activeIndex, pick, onClose])

  if (filtered.length === 0) return null

  const top = state.rect.bottom + window.scrollY + 4
  const left = state.rect.left + window.scrollX

  return (
    <div ref={menuRef} className="doc-editor-slash-menu" style={{ top, left }}>
      {filtered.map((item, i) => {
        const Icon = item.icon
        return (
          <button
            key={item.type}
            type="button"
            className={`doc-editor-slash-item${i === activeIndex ? " is-active" : ""}`}
            onMouseEnter={() => setActiveIndex(i)}
            onClick={() => pick(item)}
          >
            <Icon size={15} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
