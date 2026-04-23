import { useState, useEffect } from "react";
import { useCanvasStore } from "../../../store/canvasStore";
import api from "../../../api/index";
import NotesTab from "./NotesTab";
import LinksTab from "./LinksTab";
import CodeTab  from "./CodeTab";
import FilesTab from "./FilesTab";

const TABS = ["notes", "links", "code", "files"];

const TAB_ICONS = {
  notes: "📝",
  links: "🔗",
  code:  "💻",
  files: "📎",
};

export default function ContextDrawer({ diagramId, api: excalidrawAPI }) {
  const selectedElementId = useCanvasStore((s) => s.selectedElementId);
  const setSelectedElementId = useCanvasStore((s) => s.setSelectedElementId);
  const [activeTab, setActiveTab] = useState("notes");
  const [context,   setContext]   = useState(null);
  const [loading,   setLoading]   = useState(false);

  // Fetch context whenever a new element is selected
  useEffect(() => {
    if (!selectedElementId) { setContext(null); return; }
    setLoading(true);
    api
      .get(`/context/${diagramId}/${selectedElementId}`)
      .then((r) => setContext(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedElementId, diagramId]);

  function save(patch) {
    if (!selectedElementId) return;
    setContext((prev) => ({ ...prev, ...patch }));
    api
      .patch(`/context/${diagramId}/${selectedElementId}`, patch)
      .catch(console.error);
  }

  function refreshFiles() {
    if (!selectedElementId) return;
    api
      .get(`/context/${diagramId}/${selectedElementId}`)
      .then((r) => setContext(r.data))
      .catch(console.error);
  }

  if (!selectedElementId) return null;

  return (
    <>
      {/* Drawer */}
      <div
        style={{
          position:     "fixed",
          right:        0, top: 0,
          height:       "100vh",
          width:        320,
          background:   "#fff",
          boxShadow:    "-4px 0 24px rgba(0,0,0,0.08)",
          zIndex:       900,
          display:      "flex",
          flexDirection:"column",
          fontFamily:   "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()} // don't close on inner clicks
      >
        {/* Header */}
        <div style={{
          padding:      "14px 16px",
          borderBottom: "1px solid #f0f0f0",
          display:      "flex",
          justifyContent:"space-between",
          alignItems:   "center",
          flexShrink:   0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a1a1a" }}>
              Context Layer
            </div>
            <div style={{ fontSize: 11, color: "#aaa", marginTop: 1, fontFamily: "monospace" }}>
              {selectedElementId.slice(0, 12)}…
            </div>
          </div>
          <button
            onClick={() => {
              if (excalidrawAPI) {
                excalidrawAPI.updateScene({ appState: { selectedElementIds: {} } });
              }
              setSelectedElementId(null);
            }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#999", fontSize: 16, padding: 4, lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* Tab bar */}
        <div style={{
          display:      "flex",
          padding:      "8px 12px",
          gap:          4,
          borderBottom: "1px solid #f0f0f0",
          flexShrink:   0,
        }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex:         1,
                padding:      "5px 0",
                borderRadius: 6,
                border:       "1px solid",
                borderColor:  activeTab === tab ? "#6965db" : "#e8e8e8",
                background:   activeTab === tab ? "#6965db" : "transparent",
                color:        activeTab === tab ? "#fff" : "#666",
                fontWeight:   activeTab === tab ? 600 : 400,
                fontSize:     12,
                cursor:       "pointer",
                transition:   "all 0.12s",
                display:      "flex",
                alignItems:   "center",
                justifyContent:"center",
                gap:          4,
              }}
            >
              {TAB_ICONS[tab]} {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {loading ? (
            <div style={{ display:"flex", justifyContent:"center", padding:"40px 0" }}>
              <div style={{
                width:36, height:36,
                border:"3px solid #6965db",
                borderTopColor:"transparent",
                borderRadius:"50%",
                animation:"spin 0.8s linear infinite",
              }}/>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : context ? (
            <>
              {activeTab === "notes" && (
                <NotesTab
                  notes={context.notes}
                  onSave={(notes) => save({ notes })}
                />
              )}
              {activeTab === "links" && (
                <LinksTab
                  links={context.links}
                  onSave={(links) => save({ links })}
                />
              )}
              {activeTab === "code" && (
                <CodeTab
                  snippet={context.codeSnippet}
                  language={context.language}
                  onSave={(codeSnippet, language) => save({ codeSnippet, language })}
                />
              )}
              {activeTab === "files" && (
                <FilesTab
                  diagramId={diagramId}
                  elementId={selectedElementId}
                  files={context.files}
                  onRefresh={refreshFiles}
                />
              )}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
