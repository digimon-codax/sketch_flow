import { useState, useCallback, useRef } from "react";
import { useWebSocket } from "./useWebSocket";
import { useCanvasStore } from "../store/canvasStore";
import { useAuthStore } from "../store/authStore";

export function useCollaboration(diagramId, excalidrawAPI) {
  const [remoteCursors, setRemoteCursors] = useState({}); // { userId: { x, y, color, name } }
  const setCollaborators = useCanvasStore((s) => s.setCollaborators);
  const { user }         = useAuthStore();
  const suppressRef      = useRef(false); // prevent echo loop

  // ── Handle incoming WS messages ───────────────────────────────
  const handleMessage = useCallback((msg) => {
    switch (msg.type) {
      // Server sends full scene state when you first join
      case "ROOM_STATE": {
        if (!excalidrawAPI) break;
        const state = msg.payload;
        if (state?.elements?.length > 0) {
          suppressRef.current = true;
          excalidrawAPI.updateScene({
            elements: state.elements,
            appState: { ...(state.appState || {}) },
          });
          setTimeout(() => { suppressRef.current = false; }, 100);
        }
        break;
      }

      // Another user moved shapes
      case "ELEMENTS_UPDATE": {
        if (!excalidrawAPI || !msg.payload?.elements) break;
        suppressRef.current = true;
        excalidrawAPI.updateScene({ elements: msg.payload.elements });
        setTimeout(() => { suppressRef.current = false; }, 100);
        break;
      }

      // Cursor movement from a remote user
      case "CURSOR_MOVE": {
        const { userId, x, y, color, name } = msg;
        if (!userId || userId === user?.id) break;
        setRemoteCursors((prev) => ({ ...prev, [userId]: { x, y, color, name } }));
        break;
      }

      // Updated list of who is in the room
      case "USER_LIST": {
        const users = (msg.payload || []).map((u) => ({
          id:         u.userId,
          color:      u.color,
          username:   u.name,
          // Excalidraw CollabAPI expects these fields
          avatarUrl:  null,
          userState:  "active",
        }));
        setCollaborators(users);
        break;
      }

      default:
        break;
    }
  }, [excalidrawAPI, user?.id, setCollaborators]);

  const { send } = useWebSocket(diagramId, handleMessage);

  // ── Called by SketchCanvas on every onChange ─────────────────
  const syncElements = useCallback((elements) => {
    if (suppressRef.current) return; // don't echo remote updates
    send("ELEMENTS_UPDATE", { elements });
  }, [send]);

  // ── Called by SketchCanvas onPointerUpdate ───────────────────
  const sendCursor = useCallback(({ x, y }) => {
    send("CURSOR_MOVE", { x, y });
  }, [send]);

  // Convert Zustand collaborators to Excalidraw's expected format
  const collaborators = useCanvasStore((s) => s.collaborators);

  return { remoteCursors, collaborators, syncElements, sendCursor };
}
