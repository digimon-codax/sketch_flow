import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useArtStore } from './artStore';

const ArtCanvas = forwardRef(({ artData }, ref) => {
  const containerRef = useRef(null);
  const compositeRef = useRef(null);
  const activeRef = useRef(null);
  const guideRef = useRef(null);
  const interactionRef = useRef(null);
  const layerCanvases = useRef(new Map()); // layerId → HTMLCanvasElement

  // Drawing state refs (never trigger re-renders)
  const isDrawing = useRef(false);
  const lastPoint = useRef(null);
  const currentPath = useRef([]);
  const strokeSnapshot = useRef(null);
  const prevToolRef = useRef('pencil');
  const persistedArtworkRef = useRef(null);
  
  // Multitouch + Palm Rejection + Zoom/Pan
  const activePointerType = useRef(null);
  const activePointers = useRef(new Map());
  const lastPinchDist = useRef(null);

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

  const takeSnapshot = useCallback(() => {
    const snapshot = { timestamp: Date.now(), layers: {} };
    layerCanvases.current.forEach((canvas, layerId) => {
      snapshot.layers[layerId] = canvas.toDataURL();
    });
    useArtStore.getState().pushStroke(snapshot);
  }, []);

  const applySnapshot = useCallback((snapshot) => {
    if (!snapshot) return;
    const promises = Object.entries(snapshot.layers).map(([layerId, dataURL]) => {
      return new Promise(resolve => {
        const canvas = layerCanvases.current.get(layerId);
        if (!canvas) { resolve(); return; }
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          resolve();
        };
        img.src = dataURL;
      });
    });
    Promise.all(promises).then(() => recompositeAllLayers());
  }, [recompositeAllLayers]);

  // Expose recompositeAllLayers and layerCanvases so LayersPanel can call them

  // (stored on the ref object directly, not via useImperativeHandle array)

  // ─── INIT & RESIZE ─────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    const compCanvas = compositeRef.current;
    const actCanvas = activeRef.current;
    const guideCanvas = guideRef.current;
    if (!container || !compCanvas || !actCanvas || !guideCanvas) return;

    let resizeTimer;

    const applyResize = (w, h) => {
      if (w <= 0 || h <= 0) return;

      compCanvas.width = w;
      compCanvas.height = h;
      actCanvas.width = w;
      actCanvas.height = h;
      guideCanvas.width = w;
      guideCanvas.height = h;

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

      const { layers, strokeHistory } = useArtStore.getState();

      // If saved artData has layerMeta, apply it first so layer canvases are created correctly
      if (artData?.layerMeta?.length) {
        useArtStore.getState().reorderLayers(artData.layerMeta);
        useArtStore.getState().setActiveLayer(artData.layerMeta[0].id);
        artData.layerMeta.forEach(layer => {
          if (!layerCanvases.current.has(layer.id)) createLayerCanvas(layer.id, w, h);
        });
      } else {
        layers.forEach(layer => {
          if (!layerCanvases.current.has(layer.id)) createLayerCanvas(layer.id, w, h);
        });
      }

      // Resize all canvases to correct dimensions
      compCanvas.width = w; compCanvas.height = h;
      actCanvas.width  = w; actCanvas.height  = h;
      guideCanvas.width  = w; guideCanvas.height  = h;
      layerCanvases.current.forEach(lc => { lc.width = w; lc.height = h; });

      if (artData?.layers && Object.keys(artData.layers).length > 0) {
        // Restore saved layer pixel data AFTER canvases are properly sized
        const promises = Object.entries(artData.layers).map(([layerId, dataURL]) =>
          new Promise(resolve => {
            const lc = layerCanvases.current.get(layerId);
            if (!lc) { resolve(); return; }
            const img = new Image();
            img.onload = () => {
              const ctx = lc.getContext('2d');
              ctx.clearRect(0, 0, lc.width, lc.height);
              ctx.drawImage(img, 0, 0);
              resolve();
            };
            img.src = dataURL;
          })
        );
        Promise.all(promises).then(() => {
          recompositeAllLayers();
          takeSnapshot(); // seed history with loaded state
        });
      } else {
        // Fresh canvas — fill white and take initial snapshot
        const ctx = compCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        if (strokeHistory.length === 0) takeSnapshot();
      }
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

  // ─── KEYBOARD SHORTCUTS ────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && typeof useArtStore.getState().undoStroke === 'function') {
        if (e.shiftKey && e.key.toLowerCase() === 'z') {
          e.preventDefault();
          const snapshot = useArtStore.getState().redoStroke();
          if (snapshot) applySnapshot(snapshot);
        } else if (e.key === 'z') {
          e.preventDefault();
          const snapshot = useArtStore.getState().undoStroke();
          if (snapshot) applySnapshot(snapshot);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applySnapshot]);

  // ─── POINTER EVENTS ────────────────────────────────────────────────────
  useEffect(() => {
    const actCanvas = activeRef.current;
    const interactionLayer = interactionRef.current;
    if (!actCanvas || !interactionLayer) return;

    const getActiveLayerCtx = () => {
      const { activeLayerId } = useArtStore.getState();
      const lc = layerCanvases.current.get(activeLayerId);
      return lc ? lc.getContext('2d') : null;
    };
    
    const getZoomedCoords = (e) => {
      const { artZoom, artPanX, artPanY } = useArtStore.getState();
      const rect = interactionLayer.getBoundingClientRect(); // use interaction layer since we moved events there
      return {
        x: (e.clientX - rect.left - artPanX) / artZoom,
        y: (e.clientY - rect.top - artPanY) / artZoom
      };
    };

    const onPointerDown = (e) => {
      // 1) Palm Rejection / Prefer Pen
      if (isDrawing.current && e.pointerType === 'touch') {
        e.preventDefault();
        return;
      }
      if (activePointerType.current === 'pen' && e.pointerType === 'touch') {
        return;
      }
      activePointerType.current = e.pointerType;

      // 2) Multitouch Tracking
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // If multitouch, don't start drawing
      if (activePointers.current.size >= 2) return;

      const state = useArtStore.getState();

      if (state.brushType === 'eyedropper') {
        const { x, y } = getZoomedCoords(e);
        const px = compositeRef.current.getContext('2d').getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
        const hex = '#' + [px[0], px[1], px[2]].map(v => v.toString(16).padStart(2, '0')).join('');
        state.setBrushColor(hex); state.addToRecentColors(hex);
        if (prevToolRef.current) state.setBrushType(prevToolRef.current);
        return;
      }

      const activeLayer = state.layers.find(l => l.id === state.activeLayerId);
      if (activeLayer?.locked) return;

      try { actCanvas.setPointerCapture(e.pointerId); } catch (_) {}

      const pressure = e.pointerType === 'mouse' ? 0.5 : (e.pressure || 0.5);
      const { x, y } = getZoomedCoords(e);

      isDrawing.current = true;
      currentPath.current = [{ x, y, pressure }];
      lastPoint.current = { x, y, pressure };

      // Snapshot active layer for undo
      const lc = layerCanvases.current.get(state.activeLayerId);
      strokeSnapshot.current = lc ? lc.toDataURL() : null;

      drawWithSymmetry(x, y, x, y, pressure);
    };

    const onPointerMove = (e) => {
      activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // Multitouch Pinch Zoom
      if (activePointers.current.size === 2) {
        const [p1, p2] = [...activePointers.current.values()];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (lastPinchDist.current) {
          const scale = dist / lastPinchDist.current;
          useArtStore.getState().setArtZoom(Math.min(Math.max(useArtStore.getState().artZoom * scale, 0.1), 10));
        }
        lastPinchDist.current = dist;
        return;
      }

      if (!isDrawing.current) return;
      
      const state = useArtStore.getState();
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      
      events.forEach(coalescedEvent => {
        const pressure = coalescedEvent.pointerType === 'mouse' ? 0.5 : (coalescedEvent.pressure || 0.5);
        const { x, y } = getZoomedCoords(coalescedEvent);
        const last = lastPoint.current;
        
        currentPath.current.push({ x, y, pressure });
        drawWithSymmetry(last.x, last.y, x, y, pressure);
        lastPoint.current = { x, y, pressure };
      });
    };

    const onPointerUp = (e) => {
      if (e.pointerType === activePointerType.current) {
        activePointerType.current = null;
      }

      activePointers.current.delete(e.pointerId);
      if (activePointers.current.size === 0) lastPinchDist.current = null;

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
      takeSnapshot();

      lastPoint.current = null;
      currentPath.current = [];
    };

    interactionLayer.addEventListener('pointerdown', onPointerDown);
    interactionLayer.addEventListener('pointermove', onPointerMove);
    interactionLayer.addEventListener('pointerup', onPointerUp);
    interactionLayer.addEventListener('pointercancel', onPointerUp);

    return () => {
      interactionLayer.removeEventListener('pointerdown', onPointerDown);
      interactionLayer.removeEventListener('pointermove', onPointerMove);
      interactionLayer.removeEventListener('pointerup', onPointerUp);
      interactionLayer.removeEventListener('pointercancel', onPointerUp);
    };
  }, [recompositeAllLayers]);

  // ─── SYMMETRY ──────────────────────────────────────────────────────────
  function getMirroredPoints(x, y, canvasWidth, canvasHeight, symmetryMode, symmetryLines) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;
    const points = [];
    
    if (symmetryMode === 'vertical' || symmetryMode === 'both') {
      points.push({ x: 2 * cx - x, y });
    }
    if (symmetryMode === 'horizontal' || symmetryMode === 'both') {
      points.push({ x, y: 2 * cy - y });
    }
    if (symmetryMode === 'both') {
      points.push({ x: 2 * cx - x, y: 2 * cy - y });
    }
    if (symmetryMode === 'radial') {
      for (let i = 1; i < symmetryLines; i++) {
        const angle = (Math.PI * 2 * i) / symmetryLines;
        const dx = x - cx;
        const dy = y - cy;
        const rotX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotY = dx * Math.sin(angle) + dy * Math.cos(angle);
        points.push({ x: cx + rotX, y: cy + rotY });
      }
    }
    
    return points;
  }

  const drawWithSymmetry = (fromX, fromY, toX, toY, pressure) => {
    const state = useArtStore.getState();
    const { symmetryMode, symmetryLines } = state;
    const w = compositeRef.current.width;
    const h = compositeRef.current.height;
    const d = (fx, fy, tx, ty) => drawStroke(fx, fy, tx, ty, pressure, state);

    // Draw primary stroke
    d(fromX, fromY, toX, toY);

    if (symmetryMode !== 'none') {
      const mirroredFrom = getMirroredPoints(fromX, fromY, w, h, symmetryMode, symmetryLines);
      const mirroredTo = getMirroredPoints(toX, toY, w, h, symmetryMode, symmetryLines);
      
      for (let i = 0; i < mirroredFrom.length; i++) {
        d(mirroredFrom[i].x, mirroredFrom[i].y, mirroredTo[i].x, mirroredTo[i].y);
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
    // Return the live Map so callers always get the current canvases
    get layerCanvases() { return layerCanvases.current; },
    takeSnapshot,
    applySnapshot,

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
  const brushSize = useArtStore(s => s.brushSize);
  const brushColor = useArtStore(s => s.brushColor);
  const symmetryMode = useArtStore(s => s.symmetryMode);
  const symmetryLines = useArtStore(s => s.symmetryLines);
  const artZoom = useArtStore(s => s.artZoom);
  const artPanX = useArtStore(s => s.artPanX);
  const artPanY = useArtStore(s => s.artPanY);

  const [cursorStyle, setCursorStyle] = React.useState('crosshair');

  useEffect(() => {
    if (brushType === 'eyedropper') {
      setCursorStyle('crosshair');
      return;
    }
    if (brushType === 'smudge') {
      setCursorStyle('cell');
      return;
    }
    
    // Generate inline SVG cursor
    const size = Math.min(brushSize, 64);
    const r = Math.max(1, size / 2 - 1);
    const rOuter = size / 2;
    
    let svg = '';
    if (brushType === 'eraser') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${rOuter}" cy="${rOuter}" r="${r}" fill="#ffffff" stroke="#000000" stroke-width="1.5" opacity="0.8"/>
      </svg>`;
    } else if (brushType === 'watercolor') {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${rOuter}" cy="${rOuter}" r="${r}" fill="none" stroke="${brushColor}" stroke-width="1.5" opacity="0.4"/>
      </svg>`;
    } else {
      svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <circle cx="${rOuter}" cy="${rOuter}" r="${r}" fill="none" stroke="${brushColor}" stroke-width="1.5" opacity="0.8"/>
        <circle cx="${rOuter}" cy="${rOuter}" r="1" fill="${brushColor}"/>
      </svg>`;
    }
    
    const url = 'data:image/svg+xml;base64,' + btoa(svg);
    setCursorStyle(`url("${url}") ${rOuter} ${rOuter}, crosshair`);
  }, [brushType, brushSize, brushColor]);

  const drawSymmetryGuides = useCallback(() => {
    const canvas = guideRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (symmetryMode === 'none') return;
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    
    if (symmetryMode === 'vertical' || symmetryMode === 'both') {
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, canvas.height);
      ctx.stroke();
    }
    
    if (symmetryMode === 'horizontal' || symmetryMode === 'both') {
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(canvas.width, cy);
      ctx.stroke();
    }
    
    if (symmetryMode === 'radial') {
      for (let i = 0; i < symmetryLines; i++) {
        const angle = (Math.PI * 2 * i) / symmetryLines;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(angle) * Math.max(canvas.width, canvas.height),
          cy + Math.sin(angle) * Math.max(canvas.width, canvas.height)
        );
        ctx.stroke();
      }
    }
    
    ctx.setLineDash([]);
  }, [symmetryMode, symmetryLines]);

  useEffect(() => {
    drawSymmetryGuides();
  }, [drawSymmetryGuides]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#e5e5e5', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        transform: `translate(${artPanX}px, ${artPanY}px) scale(${artZoom})`,
        transformOrigin: 'top left',
        transition: 'none', background: '#ffffff',
        pointerEvents: 'none' // the interaction surface covers the screen
      }}>
        <canvas ref={compositeRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        <canvas ref={activeRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />
        <canvas ref={guideRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 15 }} />
      </div>
      
      {/* Interaction Surface */}
      <div 
        ref={interactionRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', touchAction: 'none', zIndex: 20, cursor: cursorStyle }}
      />
      
      {symmetryMode !== 'none' && (
        <div 
          onClick={() => useArtStore.getState().setSymmetryMode('none')}
          style={{
            position: 'absolute', top: '12px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(124,58,237,0.15)', border: '1px solid var(--border-accent)',
            fontFamily: 'Fira Code', fontSize: '11px', color: 'var(--accent-bright)',
            padding: '4px 8px', borderRadius: '12px', cursor: 'pointer', zIndex: 20
          }}
        >
          ⊹ Symmetry: {symmetryMode === 'radial' ? `Radial ${symmetryLines}` : symmetryMode.charAt(0).toUpperCase() + symmetryMode.slice(1)}
        </div>
      )}
    </div>
  );
});

export default ArtCanvas;
