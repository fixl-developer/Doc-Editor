# @fixl/doc-editor

A rich-text document editor engine with zero editor/PDF/table/collab
third-party dependencies, plus a thin React wrapper. Built for CRM/HRM
document templates (offer letters, policies, contracts) but
framework-agnostic at its core.

## Why this exists

The CRM frontend previously used `@tiptap/*` (ProseMirror-based) for its
document editor. This package replaces that with a hand-rolled engine so
the editor can be maintained, extended, and audited in-house, and reused
across other internal projects without pulling in Tiptap/Slate/Quill.

## What "no third-party library" means here

- **Editing surface**: native `contenteditable`.
- **Formatting commands** (bold/italic/underline/strike/lists/alignment/
  links/headings/subscript/superscript): `document.execCommand` — a
  **browser-native API** supported by every major engine, not an npm
  package.
- **Everything execCommand doesn't cover** — tables, images with resize/
  caption/align, comments, track changes, slash commands, markdown
  shortcuts, find & replace, pagination, syntax-tinted code blocks,
  undo/redo, PDF/HTML/DOCX export — is hand-written on top of the
  `Selection`/`Range`/`beforeinput` DOM APIs.
- **Undo/redo** does not rely on execCommand's native stack. A custom
  `HistoryManager` snapshots HTML after every committed change so custom
  operations participate in undo/redo consistently.
- **PDF export** goes through the browser's own print pipeline
  (`window.print()` on a hidden iframe) — the user picks "Save as PDF" as
  the print destination. No jsPDF/html2canvas.
- **DOCX export** is a hand-rolled OOXML (WordprocessingML) writer +
  a hand-rolled ZIP container (`src/core/zip.ts`, STORE method, CRC32
  computed by hand) — no `docx`/`jszip`/`officegen`.
- **Real-time collaboration** talks to a hand-rolled WebSocket server
  (`server/collabServer.mjs`) that implements the RFC 6455 handshake and
  frame format directly on Node's `http`+`crypto` — no `ws`/`socket.io`.
- **Icons**: hand-written inline SVGs (`src/icons`) — no lucide-react/
  Radix/shadcn dependency.
- **Paste sanitizer**: hand-rolled tag/attribute whitelist walker
  (`src/core/sanitize.ts`) — no DOMPurify/sanitize-html.
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
      trackChanges={false}
      paginate={false}
      author={{ id: "u1", name: "Priya" }}
      // collab={{ url: "ws://localhost:8787", room: "offer-letter-42" }}
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

See `examples/ReactDemo.tsx` and `examples/VanillaDemo.html`, and
`examples/vite-demo` for a runnable full-featured harness (`npm run dev`
inside that folder).

## Feature set

**Formatting & structure**
- Bold, italic, underline, strikethrough, inline code, highlight,
  subscript, superscript, clear formatting
- Headings H1–H6, paragraph, blockquote, horizontal rule, code block
  (regex-based syntax tinting, no highlight.js/Prism)
- Bullet/numbered lists with style variants (disc/circle/square,
  1-2-3/a-b-c/I-II-III), task lists with checkboxes
- Alignment (left/center/right/justify), line height, font family
  (16 web-safe stacks), font size
- Links, images (URL or file-upload → base64, with drag-resize handle,
  caption, left/center/right alignment)
- Tables: insert, resizable columns, add/remove row & column
- Template variables (`{{variable}}`)

