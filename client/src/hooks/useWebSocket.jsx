import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';

export const useWebSocket = (roomId, onMessage) => {
  const ws = useRef(null);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!roomId || !token || !user) return;

    ws.current = new WebSocket(`${WS_URL}?token=${token}`);

    ws.current.onopen = () => {
      console.log('[WS] Connected to room:', roomId);
      ws.current.send(JSON.stringify({
        type: 'JOIN_ROOM',
        roomId,
        userId: user.id
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type && onMessage) {
          onMessage(data);
        }
      } catch (err) {
        console.error('[WS] Failed to parse message', err);
      }
    };

    ws.current.onclose = () => {
      console.log('[WS] Disconnected from room:', roomId);
    };

    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(JSON.stringify({
          type: 'LEAVE_ROOM',
          roomId,
          userId: user.id
        }));
        ws.current.close();
      }
    };
  }, [roomId, token, user, onMessage]);

  const sendMessage = useCallback((type, payload) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN && roomId && user) {
      ws.current.send(JSON.stringify({
        type,
        roomId,
        userId: user.id,
        payload
      }));
    }
  }, [roomId, user]);

  return { sendMessage };
};
