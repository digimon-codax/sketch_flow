import React, { useEffect, useRef, useState } from 'react';
import { initEngine } from './engine';

export const CanvasContext = React.createContext(null);

export default function SketchCanvas({ setFabricCanvasRef }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fcRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Initialize Fabric
    const rect = containerRef.current.getBoundingClientRect();
    const fc = initEngine(canvasRef.current, rect.width, rect.height);
    fcRef.current = fc;

    // Expose the ref to the parent (which provides the Context)
    if (setFabricCanvasRef) {
      setFabricCanvasRef(fcRef);
    }

    // Handle Resize
    const handleResize = () => {
      if (!containerRef.current || !fcRef.current) return;
      const newRect = containerRef.current.getBoundingClientRect();
      fcRef.current.setWidth(newRect.width);
      fcRef.current.setHeight(newRect.height);
      fcRef.current.requestRenderAll();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (fcRef.current) {
        fcRef.current.dispose();
        fcRef.current = null;
      }
    };
  }, [setFabricCanvasRef]);

  return (
    <div 
      ref={containerRef} 
      style={{
        flex: 1,
        height: '100%',
        overflow: 'hidden',
        background: 'var(--canvas-bg)',
        position: 'relative'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}
