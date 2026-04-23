import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { updateDiagram } from '../api/diagramsApi';

export const useCanvas = (diagramId, loading) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const isUpdatingFromServer = useRef(false);
  const { user } = useAuthStore();
  const setActiveElement = useUIStore((state) => state.setActiveElement);

  const handleSocketMessage = useCallback((data) => {
    if (!canvas) return;
    
    switch (data.type) {
      case 'ROOM_STATE':
        isUpdatingFromServer.current = true;
        canvas.loadFromJSON(data.payload.canvasState, () => {
          canvas.renderAll();
          isUpdatingFromServer.current = false;
        });
        break;
      case 'CANVAS_DELTA':
        if (data.userId === user?.id) return; // ignore own echo
        isUpdatingFromServer.current = true;
        canvas.loadFromJSON(data.payload.stateJSON, () => {
          canvas.renderAll();
          isUpdatingFromServer.current = false;
        });
        break;
      default:
        break;
    }
  }, [canvas, user]);

  const { sendMessage } = useWebSocket(diagramId, handleSocketMessage);

  useEffect(() => {
    // ✅ KEY FIX: Wait until the diagram data has loaded and the canvas DOM is rendered
    if (loading) return;
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#f8f9fa',
      selection: true,
      preserveObjectStacking: true,
    });

    // Excalidraw-style dot grid
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 20;
    bgCanvas.height = 20;
    const bgCtx = bgCanvas.getContext('2d');
    bgCtx.clearRect(0, 0, 20, 20);
    bgCtx.fillStyle = '#adb5c7';
    bgCtx.beginPath();
    bgCtx.arc(10, 10, 1.2, 0, Math.PI * 2);
    bgCtx.fill();

    initCanvas.backgroundColor = new fabric.Pattern({
      source: bgCanvas,
      repeat: 'repeat',
    });
    initCanvas.requestRenderAll();

    // Panning (Alt + Drag or Middle-Click)
    initCanvas.on('mouse:down', function (opt) {
      const evt = opt.e;
      if (evt.altKey || evt.button === 1) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
    });

    initCanvas.on('mouse:move', function (opt) {
      if (this.isDragging) {
        const e = opt.e;
        const vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }
    });

    initCanvas.on('mouse:up', function () {
      this.setViewportTransform(this.viewportTransform);
      this.isDragging = false;
      this.selection = true;
    });

    // Zooming (Ctrl/Cmd + Scroll)
    initCanvas.on('mouse:wheel', function (opt) {
      if (opt.e.ctrlKey || opt.e.metaKey) {
        let zoom = this.getZoom();
        zoom *= 0.999 ** opt.e.deltaY;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;
        this.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
      }
    });

    // Auto-assign IDs to new objects
    initCanvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj.id && !isUpdatingFromServer.current) {
        obj.set('id', uuidv4());
        obj.set('contextId', uuidv4());
      }
    });

    let saveTimeout = null;
    const emitDelta = () => {
      if (isUpdatingFromServer.current) return;
      const stateJSON = initCanvas.toJSON(['id', 'contextId']);
      sendMessage('CANVAS_DELTA', { stateJSON });
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (diagramId) updateDiagram(diagramId, { canvasState: stateJSON }).catch(console.error);
      }, 2000);
    };

    initCanvas.on('object:modified', emitDelta);
    initCanvas.on('object:moving', emitDelta);
    initCanvas.on('object:scaling', emitDelta);
    initCanvas.on('object:rotating', emitDelta);
    initCanvas.on('object:added', () => { if (!isUpdatingFromServer.current) emitDelta(); });
    initCanvas.on('object:removed', () => { if (!isUpdatingFromServer.current) emitDelta(); });

    // Selection tracking for Context Panel
    const onSelect = (e) => {
      const obj = e.selected?.[0] || initCanvas.getActiveObject();
      if (obj && !obj.excludeFromExport && (obj.type === 'rect' || obj.type === 'circle')) {
        setActiveElement(obj.id);
      } else {
        setActiveElement(null);
      }
    };
    initCanvas.on('selection:created', onSelect);
    initCanvas.on('selection:updated', onSelect);
    initCanvas.on('selection:cleared', () => setActiveElement(null));

    // Resize observer keeps the canvas filling its container
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const vpt = initCanvas.viewportTransform;
        initCanvas.setDimensions({ width, height });
        initCanvas.setViewportTransform(vpt);
      }
    });
    resizeObserver.observe(containerRef.current);

    setCanvas(initCanvas);

    return () => {
      resizeObserver.disconnect();
      initCanvas.dispose();
      clearTimeout(saveTimeout);
      setCanvas(null);
    };
  }, [diagramId, loading]); // Re-run when loading flips to false

  return { canvas, canvasRef, containerRef };
};
