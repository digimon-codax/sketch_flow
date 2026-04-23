import { useState } from "react";
import { useCleanup }    from "../Features/MessCleanup/useCleanup";
import { useArchAssist } from "../Features/ArchAssist/useArchAssist";

export default function CustomToolbar({ api: excalidrawAPI, diagramId }) {
  const { runCleanup,  loading: cleaning  } = useCleanup(excalidrawAPI);
  const { runAssist,   loading: analyzing } = useArchAssist(excalidrawAPI);

  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            8,
        padding:        "6px 8px",
        background:     "#fff",
        border:         "1px solid #e3e2fe",
        borderRadius:   12,
        boxShadow:      "0 2px 12px rgba(105,101,219,0.10)",
        userSelect:     "none",
      }}
    >
      {/* ── Feature 1: Mess Cleanup ─────────────────────────────── */}
      <button
        onClick={runCleanup}
        disabled={cleaning}
        title="AI Layout Cleanup — reorganises shapes into a clean hierarchy"
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            6,
          padding:        "6px 14px",
          borderRadius:   8,
          border:         "1px solid #e3e2fe",
          background:     cleaning ? "#f1f0ff" : "#f8f7ff",
          color:          "#6965db",
          fontWeight:     600,
          fontSize:       13,
          cursor:         cleaning ? "wait" : "pointer",
          transition:     "background 0.15s",
          whiteSpace:     "nowrap",
        }}
        onMouseEnter={(e) => { if (!cleaning) e.currentTarget.style.background = "#e8e7ff"; }}
        onMouseLeave={(e) => { if (!cleaning) e.currentTarget.style.background = "#f8f7ff"; }}
      >
        <span style={{ fontSize: 15 }}>{cleaning ? "⏳" : "✨"}</span>
        {cleaning ? "Cleaning…" : "Clean Up"}
      </button>

      {/* ── Feature 2: Architecture Assist ─────────────────────── */}
      <button
        onClick={runAssist}
        disabled={analyzing}
        title="Claude AI Architecture Review — get suggestions for your system design"
        style={{
          display:        "flex",
          alignItems:     "center",
          gap:            6,
          padding:        "6px 14px",
          borderRadius:   8,
          border:         "none",
          background:     analyzing ? "#4340b0" : "#6965db",
          color:          "#fff",
          fontWeight:     700,
          fontSize:       13,
          cursor:         analyzing ? "wait" : "pointer",
          transition:     "background 0.15s",
          whiteSpace:     "nowrap",
          boxShadow:      "0 2px 8px rgba(105,101,219,0.30)",
        }}
        onMouseEnter={(e) => { if (!analyzing) e.currentTarget.style.background = "#4340b0"; }}
        onMouseLeave={(e) => { if (!analyzing) e.currentTarget.style.background = "#6965db"; }}
      >
        <span style={{ fontSize: 15 }}>{analyzing ? "⏳" : "🧠"}</span>
        {analyzing ? "Analyzing…" : "Arch Assist"}
      </button>
    </div>
  );
}
