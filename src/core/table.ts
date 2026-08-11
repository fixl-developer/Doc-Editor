/**
 * Table engine: insert, add/remove row/column, and native drag-resize
 * of columns. No table library — plain DOM + mouse events.
 */

export function createTable(rows: number, cols: number, withHeaderRow = true): HTMLTableElement {
  const table = document.createElement("table")
  table.className = "doc-editor-table"
  table.contentEditable = "true"

  const tbody = document.createElement("tbody")

  for (let r = 0; r < rows; r++) {
    const tr = document.createElement("tr")
    for (let c = 0; c < cols; c++) {
      const isHeader = withHeaderRow && r === 0
      const cell = document.createElement(isHeader ? "th" : "td")
      cell.innerHTML = "<br>"
      cell.style.width = `${Math.floor(100 / cols)}%`
      tr.appendChild(cell)
    }
    tbody.appendChild(tr)
  }

  table.appendChild(tbody)
  return table
}

export function findTableCell(node: Node | null, root: HTMLElement): HTMLTableCellElement | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const el = current as HTMLElement
      if (el.tagName === "TD" || el.tagName === "TH") return el as HTMLTableCellElement
    }
    current = current.parentNode
  }
  return null
}

export function findTable(node: Node | null, root: HTMLElement): HTMLTableElement | null {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === Node.ELEMENT_NODE && (current as HTMLElement).tagName === "TABLE") {
      return current as HTMLTableElement
    }
    current = current.parentNode
  }
  return null
}

export function addRowBelow(cell: HTMLTableCellElement): void {
  const row = cell.parentElement as HTMLTableRowElement
  const table = row.closest("table")
  if (!table) return
  const colCount = row.children.length
  const newRow = document.createElement("tr")
  for (let i = 0; i < colCount; i++) {
    const td = document.createElement("td")
    td.innerHTML = "<br>"
    newRow.appendChild(td)
  }
  row.after(newRow)
}

export function removeRow(cell: HTMLTableCellElement): void {
  const row = cell.parentElement as HTMLTableRowElement
  const table = row.closest("table")
  if (!table) return
  const tbody = row.parentElement
  if (tbody && tbody.children.length <= 1) {
    table.remove()
    return
  }
  row.remove()
}

export function addColumnRight(cell: HTMLTableCellElement): void {
  const table = cell.closest("table")
  if (!table) return
  const cellIndex = Array.from(cell.parentElement!.children).indexOf(cell)
  const rows = table.querySelectorAll("tr")
  rows.forEach((row) => {
    const refCell = row.children[cellIndex] as HTMLTableCellElement | undefined
    const isHeader = refCell?.tagName === "TH"
    const newCell = document.createElement(isHeader ? "th" : "td")
    newCell.innerHTML = "<br>"
    if (refCell) refCell.after(newCell)
    else row.appendChild(newCell)
  })
}

export function removeColumn(cell: HTMLTableCellElement): void {
  const table = cell.closest("table")
  if (!table) return
  const cellIndex = Array.from(cell.parentElement!.children).indexOf(cell)
  const rows = table.querySelectorAll("tr")
  if (rows[0]?.children.length <= 1) {
    table.remove()
    return
  }
  rows.forEach((row) => {
    row.children[cellIndex]?.remove()
  })
}

/**
 * Attaches native drag-to-resize handles to every column boundary in a table.
 * Uses plain mousedown/mousemove/mouseup — no resize library.
 */
export function enableColumnResize(table: HTMLTableElement): () => void {
  const cleanupFns: Array<() => void> = []
  const firstRow = table.querySelector("tr")
  if (!firstRow) return () => {}

  Array.from(firstRow.children).forEach((cellNode) => {
    const cell = cellNode as HTMLTableCellElement
    cell.style.position = cell.style.position || "relative"

    const handle = document.createElement("div")
    handle.className = "doc-editor-col-resize-handle"
    Object.assign(handle.style, {
      position: "absolute",
      top: "0",
      right: "-3px",
      width: "6px",
      height: "100%",
      cursor: "col-resize",
      userSelect: "none",
    } as Partial<CSSStyleDeclaration>)
    cell.appendChild(handle)

    let startX = 0
    let startWidth = 0

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(40, startWidth + delta)
      cell.style.width = `${newWidth}px`
    }
    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
    }
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      startX = e.clientX
      startWidth = cell.offsetWidth
      document.addEventListener("mousemove", onMouseMove)
      document.addEventListener("mouseup", onMouseUp)
    }

    handle.addEventListener("mousedown", onMouseDown)
    cleanupFns.push(() => handle.removeEventListener("mousedown", onMouseDown))
  })

  return () => cleanupFns.forEach((fn) => fn())
}
