export type Alignment = "left" | "center" | "right" | "justify"

export type HeadingLevel = 1 | 2 | 3

export interface ActiveState {
  bold: boolean
  italic: boolean
  underline: boolean
  strike: boolean
  code: boolean
  highlight: boolean
  heading: HeadingLevel | null
  bulletList: boolean
  orderedList: boolean
  blockquote: boolean
  align: Alignment | null
  link: boolean
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
  /** Whether the editor is editable. Defaults to true. */
  editable?: boolean
}

export interface ImageInsertOptions {
  src: string
  alt?: string
}
