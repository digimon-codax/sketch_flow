import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "../store/authStore";

const WS_URL = import.meta.env.VITE_WS_URL || "";

export function useWebSocket(diagramId, onMessage) {
  const wsRef   = useRef(null);
  const token   = useAuthStore((s) => s.token);
  const onMsgRef = useRef(onMessage);
  onMsgRef.current = onMessage; // always use latest handler without re-connecting

  useEffect(() => {
    if (!diagramId || !token) return;

    // Build WS URL — use Vite proxy path in dev (/ws), full URL in prod
    const base = WS_URL || `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`;
    const url  = `${base}/ws?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "JOIN_ROOM", roomId: diagramId }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        onMsgRef.current?.(msg);
      } catch { /* ignore malformed */ }
    };

    ws.onerror = (e) => console.warn("[WS] error", e);
    ws.onclose = () => console.log("[WS] disconnected");

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "LEAVE_ROOM", roomId: diagramId }));
      }
      ws.close();
    };
  }, [diagramId, token]);

  const send = useCallback((type, payload = {}) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, roomId: diagramId, payload }));
    }
  }, [diagramId]);

  return { send };
}
