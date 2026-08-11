export type Alignment = "left" | "center" | "right" | "justify"

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6

export type BlockType = "paragraph" | `heading${HeadingLevel}` | "blockquote"

export type BulletListStyle = "disc" | "circle" | "square"

export type OrderedListStyle = "decimal" | "lower-alpha" | "upper-roman" | "lower-roman"

/** Curated web-safe font stacks — no external font loading / CDN required. */
export const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Inter", value: "Inter, system-ui, sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Garamond", value: "Garamond, serif" },
  { label: "Palatino", value: '"Palatino Linotype", Palatino, serif' },
  { label: "Cambria", value: "Cambria, serif" },
  { label: "Trebuchet MS", value: '"Trebuchet MS", sans-serif' },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
  { label: "Courier New", value: '"Courier New", Courier, monospace' },
  { label: "Consolas", value: "Consolas, monospace" },
  { label: "Comic Sans MS", value: '"Comic Sans MS", "Comic Sans", cursive' },
  { label: "Impact", value: "Impact, sans-serif" },
] as const

export const FONT_SIZES = [10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64] as const

export interface ActiveState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  code: boolean
  highlight: boolean
  subscript: boolean
  superscript: boolean
  heading: HeadingLevel | null
  bulletList: boolean
  orderedList: boolean
  taskList: boolean
  blockquote: boolean
  align: Alignment | null
  link: boolean
  fontFamily: string | null
  fontSize: number | null
}

export interface SlashState {
  rect: DOMRect
  query: string
}

export interface DocComment {
  id: string
  text: string
  author: string
  createdAt: number
  resolved: boolean
}

export interface TrackChangeAuthor {
  id: string
  name: string
}

export interface DocEditorOptions {
  /** Element the editor mounts into. Must be empty or contain initial HTML. */
  root: HTMLElement
  /** Initial HTML content. */
  content?: string
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string
  /** Called whenever the document content changes (debounced to animation frame). */
  onChange?: (html: string) => void
  /** Called whenever the active formatting state under the cursor changes. */
  onSelectionChange?: (state: ActiveState) => void
  /** Called on every keystroke with the current "/" slash-command query, or null when not active. */
  onSlashStateChange?: (state: SlashState | null) => void
  /** Called whenever an image (figure) is clicked/deselected. */
  onImageSelectionChange?: (selected: boolean) => void
  /** Called whenever the comment list changes (add/resolve/delete). */
  onCommentsChange?: (comments: DocComment[]) => void
  /** Whether the editor is editable. Defaults to true. */
  editable?: boolean
  /** When true, edits are recorded as tracked insertions/deletions instead of applied directly. */
  trackChanges?: boolean
  /** Identity used to attribute tracked changes and comments. */
  author?: TrackChangeAuthor
}

export interface ImageInsertOptions {
  src: string
  alt?: string
}
