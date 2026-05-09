import React, { useEffect, useRef, useState } from 'react';
import { initEngine } from './engine';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import { drawRect, drawEllipse, drawDiamond, drawArrow, drawLine, drawText, startFreehand, endFreehand } from './tools';
import api from '../api';
import { createHistory } from './history';
import { serializeCanvas, deserializeCanvas } from './serialize';

export const CanvasContext = React.createContext(null);

export default function SketchCanvas({ 
  diagramId, 
  initialElements, 
  setSaveState, 
  setHistoryRef, 
  setFabricCanvasRef 
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const fcRef = useRef(null);
  const historyRef = useRef(createHistory());
  const saveTimeoutRef = useRef(null);

  const activeTool = useCanvasStore((state) => state.activeTool);
  const cleanupLoading = useUIStore((state) => state.cleanupLoading);
  const [eraserPos, setEraserPos] = useState({ x: -100, y: -100 });

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
    if (setHistoryRef) {
      setHistoryRef(historyRef.current);
    }

    // Load initial elements if they exist
    if (initialElements && initialElements.length > 0) {
      deserializeCanvas(fc, initialElements);
    }

    const triggerSave = () => {
      if (!diagramId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (setSaveState) setSaveState('saving');
      
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          const elements = serializeCanvas(fc);
          await api.patch(`/diagrams/${diagramId}`, { elements });
          if (setSaveState) {
            setSaveState('saved');
            setTimeout(() => setSaveState(''), 2000);
          }
        } catch (err) {
          console.error('Failed to autosave', err);
        }
      }, 5000);
    };

    const handleSnapshot = () => {
      historyRef.current.snapshot(() => serializeCanvas(fc));
      triggerSave();
    };

    let debounceSnap = null;
    const snapDebounced = () => {
      if (debounceSnap) clearTimeout(debounceSnap);
      debounceSnap = setTimeout(handleSnapshot, 100);
    };

    // Listen to changes
    fc.on('object:added', snapDebounced);
    fc.on('object:modified', snapDebounced);
    fc.on('object:removed', snapDebounced);
    fc.on('path:created', snapDebounced);

    // Initial snapshot
    handleSnapshot();

    fc.on('selection:created', e => {
      if (e.selected && e.selected.length === 1 && e.selected[0].id) {
        useUIStore.getState().setSelectedElementId(e.selected[0].id);
        useUIStore.getState().setDrawerOpen(true);
      }
    });

    fc.on('selection:updated', e => {
      if (e.selected && e.selected.length === 1 && e.selected[0].id) {
        useUIStore.getState().setSelectedElementId(e.selected[0].id);
      } else {
        useUIStore.getState().setSelectedElementId(null);
      }
    });

    fc.on('selection:cleared', () => {
      useUIStore.getState().setDrawerOpen(false);
      useUIStore.getState().setSelectedElementId(null);
    });

    let isDrawing = false;
    let startPos = null;
    let previewShape = null;

    let isPanning = false;
    let lastClientX, lastClientY;

    const cleanupPreview = () => {
      if (previewShape) {
        fc.remove(previewShape);
        previewShape = null;
      }
    };

    fc.on('mouse:down', (opt) => {
      const currentTool = useCanvasStore.getState().activeTool;
      
      if (opt.e.button === 1 || currentTool === 'hand') {
        isPanning = true;
        fc.selection = false;
        lastClientX = opt.e.clientX;
        lastClientY = opt.e.clientY;
        if (currentTool === 'hand') {
          fc.defaultCursor = 'grabbing';
          fc.hoverCursor = 'grabbing';
          fc.requestRenderAll();
        }
        return;
      }
      
      if (currentTool === 'eraser') {
        return; // handle erasing in mouse:move
      }

      if (currentTool === 'select' || currentTool === 'pencil' || currentTool === 'text') {
        if (currentTool === 'text' && !opt.target) {
          const ptr = fc.getPointer(opt.e);
          drawText(fc, ptr.x, ptr.y);
          useCanvasStore.getState().setActiveTool('select');
        }
        return;
      }
      
      // We are starting a shape drawing
      isDrawing = true;
      startPos = fc.getPointer(opt.e);
      fc.selection = false;
    });

    fc.on('mouse:move', (opt) => {
      const currentTool = useCanvasStore.getState().activeTool;

      if (isPanning) {
        const vpt = fc.viewportTransform;
        vpt[4] += opt.e.clientX - lastClientX;
        vpt[5] += opt.e.clientY - lastClientY;
        fc.requestRenderAll();
        lastClientX = opt.e.clientX;
        lastClientY = opt.e.clientY;
        return;
      }

      if (currentTool === 'eraser' && opt.e.buttons === 1) {
        const pointer = fc.getPointer(opt.e);
        const toRemove = fc.getObjects().filter(obj => {
          if (!obj.id || !obj.shapeType) return false;
          const b = obj.getBoundingRect(true, true);
          const cx = b.left + b.width / 2;
          const cy = b.top + b.height / 2;
          return Math.hypot(pointer.x - cx, pointer.y - cy) < 30;
        });
        if (toRemove.length > 0) {
          toRemove.forEach(o => fc.remove(o));
          fc.requestRenderAll();
        }
        return;
      }

      if (!isDrawing || !startPos) return;
      if (['select', 'hand', 'eraser', 'pencil', 'text'].includes(currentTool)) return;

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

      let preview;
      if (currentTool === 'rect') {
        preview = new fabric.Rect({ left: Math.min(startPos.x, currentPos.x), top: Math.min(startPos.y, currentPos.y), width: Math.abs(w), height: Math.abs(h), stroke: strokeColor, fill: 'transparent', selectable: false });
      } else if (currentTool === 'ellipse') {
        preview = new fabric.Ellipse({ left: Math.min(startPos.x, currentPos.x), top: Math.min(startPos.y, currentPos.y), rx: Math.abs(w)/2, ry: Math.abs(h)/2, stroke: strokeColor, fill: 'transparent', selectable: false });
      } else if (currentTool === 'diamond') {
        preview = new fabric.Polygon([ {x: w/2, y: 0}, {x: w, y: h/2}, {x: w/2, y: h}, {x: 0, y: h/2} ], { left: Math.min(startPos.x, currentPos.x), top: Math.min(startPos.y, currentPos.y), stroke: strokeColor, fill: 'transparent', selectable: false });
      } else if (currentTool === 'line' || currentTool === 'arrow') {
        preview = new fabric.Line([startPos.x, startPos.y, currentPos.x, currentPos.y], { stroke: strokeColor, selectable: false });
      }

      if (preview) {
        fc.add(preview);
        previewShape = preview;
        fc.requestRenderAll();
      }
    });

    fc.on('mouse:up', (opt) => {
      const currentTool = useCanvasStore.getState().activeTool;
      
      if (isPanning) {
        isPanning = false;
        fc.setViewportTransform(fc.viewportTransform);
        if (currentTool === 'hand') {
          fc.defaultCursor = 'grab';
          fc.hoverCursor = 'grab';
          fc.requestRenderAll();
        }
        return;
      }
      
      if (currentTool === 'eraser') {
        return;
      }

      if (!isDrawing || !startPos) return;
      isDrawing = false;
      cleanupPreview();

      const endPos = fc.getPointer(opt.e);
      const w = endPos.x - startPos.x;
      const h = endPos.y - startPos.y;

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

      if (currentTool === 'rect') {
        drawRect(fc, Math.min(startPos.x, endPos.x), Math.min(startPos.y, endPos.y), Math.abs(w), Math.abs(h), opts);
      } else if (currentTool === 'ellipse') {
        drawEllipse(fc, startPos.x + w/2, startPos.y + h/2, Math.abs(w)/2, Math.abs(h)/2, opts);
      } else if (currentTool === 'diamond') {
        drawDiamond(fc, Math.min(startPos.x, endPos.x), Math.min(startPos.y, endPos.y), Math.abs(w), Math.abs(h), opts);
      } else if (currentTool === 'line') {
        drawLine(fc, startPos.x, startPos.y, endPos.x, endPos.y, opts);
      } else if (currentTool === 'arrow') {
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
      
      fc.off('object:added', snapDebounced);
      fc.off('object:modified', snapDebounced);
      fc.off('object:removed', snapDebounced);
      fc.off('path:created', snapDebounced);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      if (debounceSnap) clearTimeout(debounceSnap);
      
      if (fcRef.current) {
        fcRef.current.dispose();
        fcRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagramId]);

  // Handle active tool changes (cursor + pencil freehand)
  useEffect(() => {
    const fc = fcRef.current;
    if (!fc) return;

    if (activeTool === 'select') {
      fc.isDrawingMode = false;
      fc.selection = true;
      fc.defaultCursor = 'default';
      fc.hoverCursor = 'move';
      endFreehand(fc);
    } else if (activeTool === 'hand') {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'grab';
      fc.hoverCursor = 'grab';
      endFreehand(fc);
    } else if (activeTool === 'eraser') {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'none';
      fc.hoverCursor = 'none';
      endFreehand(fc);
    } else if (activeTool === 'pencil') {
      fc.isDrawingMode = false; // startFreehand handles its own drawing logic
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
      fc.hoverCursor = 'crosshair';
      const { strokeColor, strokeWidth } = useCanvasStore.getState();
      startFreehand(fc, { stroke: strokeColor, strokeWidth });
    } else if (activeTool === 'text') {
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'text';
      fc.hoverCursor = 'text';
      endFreehand(fc);
    } else {
      // Shapes
      fc.isDrawingMode = false;
      fc.selection = false;
      fc.defaultCursor = 'crosshair';
      fc.hoverCursor = 'crosshair';
      endFreehand(fc);
    }
    
    fc.requestRenderAll();
  }, [activeTool]);

  const handleNativeMouseMove = (e) => {
    if (activeTool === 'eraser') {
      setEraserPos({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div 
      ref={containerRef} 
      onMouseMove={handleNativeMouseMove}
      style={{
        flex: 1,
        height: '100%',
        overflow: 'hidden',
        background: 'var(--canvas-bg)',
        position: 'relative'
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {cleanupLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          background: 'rgba(212,168,83,0.03)',
          pointerEvents: 'none'
        }} />
      )}
      
      {activeTool === 'eraser' && (
        <div style={{
          position: 'fixed',
          pointerEvents: 'none',
          zIndex: 998,
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1.5px solid rgba(240,237,232,0.6)',
          background: 'rgba(240,237,232,0.05)',
          transform: `translate(${eraserPos.x - 16}px, ${eraserPos.y - 16}px)`,
          left: 0,
          top: 0
        }} />
      )}
    </div>
  );
}
