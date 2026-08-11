import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(root, "src", "styles", "doc-editor.css")
const outDir = join(root, "dist", "styles")
const out = join(outDir, "doc-editor.css")

mkdirSync(outDir, { recursive: true })
copyFileSync(src, out)
console.log("Copied doc-editor.css to dist/styles/")
