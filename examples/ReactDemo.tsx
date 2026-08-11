import * as React from "react"
import { DocEditor } from "../src/react/index.js"
import "../src/styles/doc-editor.css"

/**
 * Minimal usage example. In a consuming app:
 *
 *   npm install @fixl/doc-editor
 *   import { DocEditor } from "@fixl/doc-editor/react"
 *   import "@fixl/doc-editor/styles.css"
 */
export default function ReactDemo() {
  const [content, setContent] = React.useState(
    "<h1>Offer Letter</h1><p>Dear {{candidateName}},</p><p>We are pleased to offer you the position of {{jobTitle}}.</p>"
  )

  return (
    <DocEditor
      title="Offer Letter Template"
      subtitle="Edit the template below"
      content={content}
      onChange={setContent}
      onSave={async (html) => {
        await fetch("/api/hrm/documents/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: html }),
        })
      }}
      templateVariables={["candidateName", "jobTitle", "startDate", "salary"]}
    />
  )
}
