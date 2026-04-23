import { fabric } from 'fabric';

export function initEngine(canvasEl, width, height) {
  const fc = new fabric.Canvas(canvasEl, {
    width,
    height,
    backgroundColor: '#111111',
    selection: true,
    preserveObjectStacking: true,
    renderOnAddRemove: true,
  });

  // Zoom with mouse wheel toward cursor
  fc.on('mouse:wheel', opt => {
    const delta = opt.e.deltaY;
    let zoom = fc.getZoom() * (0.999 ** delta);
    zoom = Math.min(Math.max(zoom, 0.05), 10);
    fc.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
  });

  // Pan state
  fc._isPanning = false;
  fc._lastPanPos = { x: 0, y: 0 };

  // Pan on middle mouse button drag
  fc.on('mouse:down', opt => {
    if (opt.e.button === 1) { // Middle mouse button
      fc._isPanning = true;
      fc.selection = false;
      fc._lastPanPos = { x: opt.e.clientX, y: opt.e.clientY };
      opt.e.preventDefault();
    }
  });

  fc.on('mouse:move', opt => {
    if (!fc._isPanning) return;
    const vpt = fc.viewportTransform;
    vpt[4] += opt.e.clientX - fc._lastPanPos.x;
    vpt[5] += opt.e.clientY - fc._lastPanPos.y;
    fc._lastPanPos = { x: opt.e.clientX, y: opt.e.clientY };
    fc.requestRenderAll();
  });

  fc.on('mouse:up', () => {
    if (fc._isPanning) {
      fc._isPanning = false;
      fc.selection = true;
    }
  });

  return fc;
}
