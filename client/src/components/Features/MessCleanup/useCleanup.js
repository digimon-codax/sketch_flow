import { useState } from "react";
import api from "../../../api/index";

export function useCleanup(excalidrawAPI) {
  const [loading, setLoading] = useState(false);

  async function runCleanup() {
    if (!excalidrawAPI || loading) return;

    const elements = excalidrawAPI
      .getSceneElements()
      .filter((el) => !el.isDeleted);

    if (elements.length === 0) return;

    setLoading(true);
    try {
      // Send compact element info to the AI (not full Excalidraw state)
      const objects = elements.map((el) => ({
        id:     el.id,
        type:   el.type,
        label:  el.text ?? "",
        x:      el.x,
        y:      el.y,
        width:  el.width  ?? 0,
        height: el.height ?? 0,
      }));

      const { data } = await api.post("/ai/cleanup", { objects });
      if (!data?.layout || !Array.isArray(data.layout)) return;

      // Build a lookup map: id → { x, y }
      const posMap = {};
      data.layout.forEach(({ id, x, y }) => { posMap[id] = { x, y }; });

      // Store starting positions
      const startPos = {};
      elements.forEach((el) => { startPos[el.id] = { x: el.x, y: el.y }; });

      // ── Smooth 600ms animation ─────────────────────────────────
      const DURATION = 600;
      const start    = performance.now();

      function easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      }

      function animate(now) {
        const raw  = Math.min((now - start) / DURATION, 1);
        const ease = easeInOut(raw);

        const updated = elements.map((el) => {
          const to   = posMap[el.id];
          const from = startPos[el.id];
          if (!to || !from) return el;
          return {
            ...el,
            x: from.x + (to.x - from.x) * ease,
            y: from.y + (to.y - from.y) * ease,
          };
        });

        // Excalidraw elements are immutable — always spread into new array
        excalidrawAPI.updateScene({ elements: updated });

        if (raw < 1) {
          requestAnimationFrame(animate);
        }
      }

      requestAnimationFrame(animate);
    } catch (err) {
      console.error("[Mess Cleanup] failed:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return { runCleanup, loading };
}
