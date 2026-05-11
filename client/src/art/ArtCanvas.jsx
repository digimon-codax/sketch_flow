import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useArtStore } from './artStore';

const ArtCanvas = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  const compositeRef = useRef(null);
  const activeRef = useRef(null);
  const layerCanvases = useRef(new Map()); // layerId → HTMLCanvasElement

  // Drawing state refs (never trigger re-renders)
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const currentPath = useRef([]);
  const strokeSnapshot = useRef(null);
  const prevToolRef = useRef('pencil');
  const persistedArtworkRef = useRef(null);

  // ─── LAYER CANVAS MANAGEMENT ───────────────────────────────────────────
  const createLayerCanvas = useCallback((layerId, width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = width || 1;
    canvas.height = height || 1;
    layerCanvases.current.set(layerId, canvas);
    return canvas;
  }, []);

  const recompositeAllLayers = useCallback(() => {
    const comp = compositeRef.current;
    if (!comp || comp.width === 0) return;
    const ctx = comp.getContext('2d');
    const { layers } = useArtStore.getState();

    ctx.clearRect(0, 0, comp.width, comp.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, comp.width, comp.height);

    layers.forEach(layer => {
      if (!layer.visible) return;
      const lc = layerCanvases.current.get(layer.id);
      if (!lc) return;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode || 'source-over';
      ctx.drawImage(lc, 0, 0);
    });

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    persistedArtworkRef.current = comp.toDataURL();
  }, []);

  // Expose recompositeAllLayers and layerCanvases so LayersPanel can call them
  // (stored on the ref object directly, not via useImperativeHandle array)

  // ─── INIT & RESIZE ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const compCanvas = compositeRef.current;
    const actCanvas = activeRef.current;
    if (!container || !compCanvas || !actCanvas) return;

    let resizeTimer;

    const applyResize = (w, h) => {
      if (w <= 0 || h <= 0) return;

      compCanvas.width = w;
      compCanvas.height = h;
      actCanvas.width = w;
      actCanvas.height = h;

      // Resize all layer canvases, preserving their content
      const restorePromises = [];
      layerCanvases.current.forEach((lc) => {
        const dataURL = lc.width > 0 ? lc.toDataURL() : null;
        lc.width = w;
        lc.height = h;
        if (dataURL && dataURL !== 'data:,') {
          restorePromises.push(new Promise(resolve => {
            const img = new Image();
            img.onload = () => { lc.getContext('2d').drawImage(img, 0, 0); resolve(); };
            img.src = dataURL;
          }));
        }
      });

      Promise.all(restorePromises).then(() => recompositeAllLayers());
    };

    // Size once after layout settles
    requestAnimationFrame(() => {
      const rect = container.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      // Create canvases for any existing layers
      const { layers } = useArtStore.getState();
      layers.forEach(layer => {
        if (!layerCanvases.current.has(layer.id)) createLayerCanvas(layer.id, w, h);
      });
      applyResize(w, h);
    });

    const handleWindowResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const rect = container.getBoundingClientRect();
        const w = Math.floor(rect.width);
        const h = Math.floor(rect.height);
        if (Math.abs(compCanvas.width - w) > 5 || Math.abs(compCanvas.height - h) > 5) {
          applyResize(w, h);
        }
      }, 200);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => { window.removeEventListener('resize', handleWindowResize); clearTimeout(resizeTimer); };
  }, [createLayerCanvas, recompositeAllLayers]);

  // ─── POINTER EVENTS ────────────────────────────────────────────────────
  useEffect(() => {
    const actCanvas = activeRef.current;
    if (!actCanvas) return;

    const getActiveLayerCtx = () => {
      const { activeLayerId } = useArtStore.getState();
      const lc = layerCanvases.current.get(activeLayerId);
      return lc ? lc.getContext('2d') : null;
    };

    const onPointerDown = (e) => {
      const state = useArtStore.getState();

      if (state.brushType === 'eyedropper') {
        const x = Math.floor(e.offsetX), y = Math.floor(e.offsetY);
        const px = compositeRef.current.getContext('2d').getImageData(x, y, 1, 1).data;
        const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        state.setBrushColor(hex); state.addToRecentColors(hex);
        if (prevToolRef.current) state.setBrushType(prevToolRef.current);
        return;
      }

      const activeLayer = state.layers.find(l => l.id === state.activeLayerId);
      if (activeLayer?.locked) return;

      try { actCanvas.setPointerCapture(e.pointerId); } catch (_) {}

      const pressure = e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5);
      const x = e.offsetX, y = e.offsetY;

      isDrawing.current = true;
      currentPath.current = [{ x, y, pressure }];
      lastPoint.current = { x, y, pressure };

      // Snapshot active layer for undo
      const lc = layerCanvases.current.get(state.activeLayerId);
      strokeSnapshot.current = lc ? lc.toDataURL() : null;

      drawWithSymmetry(x, y, x, y, pressure);
    };

    const onPointerMove = (e) => {
      if (!isDrawing.current) return;
      const pressure = e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5);
      const x = e.offsetX, y = e.offsetY;
      const last = lastPoint.current;
      currentPath.current.push({ x, y, pressure });
      drawWithSymmetry(last.x, last.y, x, y, pressure);
      lastPoint.current = { x, y, pressure };
    };

    const onPointerUp = () => {
      if (!isDrawing.current) return;
      isDrawing.current = false;

      const state = useArtStore.getState();
      const lc = layerCanvases.current.get(state.activeLayerId);

      if (state.brushType !== 'eraser' && state.brushType !== 'smudge') {
        // Commit active canvas stroke onto the active layer canvas
        if (lc) {
          const layerCtx = lc.getContext('2d');
          layerCtx.globalCompositeOperation = 'source-over';
          layerCtx.globalAlpha = 1;
          layerCtx.drawImage(actCanvas, 0, 0);
        }
        const ctx = actCanvas.getContext('2d');
        ctx.clearRect(0, 0, actCanvas.width, actCanvas.height);
      } else {
        // Eraser/smudge already drew to layer canvas — just reset context
        if (lc) {
          const layerCtx = lc.getContext('2d');
          layerCtx.globalCompositeOperation = 'source-over';
          layerCtx.globalAlpha = 1;
        }
      }

      recompositeAllLayers();

      if (strokeSnapshot.current) {
        state.pushStroke(persistedArtworkRef.current);
      }

      lastPoint.current = null;
      currentPath.current = [];
    };

    actCanvas.addEventListener('pointerdown', onPointerDown);
    actCanvas.addEventListener('pointermove', onPointerMove);
    actCanvas.addEventListener('pointerup', onPointerUp);
    actCanvas.addEventListener('pointercancel', onPointerUp);

    return () => {
      actCanvas.removeEventListener('pointerdown', onPointerDown);
      actCanvas.removeEventListener('pointermove', onPointerMove);
      actCanvas.removeEventListener('pointerup', onPointerUp);
      actCanvas.removeEventListener('pointercancel', onPointerUp);
    };
  }, [recompositeAllLayers]);

  // ─── SYMMETRY ──────────────────────────────────────────────────────────
  const drawWithSymmetry = (fromX, fromY, toX, toY, pressure) => {
    const state = useArtStore.getState();
    const { symmetryMode, symmetryLines } = state;
    const w = compositeRef.current.width;
    const h = compositeRef.current.height;
    const cx = w / 2, cy = h / 2;
    const d = (fx, fy, tx, ty) => drawStroke(fx, fy, tx, ty, pressure, state);

    d(fromX, fromY, toX, toY);
    if (symmetryMode === 'horizontal' || symmetryMode === 'both') d(w - fromX, fromY, w - toX, toY);
    if (symmetryMode === 'vertical'   || symmetryMode === 'both') d(fromX, h - fromY, toX, h - toY);
    if (symmetryMode === 'both') d(w - fromX, h - fromY, w - toX, h - toY);
    if (symmetryMode === 'radial' && symmetryLines > 1) {
      for (let i = 1; i < symmetryLines; i++) {
        const a = (2 * Math.PI * i) / symmetryLines;
        const cos = Math.cos(a), sin = Math.sin(a);
        const rfx = cx + (fromX - cx) * cos - (fromY - cy) * sin;
        const rfy = cy + (fromX - cx) * sin + (fromY - cy) * cos;
        const rtx = cx + (toX - cx) * cos - (toY - cy) * sin;
        const rty = cy + (toX - cx) * sin + (toY - cy) * cos;
        d(rfx, rfy, rtx, rty);
      }
    }
  };

  // ─── BRUSH ENGINES ─────────────────────────────────────────────────────
  const drawStroke = (fromX, fromY, toX, toY, pressure, state) => {
    const { brushType, brushSize, brushOpacity, brushColor, activeLayerId } = state;

    // Eraser/smudge → active layer canvas directly; others → activeRef (preview)
    let targetCanvas;
    if (brushType === 'eraser' || brushType === 'smudge') {
      targetCanvas = layerCanvases.current.get(activeLayerId);
    } else {
      targetCanvas = activeRef.current;
    }
    if (!targetCanvas) return;

    const ctx = targetCanvas.getContext('2d');
    const sz = brushSize * (0.5 + pressure * 0.5);

    ctx.globalCompositeOperation = brushType === 'eraser' ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = brushColor;

    switch (brushType) {
      case 'pencil':
        ctx.globalAlpha = brushOpacity * (0.6 + pressure * 0.4);
        ctx.lineWidth = sz * 0.7;
        ctx.shadowBlur = 0;
        line(ctx, fromX, fromY, toX, toY);
        break;
      case 'ink':
        ctx.globalAlpha = brushOpacity;
        ctx.lineWidth = sz;
        ctx.shadowBlur = 0;
        line(ctx, fromX, fromY, toX, toY);
        break;
      case 'watercolor':
        ctx.shadowBlur = sz;
        ctx.shadowColor = brushColor;
        ctx.lineWidth = sz * 2.5;
        for (let i = 0; i < 3; i++) {
          ctx.globalAlpha = brushOpacity * 0.15 * pressure;
          const jx = (Math.random() - 0.5) * sz * 0.4;
          const jy = (Math.random() - 0.5) * sz * 0.4;
          line(ctx, fromX + jx, fromY + jy, toX + jx, toY + jy);
        }
        break;
      case 'charcoal':
        for (let i = -2; i <= 2; i++) {
          ctx.globalAlpha = brushOpacity * 0.08 * pressure;
          ctx.lineWidth = sz * 0.3;
          const off = i * sz * 0.2;
          line(ctx, fromX + off, fromY + off, toX + off, toY + off);
        }
        ctx.globalAlpha = brushOpacity * (0.4 + pressure * 0.3);
        ctx.lineWidth = sz * 0.5;
        line(ctx, fromX, fromY, toX, toY);
        break;
      case 'eraser':
        ctx.globalAlpha = 0.8 * pressure;
        ctx.lineWidth = sz * 2;
        ctx.shadowBlur = 0;
        line(ctx, fromX, fromY, toX, toY);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        recompositeAllLayers();
        break;
      case 'smudge':
        smudgeAt(ctx, toX, toY, sz, pressure);
        recompositeAllLayers();
        break;
      default:
        ctx.globalAlpha = brushOpacity * (0.6 + pressure * 0.4);
        ctx.lineWidth = sz * 0.7;
        line(ctx, fromX, fromY, toX, toY);
    }
  };

  const line = (ctx, fx, fy, tx, ty) => {
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
  };

  const smudgeAt = (ctx, x, y, size, pressure) => {
    const r = Math.max(1, Math.floor(size * pressure * 1.5));
    const sx = Math.floor(x - r), sy = Math.floor(y - r);
    const w = r * 2, h = r * 2;
    if (sx < 0 || sy < 0 || sx + w > ctx.canvas.width || sy + h > ctx.canvas.height) return;
    const imgData = ctx.getImageData(sx, sy, w, h);
    const data = imgData.data;
    const buf = new Uint8ClampedArray(data);
    for (let py = 1; py < h - 1; py++) {
      for (let px = 1; px < w - 1; px++) {
        let rs = 0, gs = 0, bs = 0, as = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const i = ((py + dy) * w + (px + dx)) * 4;
          rs += buf[i]; gs += buf[i+1]; bs += buf[i+2]; as += buf[i+3];
        }
        const c = (py * w + px) * 4;
        data[c] = rs/9; data[c+1] = gs/9; data[c+2] = bs/9; data[c+3] = as/9;
      }
    }
    ctx.putImageData(imgData, sx, sy);
  };

  // ─── IMPERATIVE API ────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    recompositeAllLayers,
    layerCanvases: layerCanvases.current,

    getCanvasSize: () => ({
      width: compositeRef.current?.width || 0,
      height: compositeRef.current?.height || 0,
    }),

    createLayerCanvas: (id) => {
      const w = compositeRef.current?.width || 800;
      const h = compositeRef.current?.height || 600;
      return createLayerCanvas(id, w, h);
    },

    deleteLayerCanvas: (id) => {
      layerCanvases.current.delete(id);
    },

    duplicateLayerCanvas: (srcId, destId) => {
      const src = layerCanvases.current.get(srcId);
      if (!src) return;
      const dest = createLayerCanvas(destId, src.width, src.height);
      dest.getContext('2d').drawImage(src, 0, 0);
    },

    getLayerThumbnail: (layerId) => {
      const lc = layerCanvases.current.get(layerId);
      if (!lc || lc.width === 0) return null;
      const thumb = document.createElement('canvas');
      thumb.width = 40; thumb.height = 28;
      thumb.getContext('2d').drawImage(lc, 0, 0, 40, 28);
      return thumb.toDataURL();
    },

    getCompositeDataURL: () => compositeRef.current?.toDataURL('image/png') ?? null,

    clearCanvas: () => {
      const { layers } = useArtStore.getState();
      layers.forEach(layer => {
        const lc = layerCanvases.current.get(layer.id);
        if (lc) { const c = lc.getContext('2d'); c.clearRect(0, 0, lc.width, lc.height); }
      });
      recompositeAllLayers();
    },

    flattenLayersToComposite: () => recompositeAllLayers(),
  }));

  const brushType = useArtStore(s => s.brushType);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#ffffff', overflow: 'hidden' }}>
      <canvas ref={compositeRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none' }} />
      <canvas ref={activeRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none', zIndex: 10, cursor: brushType === 'eyedropper' ? 'crosshair' : 'default' }} />
    </div>
  );
});

export default ArtCanvas;
