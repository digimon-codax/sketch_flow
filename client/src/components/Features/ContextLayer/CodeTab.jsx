import { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python }     from "@codemirror/lang-python";
import { sql }        from "@codemirror/lang-sql";

const LANGUAGES = ["javascript", "python", "sql", "text"];

const extensionMap = {
  javascript: [javascript({ jsx: true })],
  python:     [python()],
  sql:        [sql()],
  text:       [],
};

export default function CodeTab({ snippet, language, onSave }) {
  const [code, setCode]     = useState(snippet ?? "");
  const [lang, setLang]     = useState(language ?? "javascript");
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    setCode(snippet ?? "");
    setLang(language ?? "javascript");
  }, [snippet, language]);

  function handleSave() {
    onSave(code, lang);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Language selector */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Code Snippet
        </label>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            fontSize: 11, border: "1px solid #e8e8e8", borderRadius: 5,
            padding: "3px 6px", color: "#555", background: "#fff", cursor: "pointer",
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      {/* CodeMirror editor */}
      <div style={{ border: "1px solid #e8e8e8", borderRadius: 8, overflow: "hidden" }}>
        <CodeMirror
          value={code}
          height="220px"
          extensions={extensionMap[lang] ?? []}
          onChange={(val) => setCode(val)}
          theme="light"
          basicSetup={{
            lineNumbers:      true,
            foldGutter:       false,
            dropCursor:       false,
            allowMultipleSelections: false,
            indentOnInput:    true,
          }}
        />
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        style={{
          padding:      "7px 0",
          borderRadius: 7,
          border:       "none",
          background:   saved ? "#2f9e44" : "#6965db",
          color:        "#fff",
          fontWeight:   600,
          fontSize:     13,
          cursor:       "pointer",
          transition:   "background 0.2s",
        }}
      >
        {saved ? "✓ Saved" : "Save snippet"}
      </button>
    </div>
  );
}
