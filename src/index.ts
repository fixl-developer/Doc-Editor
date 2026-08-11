export { DocEditor } from "./core/DocEditor.js"
export { printDocument, downloadAsHtml, countWordsAndChars } from "./core/export.js"
export { HistoryManager } from "./core/history.js"
export * as tableUtils from "./core/table.js"
export * as selectionUtils from "./core/selection.js"
export type {
  ActiveState,
  Alignment,
  DocEditorOptions,
  HeadingLevel,
  ImageInsertOptions,
} from "./core/types.js"
