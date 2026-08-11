import * as React from "react"
import { createRoot } from "react-dom/client"
import { DocEditor } from "../../../src/react/index.js"
import "../../../src/styles/doc-editor.css"

function Demo() {
  const [content, setContent] = React.useState(
    `<h1>NON-DISCLOSURE AGREEMENT</h1><p>This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into as of {{effectiveDate}} by and between {{disclosingParty}} and {{receivingParty}}.</p><ul class="doc-editor-tasklist"><li class="doc-editor-task-item"><input type="checkbox"><span class="doc-editor-task-label">Review clause 3.2</span></li></ul>`
  )

  return (
    <div style={{ padding: "2rem", maxWidth: 960, margin: "0 auto" }}>
      <DocEditor
        title="Non-disclosure agreement"
        subtitle="Draft"
        content={content}
        onChange={setContent}
        onSave={async () => alert("Saved (demo)")}
        templateVariables={["effectiveDate", "disclosingParty", "receivingParty"]}
      />
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Demo />)
