import { useEffect, useRef, useState } from 'react';
import * as fabric from 'fabric';
import { v4 as uuidv4 } from 'uuid';
import { socket, clientId } from '../socket';

export const useCanvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const isUpdatingFromServer = useRef(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Initialize Fabric Canvas
    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: '#fafafa',
      selection: true,
      preserveObjectStacking: true, // Keep selected objects in their z-index place
    });

    // Generate Background Grid
    const gridSize = 50;
    const canvasWidth = 5000;
    const canvasHeight = 5000;

    for (let i = 0; i < (canvasWidth / gridSize); i++) {
      initCanvas.add(new fabric.Line([ i * gridSize, 0, i * gridSize, canvasHeight], {
        stroke: '#e5e7eb',
        selectable: false,
        evented: false,
        excludeFromExport: true
      }));
      initCanvas.add(new fabric.Line([ 0, i * gridSize, canvasWidth, i * gridSize], {
        stroke: '#e5e7eb',
        selectable: false,
        evented: false,
        excludeFromExport: true
      }));
    }

    setCanvas(initCanvas);

    // --- Socket & Sync Logic ---

    // Ensure all objects have an ID when added locally
    initCanvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj.id && !isUpdatingFromServer.current) {
        obj.set('id', uuidv4());
      }
    });

    const emitDelta = () => {
      if (isUpdatingFromServer.current) return;
      
      const stateJSON = initCanvas.toJSON(['id', 'context']);
      socket.emit('canvas:delta', {
        clientId,
        stateJSON
      });
    };

    // Emit changes on move, scale, rotate, or modify
    initCanvas.on('object:modified', emitDelta);
    initCanvas.on('object:moving', emitDelta);
    initCanvas.on('object:scaling', emitDelta);
    initCanvas.on('object:rotating', emitDelta);
    
    // Also emit when objects are added or removed (if not from server)
    initCanvas.on('object:added', (e) => { if (!isUpdatingFromServer.current) emitDelta(); });
    initCanvas.on('object:removed', (e) => { if (!isUpdatingFromServer.current) emitDelta(); });

    // Handle remote deltas
    const handleRemoteDelta = async (data) => {
      if (data.clientId === clientId) return; // Prevent echo
      
      isUpdatingFromServer.current = true;
      try {
        await initCanvas.loadFromJSON(data.stateJSON);
        initCanvas.renderAll();
      } catch (err) {
        console.error('Error loading state from server', err);
      } finally {
        isUpdatingFromServer.current = false;
      }
    };

    // Handle full state (on first load)
    const handleFullState = async (stateJSON) => {
      isUpdatingFromServer.current = true;
      try {
        await initCanvas.loadFromJSON(stateJSON);
        initCanvas.renderAll();
      } catch (err) {
        console.error('Error loading initial state', err);
      } finally {
        isUpdatingFromServer.current = false;
      }
    };

    socket.on('canvas:delta', handleRemoteDelta);
    socket.on('canvas:full_state', handleFullState);

    // Request initial state
    socket.emit('canvas:request_state');

    // --- Responsive Resize Logic ---
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // Keep viewport transform (zoom/pan) intact
        const vpt = initCanvas.viewportTransform;
        initCanvas.setDimensions({ width, height });
        initCanvas.setViewportTransform(vpt);
      }
    });
    
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      socket.off('canvas:delta', handleRemoteDelta);
      socket.off('canvas:full_state', handleFullState);
      initCanvas.dispose();
    };
  }, []);

  return { canvas, canvasRef, containerRef };
};
