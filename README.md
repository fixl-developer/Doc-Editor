# @fixl/doc-editor

A rich-text document editor engine with zero editor/PDF/table third-party
dependencies, plus a thin React wrapper. Built for CRM/HRM document
templates (offer letters, policies, contracts) but framework-agnostic at
its core.

## Why this exists

The CRM frontend previously used `@tiptap/*` (ProseMirror-based) for its
document editor. This package replaces that with a hand-rolled engine so
the editor can be maintained, extended, and audited in-house, and reused
across other internal projects without pulling in Tiptap/Slate/Quill.

## What "no third-party library" means here

- **Editing surface**: native `contenteditable`.
- **Formatting commands** (bold/italic/underline/strike/lists/alignment/
  links/headings): `document.execCommand` — a **browser-native API**
  supported by every major engine, not an npm package.
- **Everything execCommand doesn't cover** — tables (insert/resize/add-
  remove row & column), inline code/highlight toggling, template variable
  insertion, undo/redo, PDF/HTML export, word count — is hand-written on
  top of the `Selection`/`Range` DOM APIs (`src/core/selection.ts`,
  `src/core/table.ts`).
- **Undo/redo** does not rely on execCommand's native stack. A custom
  `HistoryManager` snapshots HTML after every committed change so custom
  operations (tables, variables) participate in undo/redo consistently.
- **PDF export** goes through the browser's own print pipeline
  (`window.print()` on a hidden iframe) — the user picks "Save as PDF" as
  the print destination. No jsPDF/html2canvas.
- **Icons**: hand-written inline SVGs (`src/icons`) — no lucide-react/
  Radix/shadcn dependency.
- The only runtime peer dependency is React itself, and only if you use
  the `@fixl/doc-editor/react` entry point. The core (`@fixl/doc-editor`)
  has **zero runtime dependencies**.

## Install (local package, not yet published)

```bash
npm install file:../Doc-Editor
# or, once published to an internal registry:
npm install @fixl/doc-editor
```

## Usage — React

```tsx
import { DocEditor } from "@fixl/doc-editor/react"
import "@fixl/doc-editor/styles.css"

function OfferLetterEditor() {
  const [content, setContent] = useState("<p>Dear {{candidateName}},</p>")

  return (
    <DocEditor
      title="Offer Letter Template"
      content={content}
      onChange={setContent}
      onSave={(html) => api.saveTemplate(html)}
      templateVariables={["candidateName", "jobTitle", "startDate"]}
    />
  )
}
```

## Usage — framework-agnostic core

```ts
import { DocEditor } from "@fixl/doc-editor"
import "@fixl/doc-editor/styles.css"

const editor = new DocEditor({
  root: document.getElementById("editor")!,
  content: "<p>Hello</p>",
  onChange: (html) => console.log(html),
})

editor.toggleBold()
editor.insertTable(3, 3)
editor.undo()
```

See `examples/ReactDemo.tsx` and `examples/VanillaDemo.html`.

## Feature set (v1)

- Text formatting: bold, italic, underline, strikethrough, inline code,
  highlight
- Headings H1–H3, paragraph
- Bullet list, numbered list, blockquote
- Alignment: left / center / right / justify
- Links (create/remove)
- Images: URL insert **and** local file upload (base64 data URL, no
  upload server required — swap in your own handler if you want to
  upload to S3/blob storage instead)
- Tables: insert, resizable columns (native drag), add/remove row,
  add/remove column
- Template variables (`{{variable}}`) — click-to-insert, sidebar or
  `<select>`
- Undo/redo (custom history stack, Ctrl/Cmd+Z / Ctrl+Y)
- Word/character count
- Autosave to `localStorage` (pluggable key)
- Export: Print / Save-as-PDF (native browser print), export as `.html`
  file

## Project layout

```
src/
  core/
    DocEditor.ts     — main engine class (framework-agnostic)
    selection.ts      — Selection/Range utilities
    history.ts         — custom undo/redo stack
    table.ts            — table insert/resize/row-col management
    export.ts            — print/PDF, HTML download, word count
    types.ts
  react/
    DocEditorView.tsx  — <DocEditor /> React component
    Toolbar.tsx          — toolbar UI
    Dropdown.tsx          — dependency-free dropdown menu
    useDocEditor.ts        — React hook binding the core engine to a ref
  icons/                    — hand-written inline SVG icon set
  styles/
    doc-editor.css            — plain CSS, no Tailwind required
examples/
  ReactDemo.tsx
  VanillaDemo.html
```

## Build

```bash
npm install
npm run build      # tsc -> dist/, then copies styles.css
npm run typecheck
```

## Known gaps (tracked for phase 2)

- No real-time collaboration (no y.js/ShareDB) — single-editor only.
- No server-side DOCX/PDF generation in this package; wire your backend's
  own DOCX/PDF service if you need server-rendered documents (the old
  CRM backend has `docxLetterTemplate.service.js` for that).
- Image upload defaults to base64 data URLs; for large documents, pass
  your own upload handler and store a real URL instead.
