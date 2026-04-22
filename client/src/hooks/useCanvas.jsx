import { useEffect, useRef, useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { useWebSocket } from './useWebSocket';
import { useAuthStore } from '../store/authStore';
import { useDiagramStore } from '../store/diagramStore';
import { useUIStore } from '../store/uiStore';
import { updateDiagram } from '../api/diagramsApi';

export const useCanvas = (diagramId) => {
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
        if (data.userId === user.id) return; // ignore own echo
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
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#fafafa',
      selection: true,
      preserveObjectStacking: true,
    });

    // Grid
    const gridSize = 50;
    const canvasWidth = 5000;
    const canvasHeight = 5000;
    for (let i = 0; i < (canvasWidth / gridSize); i++) {
      initCanvas.add(new fabric.Line([ i * gridSize, 0, i * gridSize, canvasHeight], { stroke: '#e5e7eb', selectable: false, evented: false, excludeFromExport: true }));
      initCanvas.add(new fabric.Line([ 0, i * gridSize, canvasWidth, i * gridSize], { stroke: '#e5e7eb', selectable: false, evented: false, excludeFromExport: true }));
    }

    setCanvas(initCanvas);

    // Context tracking setup
    if (!fabric.Object.prototype.contextId) {
      fabric.Object.prototype.toObject = (function(toObject) {
        return function(propertiesToInclude = []) {
          return toObject.call(this, ['id', 'contextId', ...propertiesToInclude]);
        };
      })(fabric.Object.prototype.toObject);
    }

    initCanvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj.id && !isUpdatingFromServer.current) {
        obj.set('id', uuidv4());
        obj.set('contextId', uuidv4()); // Used for linking to DB Context
      }
    });

    let saveTimeout = null;
    const emitDelta = () => {
      if (isUpdatingFromServer.current) return;
      const stateJSON = initCanvas.toJSON(['id', 'contextId']);
      
      // 1. Send fast WS delta
      sendMessage('CANVAS_DELTA', { stateJSON });
      
      // 2. Debounce DB autosave
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

    // Selection tracking for UI Panel
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

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const vpt = initCanvas.viewportTransform;
        initCanvas.setDimensions({ width, height });
        initCanvas.setViewportTransform(vpt);
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      initCanvas.dispose();
      clearTimeout(saveTimeout);
    };
  }, [diagramId]); // Only re-run if diagram changes

  return { canvas, canvasRef, containerRef };
};
