import React, { useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { CanvasContext } from '../../canvas/SketchCanvas';

export default function CollabCursors() {
  const remoteCursors = useCanvasStore(state => state.remoteCursors);
  const removeRemoteCursor = useCanvasStore(state => state.removeRemoteCursor);
  const fabricCanvasRef = React.useContext(CanvasContext);
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let hasChanges = false;
      Object.entries(remoteCursors).forEach(([uid, cursor]) => {
        if (now - cursor.lastSeen > 5000) {
          removeRemoteCursor(uid);
          hasChanges = true;
        }
      });
      if (hasChanges) {
        setTick(t => t + 1); // trigger re-render if cursors were removed
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [remoteCursors, removeRemoteCursor]);

  if (!fabricCanvasRef?.current) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 999,
      overflow: 'hidden'
    }}>
      {Object.entries(remoteCursors).map(([uid, cursor]) => {
        const vpt = fabricCanvasRef.current.viewportTransform;
        let screenX = cursor.x;
        let screenY = cursor.y;
        
        if (vpt) {
            screenX = cursor.x * vpt[0] + vpt[4];
            screenY = cursor.y * vpt[3] + vpt[5];
        }

        return (
          <div key={uid} style={{
            position: 'absolute',
            transform: `translate(${screenX}px, ${screenY}px)`,
            transition: 'transform 0.06s linear'
          }}>
            <svg width="16" height="20" viewBox="0 0 16 20">
              <path d="M 0 0 L 0 14 L 4 11 L 7 17 L 9 16 L 6 10 L 10 10 Z"
                fill={cursor.color} stroke="white" strokeWidth="1"/>
            </svg>
            <div style={{
              fontFamily: 'JetBrains Mono',
              fontSize: '10px',
              color: cursor.color,
              background: cursor.color + '22',
              border: `1px solid ${cursor.color}44`,
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '2px',
              whiteSpace: 'nowrap'
            }}>
              {cursor.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}

  if (!vpt) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 999,
      overflow: 'hidden'
    }}>
      {Object.entries(remoteCursors).map(([userId, cursor]) => {
        // Hide cursors that haven't moved in 5 seconds
        if (Date.now() - (cursor.lastUpdate || 0) > 5000) return null;

        // Convert canvas coordinates to screen coordinates
        const screenX = cursor.x * vpt[0] + vpt[4];
        const screenY = cursor.y * vpt[3] + vpt[5];

        const color = cursor.color || '#3498db';
        const bgColor = hexToRgba(color, 0.15);

        return (
          <div
            key={userId}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: `translate(${screenX}px, ${screenY}px)`,
              transition: 'transform 0.05s linear',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start'
            }}
          >
            <CursorSVG color={color} />
            <div style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10px',
              fontWeight: 600,
              color: color,
              background: bgColor,
              padding: '2px 6px',
              borderRadius: '4px',
              marginTop: '2px',
              whiteSpace: 'nowrap'
            }}>
              {cursor.name || 'Anonymous'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
