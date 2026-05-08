import React, { useContext, useEffect, useState } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { CanvasContext } from '../../canvas/SketchCanvas';

// A simple cursor SVG pointing top-left
const CursorSVG = ({ color }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={color} stroke="white" strokeWidth="2" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 2L20 10L13 13L16 21L12 23L9 15L3 18L4 2Z" />
  </svg>
);

// Function to convert hex color to rgba for the background tint
const hexToRgba = (hex, alpha) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function CollabCursors() {
  const remoteCursors = useCanvasStore((state) => state.remoteCursors);
  const fabricCanvasRef = useContext(CanvasContext);
  
  // We need to force a re-render when viewport changes so cursors stick to canvas coords
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!fabricCanvasRef || !fabricCanvasRef.current) return;
    const fc = fabricCanvasRef.current;
    
    const updateViewport = () => setTick(t => t + 1);
    
    fc.on('mouse:wheel', updateViewport);
    fc.on('mouse:move', updateViewport); // Panning changes viewport
    fc.on('after:render', updateViewport);

    // Force re-render periodically to hide idle cursors
    const interval = setInterval(updateViewport, 1000);

    return () => {
      fc.off('mouse:wheel', updateViewport);
      fc.off('mouse:move', updateViewport);
      fc.off('after:render', updateViewport);
      clearInterval(interval);
    };
  }, [fabricCanvasRef]);

  if (!fabricCanvasRef || !fabricCanvasRef.current) return null;
  const fc = fabricCanvasRef.current;
  const vpt = fc.viewportTransform;

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
