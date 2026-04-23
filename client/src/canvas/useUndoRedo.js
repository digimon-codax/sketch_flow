import { useRef, useCallback } from "react";

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function useUndoRedo(getSnapshot, applySnapshot) {
  const historyRef = useRef([]);
  const pointerRef = useRef(-1);

  const snapshot = useCallback(() => {
    const current = getSnapshot();
    const nextHistory = historyRef.current.slice(0, pointerRef.current + 1);
    nextHistory.push(deepClone(current));
    historyRef.current = nextHistory;
    pointerRef.current = nextHistory.length - 1;
  }, [getSnapshot]);

  const undo = useCallback(() => {
    if (pointerRef.current <= 0) return;
    pointerRef.current -= 1;
    applySnapshot(deepClone(historyRef.current[pointerRef.current]));
  }, [applySnapshot]);

  const redo = useCallback(() => {
    if (pointerRef.current >= historyRef.current.length - 1) return;
    pointerRef.current += 1;
    applySnapshot(deepClone(historyRef.current[pointerRef.current]));
  }, [applySnapshot]);

  return { snapshot, undo, redo };
}
