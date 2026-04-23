import { useCleanup }    from "../Features/MessCleanup/useCleanup";
import { useArchAssist } from "../Features/ArchAssist/useArchAssist";

export default function CustomToolbar({ api: excalidrawAPI, diagramId }) {
  const { runCleanup,  loading: cleaning  } = useCleanup(excalidrawAPI);
  const { runAssist,   loading: analyzing } = useArchAssist(excalidrawAPI);

  return (
    <div className="sketchflow-custom-toolbar">
      {/* ── Feature 2: Architecture Assist ─────────────────────── */}
      <button
        onClick={runAssist}
        disabled={analyzing}
        className="sketchflow-action-btn sketchflow-action-btn--primary"
        title="Claude AI Architecture Review — get suggestions for your system design"
      >
        <span className="sketchflow-action-btn__icon">{analyzing ? "⏳" : "🧠"}</span>
        {analyzing ? "Analyzing…" : "Arch Assist"}
      </button>

      {/* ── Feature 1: Mess Cleanup ─────────────────────────────── */}
      <button
        onClick={runCleanup}
        disabled={cleaning}
        className="sketchflow-action-btn sketchflow-action-btn--ghost"
        title="AI Layout Cleanup — reorganises shapes into a clean hierarchy"
      >
        <span className="sketchflow-action-btn__icon">{cleaning ? "⏳" : "✨"}</span>
        {cleaning ? "Cleaning…" : "Clean Up"}
      </button>
    </div>
  );
}
