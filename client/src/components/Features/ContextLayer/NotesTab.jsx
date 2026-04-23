import { useState, useEffect, useRef } from "react";

export default function NotesTab({ notes, onSave }) {
  const [value, setValue] = useState(notes ?? "");
  const timerRef          = useRef(null);

  // Sync if external notes change (e.g. switching elements)
  useEffect(() => { setValue(notes ?? ""); }, [notes]);

  function handleChange(e) {
    setValue(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSave(e.target.value), 800);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#999", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Notes
      </label>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Add notes about this element…"
        style={{
          flex:        1,
          minHeight:   220,
          border:      "1px solid #e8e8e8",
          borderRadius: 8,
          padding:     "10px 12px",
          fontSize:    13,
          lineHeight:  1.6,
          color:       "#333",
          resize:      "vertical",
          outline:     "none",
          fontFamily:  "inherit",
          transition:  "border-color 0.15s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "#6965db")}
        onBlur={(e)  => (e.target.style.borderColor = "#e8e8e8")}
      />
      <p style={{ fontSize: 11, color: "#bbb", marginTop: 6, textAlign: "right" }}>
        Auto-saved after 0.8s
      </p>
    </div>
  );
}
