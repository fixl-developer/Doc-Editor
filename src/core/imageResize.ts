export type ImageAlign = "left" | "center" | "right"

/** Wraps a bare <img> in a <figure><figcaption> so it can carry a caption and alignment. Idempotent. */
export function wrapImageInFigure(img: HTMLImageElement): HTMLElement {
  const existing = img.closest("figure.doc-editor-figure")
  if (existing) return existing as HTMLElement

  const figure = document.createElement("figure")
  figure.className = "doc-editor-figure doc-editor-figure--center"
  const caption = document.createElement("figcaption")
  caption.contentEditable = "true"
  caption.dataset.placeholder = "Add a caption…"

  img.replaceWith(figure)
  figure.appendChild(img)
  figure.appendChild(caption)
  return figure
}

export function setImageAlign(figure: HTMLElement, align: ImageAlign): void {
  figure.classList.remove("doc-editor-figure--left", "doc-editor-figure--center", "doc-editor-figure--right")
  figure.classList.add(`doc-editor-figure--${align}`)
}

/**
 * Adds a native drag handle to the bottom-right corner of the figure's
 * image, resizing it by dragging (aspect ratio preserved). No resize
 * library — plain mousedown/mousemove/mouseup.
 */
export function enableImageResizeHandle(figure: HTMLElement): () => void {
  const img = figure.querySelector("img")
  if (!img) return () => {}

  const handle = document.createElement("div")
  handle.className = "doc-editor-image-resize-handle"
  figure.appendChild(handle)
  figure.classList.add("doc-editor-figure--resizable")

  let startX = 0
  let startWidth = 0
  let aspect = 1

  const onMouseMove = (e: MouseEvent) => {
    const delta = e.clientX - startX
    const newWidth = Math.max(60, startWidth + delta)
    img.style.width = `${newWidth}px`
    img.style.height = `${Math.round(newWidth / aspect)}px`
  }
  const onMouseUp = () => {
    document.removeEventListener("mousemove", onMouseMove)
    document.removeEventListener("mouseup", onMouseUp)
  }
  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    startX = e.clientX
    startWidth = img.getBoundingClientRect().width
    aspect = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : startWidth / (img.getBoundingClientRect().height || 1)
    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  handle.addEventListener("mousedown", onMouseDown)
  return () => handle.removeEventListener("mousedown", onMouseDown)
}
