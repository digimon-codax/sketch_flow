const SEVERITY_COLOR = { high: "#e03131", medium: "#e67700", low: "#2f9e44" };
const SEVERITY_ICON  = { high: "🔴", medium: "🟡", low: "🟢" };

export default function AssistPanel({ result, onClose }) {
  if (!result) return null;

  const { summary, scalabilityScore, suggestions = [] } = result;

  return (
    <div
      style={{
        position:     "fixed",
        bottom:       0,
        left:         "50%",
        transform:    "translateX(-50%)",
        width:        "min(580px, 100vw)",
        background:   "#fff",
        borderRadius: "16px 16px 0 0",
        boxShadow:    "0 -4px 32px rgba(0,0,0,0.12)",
        zIndex:       1000,
        display:      "flex",
        flexDirection:"column",
        maxHeight:    "60vh",
      }}
    >
      {/* Header */}
      <div style={{
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
        padding:        "16px 20px",
        borderBottom:   "1px solid #f0f0f0",
        flexShrink:     0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 20 }}>🧠</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>
              Architecture Analysis
            </div>
            <div style={{ fontSize: 12, color: "#888", marginTop: 1 }}>
              Scalability Score:{" "}
              <strong style={{ color: "#6965db" }}>{scalabilityScore}/10</strong>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "#888", fontSize: 18, padding: 4, lineHeight: 1,
          }}
        >
          ✕
        </button>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{
          padding:    "12px 20px",
          fontSize:   13,
          color:      "#555",
          background: "#fafafa",
          borderBottom: "1px solid #f0f0f0",
          flexShrink: 0,
        }}>
          {summary}
        </div>
      )}

      {/* Suggestions list */}
      <div style={{
        overflowY: "auto",
        padding:   "12px 20px 20px",
        display:   "flex",
        flexDirection: "column",
        gap:       10,
      }}>
        {suggestions.length === 0 ? (
          <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
            No suggestions — great architecture! 🎉
          </p>
        ) : (
          suggestions.map((s, i) => (
            <div
              key={i}
              style={{
                border:       "1px solid #eee",
                borderRadius: 10,
                padding:      "12px 14px",
                borderLeft:   `3px solid ${SEVERITY_COLOR[s.severity] || "#ccc"}`,
              }}
            >
              <div style={{
                fontWeight: 600, fontSize: 13, color: "#1a1a1a", marginBottom: 4,
                display: "flex", alignItems: "center", gap: 6,
              }}>
                {SEVERITY_ICON[s.severity]} {s.title}
                <span style={{
                  fontSize:   10, fontWeight: 600, textTransform: "uppercase",
                  background: SEVERITY_COLOR[s.severity] + "18",
                  color:      SEVERITY_COLOR[s.severity],
                  padding:    "1px 6px", borderRadius: 4, marginLeft: 4,
                }}>
                  {s.severity}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 6px" }}>
                {s.description}
              </p>
              <p style={{
                fontSize: 12, color: SEVERITY_COLOR[s.severity],
                fontWeight: 500, margin: 0,
              }}>
                → {s.recommendation}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
