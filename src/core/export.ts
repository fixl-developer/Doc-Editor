/**
 * Export utilities. PDF export goes through the browser's native
 * print pipeline (window.print on a hidden iframe) — no jsPDF/html2canvas.
 * HTML export is a plain Blob download.
 */

export interface PrintOptions {
  title?: string
  subtitle?: string
  html: string
}

/**
 * Renders the document into a hidden iframe with print-friendly styles
 * and opens the native browser print dialog. The user can choose
 * "Save as PDF" as the destination — this is the OS/browser's own
 * PDF renderer, not a bundled library.
 */
export function printDocument({ title, subtitle, html }: PrintOptions): void {
  const iframe = document.createElement("iframe")
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  })
  document.body.appendChild(iframe)

  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }

  doc.open()
  doc.write(`
    <html>
      <head>
        <title>${escapeHtml(title ?? "Document")}</title>
        <style>
          @page { margin: 24mm 18mm; }
          body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #111; }
          h1, h2, h3 { margin: 20px 0 10px; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          td, th { border: 1px solid #ccc; padding: 8px; }
          img { max-width: 100%; }
          blockquote { border-left: 3px solid #ccc; margin: 12px 0; padding-left: 12px; color: #555; }
        </style>
      </head>
      <body>
        ${title ? `<h1>${escapeHtml(title)}</h1>` : ""}
        ${subtitle ? `<p style="color:#666;font-size:14px;">${escapeHtml(subtitle)}</p>` : ""}
        ${html}
      </body>
    </html>
  `)
  doc.close()

  const cleanup = () => {
    setTimeout(() => document.body.removeChild(iframe), 250)
  }

  iframe.contentWindow?.focus()
  iframe.contentWindow?.print()
  cleanup()
}

export function downloadAsHtml(html: string, filename = "document.html"): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function countWordsAndChars(html: string): { words: number; chars: number } {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ")
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const chars = text.replace(/\s/g, "").length
  return { words, chars }
}

function escapeHtml(value: string): string {
  const div = document.createElement("div")
  div.textContent = value
  return div.innerHTML
}
