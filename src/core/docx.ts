import { ZipWriter } from "./zip.js"

/**
 * Hand-rolled HTML -> OOXML (WordprocessingML) converter + .docx packager.
 * No `docx`/`officegen`/`jszip` dependency — the ZIP container comes from
 * our own zip.ts, and this file emits document.xml by hand.
 *
 * Known simplifications (documented, not silent):
 * - Lists are rendered as paragraphs prefixed with "•"/"1." text rather
 *   than true OOXML numbering definitions (avoids needing a numbering.xml
 *   part). Visually equivalent, not a "real" Word list you can renumber.
 * - Images are replaced with a "[Image: alt text]" placeholder — embedding
 *   binary media requires additional relationship/media parts; out of
 *   scope for v1.
 * - Links render as "text (https://url)" rather than a true OOXML
 *   hyperlink relationship.
 */

const HEADING_SIZES: Record<number, number> = { 1: 32, 2: 28, 3: 24, 4: 22, 5: 20, 6: 18 }

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

interface RunStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
  code?: boolean
  highlight?: boolean
  sizeHalfPoints?: number
}

function runXml(text: string, style: RunStyle): string {
  if (!text) return ""
  const props: string[] = []
  if (style.bold) props.push("<w:b/>")
  if (style.italic) props.push("<w:i/>")
  if (style.underline) props.push('<w:u w:val="single"/>')
  if (style.strike) props.push("<w:strike/>")
  if (style.code) props.push('<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>')
  if (style.highlight) props.push('<w:highlight w:val="yellow"/>')
  if (style.sizeHalfPoints) props.push(`<w:sz w:val="${style.sizeHalfPoints}"/>`)
  const rPr = props.length ? `<w:rPr>${props.join("")}</w:rPr>` : ""
  return `<w:r>${rPr}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`
}

function collectRuns(node: Node, inherited: RunStyle): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return runXml(node.textContent ?? "", inherited)
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return ""

  const el = node as HTMLElement
  const style: RunStyle = { ...inherited }
  switch (el.tagName) {
    case "STRONG":
    case "B":
      style.bold = true
      break
    case "EM":
    case "I":
      style.italic = true
      break
    case "U":
      style.underline = true
      break
    case "S":
    case "STRIKE":
    case "DEL":
      style.strike = true
      break
    case "CODE":
      style.code = true
      break
    case "MARK":
      style.highlight = true
      break
    case "A": {
      const href = el.getAttribute("href")
      const inner = Array.from(el.childNodes).map((c) => collectRuns(c, style)).join("")
      return inner + (href ? runXml(` (${href})`, style) : "")
    }
    case "BR":
      return "<w:br/>"
  }

  return Array.from(el.childNodes).map((c) => collectRuns(c, style)).join("")
}

function paragraphXml(el: HTMLElement, opts: { align?: string; indent?: boolean } = {}): string {
  const isHeading = /^H[1-6]$/.test(el.tagName)
  const style: RunStyle = isHeading ? { bold: true, sizeHalfPoints: HEADING_SIZES[Number(el.tagName[1])] * 2 } : {}
  const runs = Array.from(el.childNodes).map((c) => collectRuns(c, style)).join("") || "<w:r><w:t></w:t></w:r>"
  const pPrParts: string[] = []
  if (opts.align) pPrParts.push(`<w:jc w:val="${opts.align}"/>`)
  if (opts.indent) pPrParts.push('<w:ind w:left="720"/>')
  const pPr = pPrParts.length ? `<w:pPr>${pPrParts.join("")}</w:pPr>` : ""
  return `<w:p>${pPr}${runs}</w:p>`
}

function tableXml(table: HTMLTableElement): string {
  const rows = Array.from(table.querySelectorAll("tr"))
  const rowsXml = rows
    .map((row) => {
      const cells = Array.from(row.children) as HTMLElement[]
      const cellsXml = cells
        .map((cell) => {
          const runs = Array.from(cell.childNodes).map((c) => collectRuns(c, { bold: cell.tagName === "TH" })).join("")
          return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p>${runs || "<w:r><w:t></w:t></w:r>"}</w:p></w:tc>`
        })
        .join("")
      return `<w:tr>${cellsXml}</w:tr>`
    })
    .join("")
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>
  </w:tblBorders></w:tblPr>${rowsXml}</w:tbl>`
}

function alignFromStyle(el: HTMLElement): string | undefined {
  const align = el.style.textAlign || el.getAttribute("align") || ""
  if (align === "center") return "center"
  if (align === "right") return "right"
  if (align === "justify") return "both"
  return undefined
}

function blockToXml(el: HTMLElement): string {
  switch (el.tagName) {
    case "P":
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6":
      return paragraphXml(el, { align: alignFromStyle(el) })
    case "BLOCKQUOTE":
      return Array.from(el.children).length
        ? Array.from(el.children)
            .map((c) => paragraphXml(c as HTMLElement, { indent: true }))
            .join("")
        : paragraphXml(el, { indent: true })
    case "UL":
      return Array.from(el.querySelectorAll(":scope > li"))
        .map((li) => {
          const runs = Array.from(li.childNodes).map((c) => collectRuns(c, {})).join("")
          return `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${runXml("• ", {})}${runs}</w:p>`
        })
        .join("")
    case "OL":
      return Array.from(el.querySelectorAll(":scope > li"))
        .map((li, i) => {
          const runs = Array.from(li.childNodes).map((c) => collectRuns(c, {})).join("")
          return `<w:p><w:pPr><w:ind w:left="720"/></w:pPr>${runXml(`${i + 1}. `, {})}${runs}</w:p>`
        })
        .join("")
    case "TABLE":
      return tableXml(el as HTMLTableElement)
    case "HR":
      return `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>`
    case "FIGURE": {
      const img = el.querySelector("img")
      const caption = el.querySelector("figcaption")?.textContent ?? ""
      const alt = img?.getAttribute("alt") || "image"
      return paragraphXml(document.createRange().createContextualFragment(`<p>[Image: ${esc(alt)}]${caption ? ` — ${esc(caption)}` : ""}</p>`)
        .firstChild as HTMLElement)
    }
    case "PRE":
      return `<w:p>${runXml(el.textContent ?? "", { code: true })}</w:p>`
    default:
      return ""
  }
}

export function htmlToDocumentXml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  const body = Array.from(doc.body.children)
    .map((el) => blockToXml(el as HTMLElement))
    .join("")

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
${body}
<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body>
</w:document>`
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

export async function buildDocxBlob(html: string): Promise<Blob> {
  const zip = new ZipWriter()
  zip.addFile("[Content_Types].xml", CONTENT_TYPES)
  zip.addFile("_rels/.rels", ROOT_RELS)
  zip.addFile("word/document.xml", htmlToDocumentXml(html))
  return zip.toBlob()
}

export async function downloadDocx(html: string, filename = "document.docx"): Promise<void> {
  const blob = await buildDocxBlob(html)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