**Editing UX**
- Slash command menu (`/`) for inserting any block
- Markdown shortcuts: `# `/`## `/…, `- `/`* `, `1. `, `> `, ```` ``` ````,
  `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`
- Find & replace with highlight/next/prev/replace/replace-all
- Paste sanitization (strips scripts/styles/tracking attrs from pasted
  HTML)
- Undo/redo (Ctrl/Cmd+Z, Ctrl+Y), word/character count, autosave

**Review workflow**
- Comments/annotations anchored to text ranges, resolve/reopen/delete
- Track changes / suggestion mode: insertions wrap in `<ins>`, deletions
  wrap in `<del>` instead of removing, accept/reject individually or all
  at once (via `beforeinput` interception — no diff library)
- Read-only mode toggle
- Table of contents (auto-built from headings, click to scroll)

**Layout & output**
- Page-canvas mode (Word-style white page on gray backdrop) with zoom,
  or plain full-width card mode
- Approximate auto-pagination: soft page-break markers inserted as
  content grows past one page's height (`paginate` prop, opt-in — see
  Known limitations)
- Manual page breaks
- Light/dark theme toggle, fullscreen toggle
- Export: Print/Save-as-PDF, HTML file, **DOCX file**
- Keyboard shortcuts cheatsheet

**Collaboration**
- Basic real-time co-editing: `collab={{ url, room }}` prop connects to
  `server/collabServer.mjs`; shows a live presence count + connection
  status dot. See Known limitations — this is a broadcast relay, not a
  CRDT/OT engine.

## Running the collab server

```bash
node server/collabServer.mjs 8787
```

No dependencies to install — it only uses Node's built-in `http` and
`crypto` modules.

## Project layout

```
src/
  core/
    DocEditor.ts       — main engine class (framework-agnostic)
    selection.ts         — Selection/Range utilities
    caret.ts               — caret rect / text-offset helpers
    history.ts               — custom undo/redo stack
    table.ts                   — table insert/resize/row-col management
    imageResize.ts                — figure/caption/resize/align
    markdown.ts                     — block & inline markdown shortcuts
    sanitize.ts                       — paste HTML sanitizer
    findReplace.ts                      — find & replace
    comments.ts                           — DOM-attribute-backed comments
    trackChanges.ts                         — suggestion mode (ins/del)
    pagination.ts                             — soft page-break insertion
    syntaxHighlight.ts                          — code block tinting
    toc.ts                                        — heading outline
    zip.ts                                          — hand-rolled ZIP writer
    docx.ts                                           — HTML -> OOXML
    export.ts                                           — print/PDF, HTML
    types.ts
  collab/
    CollabClient.ts     — WebSocket client for basic real-time co-editing
  react/
    DocEditorView.tsx  — <DocEditor /> React component
    Toolbar.tsx           — toolbar UI
    SlashMenu.tsx           — "/" command menu
    FindReplaceBar.tsx        — find/replace panel
    TableOfContents.tsx         — outline sidebar
    CommentsPanel.tsx              — comments sidebar
    Dropdown.tsx                     — dependency-free dropdown menu
    useDocEditor.ts                    — React hook binding the core engine
  icons/                                 — hand-written inline SVG icon set
  styles/
    doc-editor.css                         — plain CSS, light/dark theme vars
server/
  collabServer.mjs     — hand-rolled WebSocket relay (Node http+crypto)
examples/
  ReactDemo.tsx
  VanillaDemo.html
  vite-demo/            — runnable full-featured demo (npm run dev)
```

## Build

```bash
npm install
npm run build      # tsc -> dist/, then copies styles.css
npm run typecheck
```

## Known limitations (documented trade-offs, not hidden gaps)

- **Real-time collab is last-write-wins broadcast, not a CRDT/OT
  engine.** Two people editing the same paragraph within the debounce
  window (~500ms) can clobber each other. No live cursor positions —
  only a presence count/list. Fine for a couple of people co-editing a
  letter; not Google-Docs-grade.
- **Find & replace matches are restricted to a single text node** (i.e.
  a single formatting run). A query spanning a bold/italic boundary
  won't be found.
- **Track changes flattens formatting inside an edited span** for
  deletions/insertions wrapping — nested `<ins>`/`<del>` around already
  richly-formatted text is handled per-range, not per-diff-token, so
  very complex overlapping edits may not track with full fidelity.
- **Auto-pagination is heuristic**, not real typesetting: it won't split
  a single tall block (e.g. a huge table) across two pages, it just
  pushes the whole block to the next page. Off by default (`paginate`
  prop).
- **DOCX export simplifications**: lists render as prefixed paragraphs
  ("• "/"1. ") rather than true OOXML numbering definitions; images
  become a `[Image: alt text]` placeholder (no media/relationship parts
  embedded yet); links render as "text (url)" rather than a true
  hyperlink relationship.
- **PDF page numbers** use CSS `counter(page)`, which is inconsistently
  supported by browser print engines — treat as best-effort, not
  guaranteed.
- Image upload defaults to base64 data URLs; for large documents, pass
  your own upload handler and store a real URL instead.
