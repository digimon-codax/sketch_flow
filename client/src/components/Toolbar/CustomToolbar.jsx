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
        gap:            12,
        padding:        "8px",
        background:     "rgba(255, 255, 255, 0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border:         "1px solid rgba(255, 255, 255, 0.5)",
        borderRadius:   16,
        boxShadow:      "0 8px 32px rgba(105, 101, 219, 0.15)",
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
          gap:            8,
          padding:        "8px 16px",
          borderRadius:   10,
          border:         "1px solid rgba(105, 101, 219, 0.2)",
          background:     cleaning ? "rgba(105, 101, 219, 0.1)" : "rgba(255, 255, 255, 0.6)",
          color:          "#5b57c8",
          fontWeight:     600,
          fontSize:       13,
          cursor:         cleaning ? "wait" : "pointer",
          transition:     "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          whiteSpace:     "nowrap",
          boxShadow:      "0 2px 8px rgba(0,0,0,0.02)",
        }}
        onMouseEnter={(e) => {
          if (!cleaning) {
            e.currentTarget.style.background = "rgba(105, 101, 219, 0.1)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!cleaning) {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
        onMouseDown={(e) => { if (!cleaning) e.currentTarget.style.transform = "translateY(1px)"; }}
        onMouseUp={(e) => { if (!cleaning) e.currentTarget.style.transform = "translateY(-1px)"; }}
      >
        <span style={{ fontSize: 16 }}>{cleaning ? "⏳" : "✨"}</span>
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
          gap:            8,
          padding:        "8px 18px",
          borderRadius:   10,
          border:         "none",
          background:     analyzing ? "#4340b0" : "linear-gradient(135deg, #6965db 0%, #b258e6 100%)",
          color:          "#fff",
          fontWeight:     700,
          fontSize:       13,
          letterSpacing:  "0.3px",
          cursor:         analyzing ? "wait" : "pointer",
          transition:     "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          whiteSpace:     "nowrap",
          boxShadow:      "0 4px 16px rgba(105, 101, 219, 0.4)",
        }}
        onMouseEnter={(e) => {
          if (!analyzing) {
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(105, 101, 219, 0.5)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseLeave={(e) => {
          if (!analyzing) {
            e.currentTarget.style.boxShadow = "0 4px 16px rgba(105, 101, 219, 0.4)";
            e.currentTarget.style.transform = "translateY(0)";
          }
        }}
        onMouseDown={(e) => { if (!analyzing) e.currentTarget.style.transform = "translateY(1px)"; }}
        onMouseUp={(e) => { if (!analyzing) e.currentTarget.style.transform = "translateY(-1px)"; }}
      >
        <span style={{ fontSize: 16 }}>{analyzing ? "⏳" : "🧠"}</span>
        {analyzing ? "Analyzing…" : "Arch Assist"}
      </button>
    </div>
  );
}
