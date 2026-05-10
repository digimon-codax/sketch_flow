import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useArtStore } from './artStore';

const ArtCanvas = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  const compositeRef = useRef(null);
  const activeRef = useRef(null);

  // Drawing State Refs (avoid re-renders)
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const currentPath = useRef([]);
  const strokeSnapshot = useRef(null);

  // ─── INIT & RESIZE ─────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const compCanvas = compositeRef.current;
    const actCanvas = activeRef.current;
    
    if (!container || !compCanvas || !actCanvas) return;

    let resizeTimer;

    const resizeCanvases = (entries) => {
      const rect = container.getBoundingClientRect();
      // Use Math.floor to prevent floating point mismatch with canvas width/height properties
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);

      // Don't resize if layout hasn't settled
      if (newWidth <= 0 || newHeight <= 0) return;
      if (compCanvas.width === newWidth && compCanvas.height === newHeight) return;

      // CRITICAL: Capture the image data URL BEFORE resizing
      // We use a synchronous snapshot so we don't race with the canvas being cleared
      const dataURL = (compCanvas.width > 0 && compCanvas.height > 0)
        ? compCanvas.toDataURL()
        : null;

      // Resize canvases (this wipes both of them)
      compCanvas.width = newWidth;
      compCanvas.height = newHeight;
      actCanvas.width = newWidth;
      actCanvas.height = newHeight;

      const ctx = compCanvas.getContext('2d');
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Restore saved drawing — MUST set onload BEFORE src so it fires on data URLs
      if (dataURL) {
        const savedImage = new Image();
        savedImage.onload = () => {
          ctx.drawImage(savedImage, 0, 0);
        };
        savedImage.src = dataURL;  // triggers onload (sync or async depending on browser)
      }
    };

    // Use ResizeObserver to catch layout shifts
    const observer = new ResizeObserver((entries) => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => resizeCanvases(entries), 50);
    });
    
    observer.observe(container);

    return () => {
      observer.disconnect();
      clearTimeout(resizeTimer);
    };
  }, []);

  // ─── POINTER EVENTS ────────────────────────────────────────────────────────
  useEffect(() => {
    const actCanvas = activeRef.current;
    if (!actCanvas) return;

    const onPointerDown = (e) => {
      // Capture the pointer so strokes don't break if moving fast outside canvas
      try {
        actCanvas.setPointerCapture(e.pointerId);
      } catch (err) {}
      
      // Pressure is 0-1 for pens, default to 0.5 for mouse
      const pressure = e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5);
      const x = e.offsetX;
      const y = e.offsetY;
      
      isDrawing.current = true;
      currentPath.current = [{ x, y, pressure }];
      lastPoint.current = { x, y, pressure };
      
      // Save snapshot of composite for undo history
      if (compositeRef.current) {
        strokeSnapshot.current = compositeRef.current.toDataURL();
      }

      drawWithSymmetry(x, y, x, y, pressure);
    };

    const onPointerMove = (e) => {
      if (!isDrawing.current) return;
      
      const pressure = e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5);
      const x = e.offsetX;
      const y = e.offsetY;
      
      currentPath.current.push({ x, y, pressure });
      
      const last = lastPoint.current;
      drawWithSymmetry(last.x, last.y, x, y, pressure);
      
      lastPoint.current = { x, y, pressure };
    };

    const onPointerUp = (e) => {
      if (!isDrawing.current) return;
      isDrawing.current = false;
      
      const state = useArtStore.getState();
      
      // Erase and smudge draw directly to composite, so we only merge other brushes
      if (state.brushType !== 'eraser' && state.brushType !== 'smudge') {
        const compositeCtx = compositeRef.current.getContext('2d');
        compositeCtx.drawImage(activeRef.current, 0, 0);
      }
      
      // Clear active canvas
      const ctx = activeRef.current.getContext('2d');
      ctx.clearRect(0, 0, activeRef.current.width, activeRef.current.height);
      
      // Push history
      if (strokeSnapshot.current) {
        state.pushStroke(compositeRef.current.toDataURL());
      }
      
      lastPoint.current = null;
      currentPath.current = [];
    };

    actCanvas.addEventListener('pointerdown', onPointerDown);
    actCanvas.addEventListener('pointermove', onPointerMove);
    actCanvas.addEventListener('pointerup', onPointerUp);
    actCanvas.addEventListener('pointercancel', onPointerUp);
    // NOTE: Do NOT add pointerleave — with setPointerCapture active it fires on
    // mouse-up in some browsers and prematurely commits+clears the active canvas.

    return () => {
      actCanvas.removeEventListener('pointerdown', onPointerDown);
      actCanvas.removeEventListener('pointermove', onPointerMove);
      actCanvas.removeEventListener('pointerup', onPointerUp);
      actCanvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  // ─── SYMMETRY LOGIC ────────────────────────────────────────────────────────
  const drawWithSymmetry = (fromX, fromY, toX, toY, pressure) => {
    const state = useArtStore.getState();
    const mode = state.symmetryMode;
    const lines = state.symmetryLines;
    
    const w = activeRef.current.width;
    const h = activeRef.current.height;
    const cx = w / 2;
    const cy = h / 2;

    const executeDraw = (fx, fy, tx, ty) => {
      drawStroke(fx, fy, tx, ty, pressure, state);
    };

    // Primary stroke
    executeDraw(fromX, fromY, toX, toY);

    if (mode === 'horizontal' || mode === 'both') {
      executeDraw(w - fromX, fromY, w - toX, toY);
    }
    if (mode === 'vertical' || mode === 'both') {
      executeDraw(fromX, h - fromY, toX, h - toY);
    }
    if (mode === 'both') {
      executeDraw(w - fromX, h - fromY, w - toX, h - toY);
    }
    if (mode === 'radial' && lines > 1) {
      for (let i = 1; i < lines; i++) {
        const angle = (2 * Math.PI * i) / lines;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Rotate (fromX, fromY) around (cx, cy)
        const rfx = cx + (fromX - cx) * cos - (fromY - cy) * sin;
        const rfy = cy + (fromX - cx) * sin + (fromY - cy) * cos;
        
        // Rotate (toX, toY) around (cx, cy)
        const rtx = cx + (toX - cx) * cos - (toY - cy) * sin;
        const rty = cy + (toX - cx) * sin + (toY - cy) * cos;
        
        executeDraw(rfx, rfy, rtx, rty);
      }
    }
  };

  // ─── BRUSH ENGINES ─────────────────────────────────────────────────────────
  const drawStroke = (fromX, fromY, toX, toY, pressure, state) => {
    const { brushType, brushSize, brushOpacity, brushColor } = state;
    
    // Eraser and Smudge must operate on the composite canvas
    let targetCanvas = activeRef.current;
    if (brushType === 'eraser' || brushType === 'smudge') {
      targetCanvas = compositeRef.current;
    }
    
    const ctx = targetCanvas.getContext('2d');
    const dynamicSize = brushSize * (0.5 + pressure * 0.5);

    ctx.globalCompositeOperation = brushType === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;

    switch (brushType) {
      case 'pencil':
        ctx.globalAlpha = brushOpacity * (0.6 + pressure * 0.4);
        ctx.lineWidth = dynamicSize * 0.7;
        ctx.shadowBlur = 0;
        drawSmoothedLine(ctx, fromX, fromY, toX, toY);
        break;
        
      case 'ink':
        ctx.globalAlpha = brushOpacity;
        ctx.lineWidth = dynamicSize;
        ctx.shadowBlur = 0;
        drawSmoothedLine(ctx, fromX, fromY, toX, toY);
        break;
        
      case 'watercolor':
        ctx.globalAlpha = brushOpacity * 0.15 * pressure;
        ctx.lineWidth = dynamicSize * 2.5;
        ctx.shadowBlur = dynamicSize;
        ctx.shadowColor = brushColor;
        for (let i = 0; i < 3; i++) {
          const jitterX = (Math.random() - 0.5) * dynamicSize * 0.4;
          const jitterY = (Math.random() - 0.5) * dynamicSize * 0.4;
          drawSmoothedLine(ctx, fromX + jitterX, fromY + jitterY, toX + jitterX, toY + jitterY);
        }
        break;
        
      case 'charcoal':
        ctx.globalAlpha = brushOpacity * (0.3 + pressure * 0.4);
        ctx.lineWidth = dynamicSize;
        ctx.shadowBlur = 0;
        // Texture: multiple parallel offset lines
        for (let i = -2; i <= 2; i++) {
          ctx.globalAlpha = brushOpacity * 0.08 * pressure;
          ctx.lineWidth = dynamicSize * 0.3;
          const offset = i * (dynamicSize * 0.2);
          drawSmoothedLine(ctx, fromX + offset, fromY + offset, toX + offset, toY + offset);
        }
        ctx.globalAlpha = brushOpacity * (0.4 + pressure * 0.3);
        ctx.lineWidth = dynamicSize * 0.5;
        drawSmoothedLine(ctx, fromX, fromY, toX, toY);
        break;
        
      case 'eraser':
        ctx.globalAlpha = 0.8 * pressure;
        ctx.lineWidth = dynamicSize * 2;
        ctx.shadowBlur = 0;
        drawSmoothedLine(ctx, fromX, fromY, toX, toY);
        break;
        
      case 'smudge':
        smudgeAt(ctx, toX, toY, dynamicSize, pressure);
        break;
        
      default:
        // Default fallback (pencil)
        ctx.globalAlpha = brushOpacity * (0.6 + pressure * 0.4);
        ctx.lineWidth = dynamicSize * 0.7;
        drawSmoothedLine(ctx, fromX, fromY, toX, toY);
        break;
    }
  };

  const drawSmoothedLine = (ctx, fromX, fromY, toX, toY) => {
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
  };

  const smudgeAt = (ctx, x, y, size, pressure) => {
    // 3x3 Box blur on the extracted pixels to simulate smudging
    const r = Math.max(1, Math.floor(size * pressure * 1.5));
    const sx = Math.floor(x - r);
    const sy = Math.floor(y - r);
    const w = r * 2;
    const h = r * 2;
    
    // Bounds check
    if (sx < 0 || sy < 0 || sx + w > ctx.canvas.width || sy + h > ctx.canvas.height) return;

    const imgData = ctx.getImageData(sx, sy, w, h);
    const data = imgData.data;
    const buf = new Uint8ClampedArray(data);

    // Single pass blur
    for (let py = 1; py < h - 1; py++) {
      for (let px = 1; px < w - 1; px++) {
        let rs = 0, gs = 0, bs = 0, as = 0;
        let count = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((py + dy) * w + (px + dx)) * 4;
            rs += buf[idx];
            gs += buf[idx + 1];
            bs += buf[idx + 2];
            as += buf[idx + 3];
            count++;
          }
        }
        
        const center = (py * w + px) * 4;
        data[center] = rs / count;
        data[center + 1] = gs / count;
        data[center + 2] = bs / count;
        data[center + 3] = as / count;
      }
    }
    
    ctx.putImageData(imgData, sx, sy);
  };

  // ─── IMPERATIVE HANDLE ─────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getCompositeDataURL: () => {
      if (!compositeRef.current) return null;
      return compositeRef.current.toDataURL('image/png');
    },
    clearCanvas: () => {
      const compCanvas = compositeRef.current;
      if (!compCanvas) return;
      const ctx = compCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, compCanvas.width, compCanvas.height);
    },
    flattenLayersToComposite: () => {
      console.log('flattenLayersToComposite called');
    }
  }));

  const canvasStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    touchAction: 'none' // CRITICAL for pen tablets and touch gestures
  };

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden'
      }}
    >
      <canvas ref={compositeRef} style={canvasStyle} />
      <canvas ref={activeRef} style={{ ...canvasStyle, zIndex: 10 }} />
    </div>
  );
});

export default ArtCanvas;
