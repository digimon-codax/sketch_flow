import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Excalidraw } from "@excalidraw/excalidraw";

import { useCollaboration }  from "../../hooks/useCollaboration";
import { useCanvasStore }    from "../../store/canvasStore";
import { useAuthStore }      from "../../store/authStore";
import api                   from "../../api/index";
import CollabCursors         from "./CollabCursors";
import CustomToolbar         from "../Toolbar/CustomToolbar";
import ContextDrawer         from "../Features/ContextLayer/ContextDrawer";
import AssistPanel           from "../Features/ArchAssist/AssistPanel";
import { useUiStore }        from "../../store/uiStore";

const AUTOSAVE_DELAY = 5000; // 5 seconds

export default function SketchCanvas() {
  const { id: diagramId }        = useParams();
  const [excalidrawAPI, setAPI]  = useState(null);
  const autosaveTimer            = useRef(null);
  const { user }                 = useAuthStore();
  const setSelectedElementId     = useCanvasStore((s) => s.setSelectedElementId);
  const setElements              = useCanvasStore((s) => s.setElements);
  const { assistResult, clearAssistResult } = useUiStore();

  // Collaboration
  const { remoteCursors, collaborators, syncElements, sendCursor } =
    useCollaboration(diagramId, excalidrawAPI);

  // ── onChange: sync + autosave ─────────────────────────────────
  const handleChange = useCallback((elements, appState) => {
    // Sync to collaborators via WebSocket
    syncElements(elements);

    // Track elements in store for feature hooks
    setElements(elements);

    // Detect single selected element → open Context Drawer
    const selectedIds = Object.keys(appState.selectedElementIds ?? {});
    setSelectedElementId(selectedIds.length === 1 ? selectedIds[0] : null);

    // Debounced autosave to MongoDB
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      try {
        await api.patch(`/diagrams/${diagramId}`, {
          excalidrawState: {
            elements,
            appState: {
              // Only save a safe subset of appState
              viewBackgroundColor:  appState.viewBackgroundColor,
              currentItemStrokeColor: appState.currentItemStrokeColor,
              currentItemBackgroundColor: appState.currentItemBackgroundColor,
              zoom: appState.zoom,
              scrollX: appState.scrollX,
              scrollY: appState.scrollY,
            },
            files: excalidrawAPI?.getFiles?.() ?? {},
          },
        });
      } catch (err) {
        console.warn("[Autosave] failed:", err.message);
      }
    }, AUTOSAVE_DELAY);
  }, [diagramId, excalidrawAPI, syncElements, setElements, setSelectedElementId]);

  // ── Cursor tracking ───────────────────────────────────────────
  const handlePointerUpdate = useCallback(({ pointer }) => {
    if (pointer) sendCursor({ x: pointer.x, y: pointer.y });
  }, [sendCursor]);

  // Force aggressive CSS overrides after mount to beat Excalidraw's dynamic styles
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .sketchflow-theme {
        --color-primary: #6965db !important;
        --color-primary-darker: #5b57c8 !important;
        --color-primary-darkest: #4340b0 !important;
        --color-primary-light: #e3e2fe !important;
      }
      .sketchflow-theme * {
        --color-primary: #6965db !important;
      }
      /* Aggressively hide the Library button, Social links, and Help */
      .sketchflow-theme [class*="library-button" i],
      .sketchflow-theme [class*="LibraryButton" i],
      .sketchflow-theme button[title*="Library" i],
      .sketchflow-theme button[aria-label*="Library" i],
      .sketchflow-theme a[href*="discord"],
      .sketchflow-theme a[href*="github"],
      .sketchflow-theme a[href*="twitter"],
      .sketchflow-theme [class*="HelpDialog"] {
        display: none !important;
      }
      /* Glassmorphism for toolbars using wildcard selectors */
      .sketchflow-theme [class*="App-menu"],
      .sketchflow-theme [class*="App-toolbar"] {
        border-radius: 16px !important;
        background: rgba(255, 255, 255, 0.85) !important;
        backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(105, 101, 219, 0.2) !important;
        box-shadow: 0 8px 32px rgba(105, 101, 219, 0.12) !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
      clearTimeout(autosaveTimer.current);
    };
  }, []);

  return (
    <div className="sketchflow-theme" style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Excalidraw
        excalidrawAPI={(api) => setAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        isCollaborating={collaborators.length > 1}
        // Pass collaborators in the format Excalidraw expects
        initialData={{ collaborators: [] }}
        renderTopRightUI={() => (
          <CustomToolbar api={excalidrawAPI} diagramId={diagramId} />
        )}
        // User identity
        renderCustomStats={() => null}
        UIOptions={{
          canvasActions: {
            export:     { saveFileToDisk: true },
            loadScene:  true,
            clearCanvas: true,
          },
        }}
      />

      {/* Remote cursors overlay */}
      <CollabCursors cursors={remoteCursors} />

      {/* Context Layer drawer (slides in when element selected) */}
      <ContextDrawer diagramId={diagramId} api={excalidrawAPI} />

      {/* Arch Assist result panel (slides up from bottom) */}
      {assistResult && (
        <AssistPanel result={assistResult} onClose={clearAssistResult} />
      )}
    </div>
  );
}
