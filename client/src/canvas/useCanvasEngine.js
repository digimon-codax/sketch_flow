import { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { v4 as uuidv4 } from "uuid";
import { useWebSocket } from "../hooks/useWebSocket";
import { useAuthStore } from "../store/authStore";
import { useUIStore } from "../store/uiStore";
import { useDiagramStore } from "../store/diagramStore";
import { updateDiagram } from "../api/diagramsApi";

export function useCanvasEngine(diagramId, loading) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const isUpdatingFromServer = useRef(false);
  const { user } = useAuthStore();
  const setActiveElement = useUIStore((state) => state.setActiveElement);
  const setCollaborators = useDiagramStore((state) => state.setCollaborators);

  const handleSocketMessage = useCallback(
    (data) => {
      if (!canvas) return;

      switch (data.type) {
        case "ROOM_STATE": {
          const roomCanvasState = data.payload?.canvasState ?? null;
          if (!roomCanvasState) break;
          isUpdatingFromServer.current = true;
          canvas.loadFromJSON(roomCanvasState, () => {
            canvas.renderAll();
            isUpdatingFromServer.current = false;
          });
          break;
        }
        case "ELEMENTS_UPDATE":
        case "CANVAS_DELTA": {
          const stateJSON = data.payload?.stateJSON ?? data.payload?.canvasState ?? null;
          if (!stateJSON) break;
          if (data.userId === user?.id) return;
          isUpdatingFromServer.current = true;
          canvas.loadFromJSON(stateJSON, () => {
            canvas.renderAll();
            isUpdatingFromServer.current = false;
          });
          break;
        }
        case "CURSOR_MOVE": {
          const userId = data.userId;
          const x = data.payload?.x;
          const y = data.payload?.y;
          if (!userId || userId === user?.id || typeof x !== "number" || typeof y !== "number") break;
          setRemoteCursors((prev) => ({
            ...prev,
            [userId]: {
              x,
              y,
              name: data.payload?.name || "User",
              color: data.payload?.color || "#6366f1",
            },
          }));
          break;
        }
        case "USER_LIST":
          setCollaborators(data.payload ?? []);
          break;
        default:
          break;
      }
    },
    [canvas, setCollaborators, user],
  );

  const { send } = useWebSocket(diagramId, handleSocketMessage);

  useEffect(() => {
    if (loading) return;
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = new fabric.Canvas(canvasRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: "#f8f9fa",
      selection: true,
      preserveObjectStacking: true,
    });

    const bgCanvas = document.createElement("canvas");
    bgCanvas.width = 20;
    bgCanvas.height = 20;
    const bgCtx = bgCanvas.getContext("2d");
    bgCtx.clearRect(0, 0, 20, 20);
    bgCtx.fillStyle = "#adb5c7";
    bgCtx.beginPath();
    bgCtx.arc(10, 10, 1.2, 0, Math.PI * 2);
    bgCtx.fill();

    initCanvas.backgroundColor = new fabric.Pattern({
      source: bgCanvas,
      repeat: "repeat",
    });
    initCanvas.requestRenderAll();

    initCanvas.on("mouse:down", function (opt) {
      const evt = opt.e;
      if (evt.altKey || evt.button === 1) {
        this.isDragging = true;
        this.selection = false;
        this.lastPosX = evt.clientX;
        this.lastPosY = evt.clientY;
      }
    });

    initCanvas.on("mouse:move", function (opt) {
      if (this.isDragging) {
        const e = opt.e;
        const vpt = this.viewportTransform;
        vpt[4] += e.clientX - this.lastPosX;
        vpt[5] += e.clientY - this.lastPosY;
        this.requestRenderAll();
        this.lastPosX = e.clientX;
        this.lastPosY = e.clientY;
      }

      const pointer = this.getPointer(opt.e);
      if (pointer && !this.isDragging) {
        send("CURSOR_MOVE", {
          x: pointer.x,
          y: pointer.y,
          name: user?.name || "User",
          color: "#6366f1",
        });
      }
    });

    initCanvas.on("mouse:up", function () {
      this.setViewportTransform(this.viewportTransform);
      this.isDragging = false;
      this.selection = true;
    });

    initCanvas.on("mouse:wheel", function (opt) {
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

    initCanvas.on("object:added", (e) => {
      const obj = e.target;
      if (!obj.id && !isUpdatingFromServer.current) {
        obj.set("id", uuidv4());
        obj.set("contextId", uuidv4());
      }
    });

    let saveTimeout = null;
    const emitDelta = () => {
      if (isUpdatingFromServer.current) return;
      const stateJSON = initCanvas.toJSON(["id", "contextId"]);
      send("ELEMENTS_UPDATE", { stateJSON });
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        if (diagramId) updateDiagram(diagramId, { canvasState: stateJSON }).catch(console.error);
      }, 2000);
    };

    initCanvas.on("object:modified", emitDelta);
    initCanvas.on("object:moving", emitDelta);
    initCanvas.on("object:scaling", emitDelta);
    initCanvas.on("object:rotating", emitDelta);
    initCanvas.on("object:added", () => {
      if (!isUpdatingFromServer.current) emitDelta();
    });
    initCanvas.on("object:removed", () => {
      if (!isUpdatingFromServer.current) emitDelta();
    });

    const onSelect = (e) => {
      const obj = e.selected?.[0] || initCanvas.getActiveObject();
      if (obj && !obj.excludeFromExport && (obj.type === "rect" || obj.type === "circle")) {
        setActiveElement(obj.id);
      } else {
        setActiveElement(null);
      }
    };
    initCanvas.on("selection:created", onSelect);
    initCanvas.on("selection:updated", onSelect);
    initCanvas.on("selection:cleared", () => setActiveElement(null));

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
  }, [diagramId, loading, send, setActiveElement, user?.name]);

  return { canvas, canvasRef, containerRef, remoteCursors };
}
