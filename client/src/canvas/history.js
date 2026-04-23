export function createHistory() {
  const stack = [];
  let pointer = -1;
  let paused = false;

  return {
    snapshot(getStateFn) {
      if (paused) return;
      stack.splice(pointer + 1);
      const state = JSON.stringify(getStateFn());
      if (stack[pointer] === state) return; // no change, skip
      stack.push(state);
      pointer = stack.length - 1;
      if (stack.length > 80) { 
        stack.shift(); 
        pointer--; 
      }
    },
    undo(applyFn) {
      if (pointer <= 0) return false;
      paused = true;
      pointer--;
      applyFn(JSON.parse(stack[pointer]));
      paused = false;
      return true;
    },
    redo(applyFn) {
      if (pointer >= stack.length - 1) return false;
      paused = true;
      pointer++;
      applyFn(JSON.parse(stack[pointer]));
      paused = false;
      return true;
    },
    canUndo() { return pointer > 0; },
    canRedo() { return pointer < stack.length - 1; },
  };
}
