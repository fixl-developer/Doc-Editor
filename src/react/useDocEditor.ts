import { useEffect, useRef, useState } from "react"
import { DocEditor } from "../core/DocEditor.js"
import type { ActiveState, DocEditorOptions } from "../core/types.js"

export interface UseDocEditorArgs {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
}

const DEFAULT_STATE: ActiveState = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  code: false,
  highlight: false,
  heading: null,
  bulletList: false,
  orderedList: false,
  blockquote: false,
  align: null,
  link: false,
}

/** React hook that owns the lifecycle of a core DocEditor instance bound to a DOM node. */
export function useDocEditor({ content, onChange, placeholder, editable }: UseDocEditorArgs) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<DocEditor | null>(null)
  const [activeState, setActiveState] = useState<ActiveState>(DEFAULT_STATE)
  const [ready, setReady] = useState(false)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    const options: DocEditorOptions = {
      root: containerRef.current,
      content,
      placeholder,
      editable,
      onChange: (html) => onChangeRef.current(html),
      onSelectionChange: (state) => setActiveState(state),
    }

    const editor = new DocEditor(options)
    editorRef.current = editor
    setReady(true)

    return () => {
      editor.destroy()
      editorRef.current = null
      setReady(false)
    }
    // Intentionally only re-run on mount/unmount — `content` updates are
    // pushed via the effect below so we don't tear down the editor (and
    // lose selection/history) on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return
    if (content !== editor.getHTML()) {
      editor.setHTML(content)
    }
  }, [content])

  return { containerRef, editor: editorRef, activeState, ready }
}
