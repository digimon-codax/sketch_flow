import React, { useEffect, useRef, useState } from 'react';
import { initEngine } from './engine';
import { useCanvasStore } from '../store/canvasStore';
import { drawRect, drawEllipse, drawDiamond, drawArrow, drawLine, drawText, startFreehand, endFreehand } from './tools';

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

    let isDrawing = false;
    let startPos = null;
    let previewShape = null;

    const cleanupPreview = () => {
      if (previewShape) {
        fc.remove(previewShape);
        previewShape = null;
      }
    };

    fc.on('mouse:down', (opt) => {
      const activeTool = useCanvasStore.getState().activeTool;
      if (activeTool === 'select' || activeTool === 'hand' || activeTool === 'pencil' || activeTool === 'text') {
        if (activeTool === 'text' && !opt.target) {
          const ptr = fc.getPointer(opt.e);
          drawText(fc, ptr.x, ptr.y);
          useCanvasStore.getState().setActiveTool('select');
        }
        return;
      }
      if (opt.e.button === 1) return; // Middle mouse is handled by panning
      
      // We are starting a shape drawing
      isDrawing = true;
      startPos = fc.getPointer(opt.e);
      fc.selection = false;
    });

    fc.on('mouse:move', (opt) => {
      if (!isDrawing || !startPos) return;
      const activeTool = useCanvasStore.getState().activeTool;
      if (['select', 'hand', 'pencil', 'text'].includes(activeTool)) return;

      const currentPos = fc.getPointer(opt.e);
      const w = currentPos.x - startPos.x;
      const h = currentPos.y - startPos.y;

      cleanupPreview();

      const { strokeColor, strokeWidth, fillColor } = useCanvasStore.getState();
      const opts = { 
        stroke: strokeColor, 
        strokeWidth, 
        roughness: 1.2 
      };
      if (fillColor && fillColor !== 'transparent') {
        opts.fill = fillColor;
      }

      // Generate preview without adding it properly to active object/etc
      // We will draw it directly. For tools, we need to handle negative width/height logic carefully.
      // But for preview, we can just use the tools functions, and immediately remove them.
      // A better way is to pass a preview flag, but since our tools add and set active,
      // we need a slightly modified approach for preview, or we just rely on quick add/remove.
      // Let's rely on quick add/remove but turn off setActiveObject for preview.
      // Wait, our tools functions call setActiveObject. We should intercept or just remove it.
      
      // Simple preview logic: Use standard fabric shapes for preview to avoid roughjs overhead on every frame, 
      // or just draw roughjs. Roughjs might be fast enough.
      // To prevent tools from messing up selection, we'll draw native fabric shapes for preview.
      let preview;
      if (activeTool === 'rect') {
        preview = new fabric.Rect({ left: Math.min(startPos.x, currentPos.x), top: Math.min(startPos.y, currentPos.y), width: Math.abs(w), height: Math.abs(h), stroke: strokeColor, fill: 'transparent', selectable: false });
      } else if (activeTool === 'ellipse') {
        preview = new fabric.Ellipse({ left: Math.min(startPos.x, currentPos.x), top: Math.min(startPos.y, currentPos.y), rx: Math.abs(w)/2, ry: Math.abs(h)/2, stroke: strokeColor, fill: 'transparent', selectable: false });
      } else if (activeTool === 'diamond') {
        preview = new fabric.Polygon([ {x: w/2, y: 0}, {x: w, y: h/2}, {x: w/2, y: h}, {x: 0, y: h/2} ], { left: Math.min(startPos.x, currentPos.x), top: Math.min(startPos.y, currentPos.y), stroke: strokeColor, fill: 'transparent', selectable: false });
      } else if (activeTool === 'line' || activeTool === 'arrow') {
        preview = new fabric.Line([startPos.x, startPos.y, currentPos.x, currentPos.y], { stroke: strokeColor, selectable: false });
      }

      if (preview) {
        fc.add(preview);
        previewShape = preview;
        fc.requestRenderAll();
      }
    });

    fc.on('mouse:up', (opt) => {
      if (!isDrawing || !startPos) return;
      isDrawing = false;
      cleanupPreview();

      const endPos = fc.getPointer(opt.e);
      const w = endPos.x - startPos.x;
      const h = endPos.y - startPos.y;

      const activeTool = useCanvasStore.getState().activeTool;
      const { strokeColor, strokeWidth, fillColor } = useCanvasStore.getState();
      const opts = { stroke: strokeColor, strokeWidth };
      if (fillColor && fillColor !== 'transparent') {
        opts.fill = fillColor;
      }

      // If moved distance is very small, treat as a click (abort drawing)
      if (Math.abs(w) < 5 && Math.abs(h) < 5) {
        fc.selection = true;
        return;
      }

      if (activeTool === 'rect') {
        drawRect(fc, Math.min(startPos.x, endPos.x), Math.min(startPos.y, endPos.y), Math.abs(w), Math.abs(h), opts);
      } else if (activeTool === 'ellipse') {
        drawEllipse(fc, startPos.x + w/2, startPos.y + h/2, Math.abs(w)/2, Math.abs(h)/2, opts);
      } else if (activeTool === 'diamond') {
        drawDiamond(fc, Math.min(startPos.x, endPos.x), Math.min(startPos.y, endPos.y), Math.abs(w), Math.abs(h), opts);
      } else if (activeTool === 'line') {
        drawLine(fc, startPos.x, startPos.y, endPos.x, endPos.y, opts);
      } else if (activeTool === 'arrow') {
        drawArrow(fc, startPos.x, startPos.y, endPos.x, endPos.y, opts);
      }

      fc.selection = true;
      useCanvasStore.getState().setActiveTool('select');
    });

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

  // Subscribe to tool changes to handle pencil mode
  useEffect(() => {
    if (!fcRef.current) return;
    const unsub = useCanvasStore.subscribe(
      (state) => state.activeTool,
      (activeTool) => {
        if (activeTool === 'pencil') {
          const { strokeColor, strokeWidth } = useCanvasStore.getState();
          startFreehand(fcRef.current, { stroke: strokeColor, strokeWidth });
        } else {
          endFreehand(fcRef.current);
        }
      }
    );
    return () => unsub();
  }, []);

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
