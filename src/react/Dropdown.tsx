import * as React from "react"

/** Minimal dependency-free dropdown menu (no Radix/headlessui). */
export function Dropdown({
  trigger,
  children,
  align = "end",
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: "start" | "end"
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onEsc)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onEsc)
    }
  }, [open])

  return (
    <div className="doc-editor-dropdown" ref={rootRef}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          className="doc-editor-dropdown-menu"
          style={align === "end" ? { right: 0 } : { left: 0 }}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export function DropdownItem({
  onClick,
  disabled,
  children,
  title,
}: {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      className="doc-editor-dropdown-item"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  )
}
