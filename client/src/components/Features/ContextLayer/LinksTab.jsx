import { useState, useEffect } from "react";

export default function LinksTab({ links, onSave }) {
  const [list,  setList]  = useState(links ?? []);
  const [input, setInput] = useState("");

  useEffect(() => { setList(links ?? []); }, [links]);

  function addLink() {
    const url = input.trim();
    if (!url) return;
    const next = [...list, url];
    setList(next);
    onSave(next);
    setInput("");
  }

  function removeLink(idx) {
    const next = list.filter((_, i) => i !== idx);
    setList(next);
    onSave(next);
  }

  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#999", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Links
      </label>

      {/* Input row */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <input
          type="url"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLink()}
          placeholder="https://docs.example.com"
          style={{
            flex: 1, border: "1px solid #e8e8e8", borderRadius: 7,
            padding: "7px 10px", fontSize: 12, outline: "none", color: "#333",
          }}
          onFocus={(e) => (e.target.style.borderColor = "#6965db")}
          onBlur={(e)  => (e.target.style.borderColor = "#e8e8e8")}
        />
        <button
          onClick={addLink}
          style={{
            padding: "7px 12px", borderRadius: 7, border: "none",
            background: "#6965db", color: "#fff", fontWeight: 600,
            fontSize: 13, cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {/* Link list */}
      {list.length === 0 ? (
        <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", paddingTop: 20 }}>
          No links yet
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {list.map((url, i) => (
            <div
              key={i}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "#f8f7ff", borderRadius: 7, padding: "7px 10px",
                border: "1px solid #e3e2fe",
              }}
            >
              <span style={{ fontSize: 13 }}>🔗</span>
              <a
                href={url} target="_blank" rel="noreferrer"
                style={{
                  flex: 1, fontSize: 12, color: "#6965db",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  textDecoration: "none",
                }}
                title={url}
              >
                {url}
              </a>
              <button
                onClick={() => removeLink(i)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "#ccc", fontSize: 14, lineHeight: 1, padding: 0, flexShrink: 0,
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
