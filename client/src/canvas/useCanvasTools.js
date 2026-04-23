import { useEffect } from "react";

const TOOL_SHORTCUTS = {
  v: "select",
  h: "hand",
  r: "rect",
  d: "diamond",
  e: "circle",
  a: "arrow",
  l: "line",
  p: "pen",
  t: "text",
};

export function useCanvasTools({ canvas, setActiveTool }) {
  useEffect(() => {
    if (!canvas) return;

    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool) setActiveTool(tool);

      if (e.key === "Delete" || e.key === "Backspace") {
        const obj = canvas.getActiveObject();
        if (obj) {
          canvas.remove(obj);
          canvas.requestRenderAll();
        }
      }

      if (e.key === "Escape") setActiveTool("select");
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canvas, setActiveTool]);
}
