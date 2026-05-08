import { useEffect, useRef } from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { serializeCanvas, deserializeCanvas } from '../canvas/serialize';

export function useCollaboration(fabricCanvasRef, diagramId, ws) {
  const isUpdatingRef = useRef(false);

  useEffect(() => {
    if (!diagramId || !ws || !fabricCanvasRef.current) return;

    const userStr = localStorage.getItem('sf_user');
    const user = userStr ? JSON.parse(userStr) : { _id: crypto.randomUUID(), name: 'Anonymous' };
    const userId = user._id || user.id;
    const userName = user.name || 'Anonymous';

    ws.setContext(diagramId, userId, userName);
    ws.send('JOIN_ROOM', diagramId, userId, { name: userName });

    ws.on('ROOM_STATE', msg => {
      if (msg.payload?.elements?.length > 0 && fabricCanvasRef.current) {
        isUpdatingRef.current = true;
        deserializeCanvas(fabricCanvasRef.current, msg.payload.elements);
        isUpdatingRef.current = false;
      }
    });

    ws.on('ELEMENTS_UPDATE', msg => {
      if (msg.userId === userId || !fabricCanvasRef.current) return; // skip our own echo
      isUpdatingRef.current = true;
      deserializeCanvas(fabricCanvasRef.current, msg.payload.elements);
      isUpdatingRef.current = false;
    });

    ws.on('CURSOR_MOVE', msg => {
      if (msg.userId === userId) return;
      useCanvasStore.getState().setRemoteCursor(msg.userId, {
        x: msg.payload.x,
        y: msg.payload.y,
        color: msg.payload.color,
        name: msg.payload.name,
        lastSeen: Date.now()
      });
    });

    ws.on('USER_LIST', msg => {
      const users = msg.payload || [];
      const store = useCanvasStore.getState();
      store.setRoomUsers(users);
      
      // Clean up cursors for users who have left
      const activeIds = users.map(u => u.userId);
      Object.keys(store.remoteCursors).forEach(uid => {
        if (!activeIds.includes(uid)) {
          store.removeRemoteCursor(uid);
        }
      });
    });

    const fc = fabricCanvasRef.current;
    
    let debounceTimer;
    const handleElementsChange = () => {
      if (isUpdatingRef.current) return; // Don't broadcast changes triggered by incoming network sync
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (!fc) return;
        const elements = serializeCanvas(fc);
        ws.send('ELEMENTS_UPDATE', diagramId, userId, { elements });
      }, 200);
    };

    fc.on('object:added', handleElementsChange);
    fc.on('object:modified', handleElementsChange);
    fc.on('object:removed', handleElementsChange);
    fc.on('path:created', handleElementsChange);

    let throttleTimer = 0;
    const handleMouseMove = (e) => {
      const now = Date.now();
      if (now - throttleTimer < 33) return; // ~30fps
      throttleTimer = now;
      
      if (!fc) return;
      const pointer = fc.getPointer(e.e);
      const store = useCanvasStore.getState();
      const me = store.roomUsers.find(u => u.userId === userId);
      const color = me ? me.color : '#3498db';

      ws.send('CURSOR_MOVE', diagramId, userId, { 
        x: pointer.x, 
        y: pointer.y, 
        name: userName,
        color 
      });
    };

    fc.on('mouse:move', handleMouseMove);

    return () => {
      ws.send('LEAVE_ROOM', diagramId, userId, {});
      fc.off('object:added', handleElementsChange);
      fc.off('object:modified', handleElementsChange);
      fc.off('object:removed', handleElementsChange);
      fc.off('path:created', handleElementsChange);
      fc.off('mouse:move', handleMouseMove);
      clearTimeout(debounceTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId, ws, fabricCanvasRef.current]);
}
