import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../store/authStore';

const THROTTLE_MS = 33; // ~30fps

export const useCollaboration = (diagramId, canvas) => {
  const { user } = useAuthStore();
  const [cursors, setCursors] = useState({});
  const lastMoveTime = useRef(0);

  const handleSocketMessage = useCallback((data) => {
    switch (data.type) {
      case 'CURSOR_MOVE':
        if (data.userId === user?.id) return;
        setCursors((prev) => ({
          ...prev,
          [data.userId]: { x: data.payload.x, y: data.payload.y, name: data.payload.name }
        }));
        break;
      case 'LEAVE_ROOM':
        setCursors((prev) => {
          const next = { ...prev };
          delete next[data.userId];
          return next;
        });
        break;
      default:
        break;
    }
  }, [user]);

  const { sendMessage } = useWebSocket(diagramId, handleSocketMessage);

  useEffect(() => {
    if (!canvas || !user) return;

    const onMouseMove = (e) => {
      const now = Date.now();
      if (now - lastMoveTime.current > THROTTLE_MS) {
        lastMoveTime.current = now;
        
        // e.e is the native mouse event
        const pointer = canvas.getPointer(e.e);
        
        sendMessage('CURSOR_MOVE', {
          x: pointer.x,
          y: pointer.y,
          name: user.name
        });
      }
    };

    canvas.on('mouse:move', onMouseMove);

    return () => {
      canvas.off('mouse:move', onMouseMove);
    };
  }, [canvas, user, sendMessage]);

  return { cursors };
};
