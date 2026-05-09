import React, { useState, useEffect } from "react";
import { useUIStore } from "../../../store/uiStore";
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

export default function ContextDrawer({ diagramId, api: excalidrawAPI, isReadOnly = false }) {
  const selectedElementId = useUIStore((s) => s.selectedElementId);
  const setSelectedElementId = useUIStore((s) => s.setSelectedElementId);
  const drawerOpen = useUIStore((s) => s.drawerOpen);
  const setDrawerOpen = useUIStore((s) => s.setDrawerOpen);

  const [activeTab, setActiveTab] = useState("notes");
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedElementId) { 
      setContext(null); 
      return; 
    }
    setLoading(true);
    api.get(`/context/${diagramId}/${selectedElementId}`)
      .then((r) => setContext(r.data))
      .catch(() => setContext({ notes: '', links: [], codeSnippet: '', language: 'javascript', files: [] }))
      .finally(() => setLoading(false));
  }, [selectedElementId, diagramId]);

  async function patchContext(patch) {
    if (!selectedElementId || isReadOnly) return;
    setContext((prev) => ({ ...prev, ...patch }));
    try {
      await api.patch(`/context/${diagramId}/${selectedElementId}`, patch);
    } catch (err) {
      console.error(err);
    }
  }

  function fetchContext() {
    if (!selectedElementId) return;
    api.get(`/context/${diagramId}/${selectedElementId}`)
      .then((r) => setContext(r.data))
      .catch(console.error);
  }

  if (!selectedElementId || !drawerOpen) return null;

  return (
    <>
      <div
        style={{
          position: "fixed", right: 0, top: 0,
          height: "100vh", width: 320,
          background: "var(--bg-base)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.15)",
          zIndex: 400, display: "flex", flexDirection: "column",
          fontFamily: "inherit",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px", borderBottom: "1px solid var(--border)",
          display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
              Context Layer
              {isReadOnly && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-hint)', fontFamily: 'JetBrains Mono' }}>
                  [read-only]
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-hint)", marginTop: 1, fontFamily: "monospace" }}>
              {selectedElementId.slice(0, 12)}…
            </div>
          </div>
          <button
            onClick={() => {
              if (excalidrawAPI) excalidrawAPI.updateScene({ appState: { selectedElementIds: {} } });
              setSelectedElementId(null);
              setDrawerOpen(false);
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-hint)", fontSize: 16, padding: 4, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "8px 12px", gap: 4, borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, padding: "5px 0", borderRadius: 6, border: "1px solid",
                borderColor: activeTab === tab ? "var(--accent)" : "transparent",
                background:  activeTab === tab ? "var(--accent)" : "transparent",
                color:       activeTab === tab ? "#0d0d0d" : "var(--text-secondary)",
                fontWeight:  activeTab === tab ? 600 : 400,
                fontSize: 12, cursor: "pointer", transition: "all 0.12s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              {TAB_ICONS[tab]} {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
              <div style={{ width: 36, height: 36, border: "3px solid var(--accent)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            </div>
          ) : context ? (
            <>
              {activeTab === "notes" && <NotesTab notes={context.notes} onSave={(n) => patchContext({ notes: n })} isReadOnly={isReadOnly} />}
              {activeTab === "links" && <LinksTab links={context.links} onSave={(l) => patchContext({ links: l })} isReadOnly={isReadOnly} />}
              {activeTab === "code"  && <CodeTab  snippet={context.codeSnippet} language={context.language} onSave={(c, l) => patchContext({ codeSnippet: c, language: l })} isReadOnly={isReadOnly} />}
              {activeTab === "files" && <FilesTab diagramId={diagramId} elementId={selectedElementId} files={context.files} onRefresh={fetchContext} isReadOnly={isReadOnly} />}
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}