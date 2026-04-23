import { useEffect, useRef } from 'react';

export function useWebSocket(url) {
  const wsRef = useRef(null);
  const handlersRef = useRef({});
  const reconnectDelay = useRef(1000);
  const diagramId = useRef(null);
  const userId = useRef(null);
  const userName = useRef(null);

  function connect() {
    if (!url) return;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000;
      // Re-join room if we were in one (reconnection scenario)
      if (diagramId.current) {
        send('JOIN_ROOM', diagramId.current, userId.current, { name: userName.current });
      }
    };

    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        handlersRef.current[msg.type]?.(msg);
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setTimeout(connect, reconnectDelay.current);
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
    };

    ws.onerror = () => ws.close();
  }

  useEffect(() => { 
    connect(); 
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect
        wsRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(type, roomId, uid, payload = {}) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, roomId, userId: uid, payload }));
    }
  }

  function on(type, handler) {
    handlersRef.current[type] = handler;
  }

  function setContext(dId, uId, uName) {
    diagramId.current = dId;
    userId.current = uId;
    userName.current = uName;
  }

  return { send, on, setContext };
}
