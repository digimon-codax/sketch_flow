import { fabric } from 'fabric';
import rough from 'roughjs/bin/rough'; // or just 'roughjs' depending on how it's exported

// Ensure we get the generator properly depending on how roughjs is bundled
const gen = (rough.generator ? rough.generator() : rough.default?.generator ? rough.default.generator() : rough.default());

export const ROUGH_DEFAULTS = {
  roughness: 1.2,
  strokeWidth: 1.5,
  stroke: '#f0ede8',
  fill: 'transparent',
  fillStyle: 'hachure',
  hachureGap: 6,
};

// Helper — convert roughjs drawable to SVG path string
function drawableToPath(drawable) {
  let d = '';
  for (const set of drawable.sets) {
    for (const op of set.ops) {
      if (op.op === 'move') d += `M ${op.data[0]} ${op.data[1]} `;
      if (op.op === 'lineTo') d += `L ${op.data[0]} ${op.data[1]} `;
      if (op.op === 'bcurveTo') d += `C ${op.data[0]} ${op.data[1]} ${op.data[2]} ${op.data[3]} ${op.data[4]} ${op.data[5]} `;
    }
  }
  return d.trim();
}

// Helper — create Fabric Path from roughjs drawable
function roughToFabric(drawable, left, top, extraProps = {}) {
  const pathStr = drawableToPath(drawable);
  // We need to normalize the path so bounding boxes are accurate
  const path = new fabric.Path(pathStr, {
    left,
    top,
    selectable: true,
    hasControls: true,
    hasBorders: true,
    id: crypto.randomUUID(),
    stroke: extraProps.stroke ?? '#f0ede8',
    fill: 'transparent',
    strokeWidth: 0, // roughjs handles stroke width within the path's internal strokes usually, but for fabric selection we might need some trick. Actually roughjs paths are fills for the stroke lines.
    ...extraProps,
  });
  
  // Set fill to the stroke color because roughjs paths are closed shapes representing the sketched stroke
  path.set({ fill: extraProps.stroke ?? '#f0ede8', strokeWidth: 0 });
  return path;
}

export function drawRect(fc, x, y, w, h, opts = {}) {
  const drawable = gen.rectangle(0, 0, w, h, { ...ROUGH_DEFAULTS, ...opts });
  const shape = roughToFabric(drawable, x, y, { shapeType: 'rectangle', ...opts });
  fc.add(shape);
  fc.setActiveObject(shape);
  fc.requestRenderAll();
  return shape;
}

export function drawEllipse(fc, cx, cy, rx, ry, opts = {}) {
  // gen.ellipse expects width/height (rx*2, ry*2)
  const drawable = gen.ellipse(rx, ry, rx * 2, ry * 2, { ...ROUGH_DEFAULTS, ...opts });
  const shape = roughToFabric(drawable, cx - rx, cy - ry, { shapeType: 'ellipse', ...opts });
  fc.add(shape);
  fc.setActiveObject(shape);
  fc.requestRenderAll();
  return shape;
}

export function drawDiamond(fc, x, y, w, h, opts = {}) {
  const pts = [[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]];
  const drawable = gen.polygon(pts, { ...ROUGH_DEFAULTS, ...opts });
  const shape = roughToFabric(drawable, x, y, { shapeType: 'diamond', ...opts });
  fc.add(shape);
  fc.setActiveObject(shape);
  fc.requestRenderAll();
  return shape;
}

export function drawArrow(fc, x1, y1, x2, y2, opts = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  // If line is too short, just abort
  if (len < 1) return null;

  const drawableLine = gen.line(0, 0, dx, dy, { ...ROUGH_DEFAULTS, ...opts });
  const pLine = roughToFabric(drawableLine, 0, 0);

  // Arrowhead logic
  const arrowSize = 14;
  const angle = Math.atan2(dy, dx);
  const angle1 = angle + Math.PI / 6;
  const angle2 = angle - Math.PI / 6;

  // We draw the arrowhead starting from (dx, dy)
  const h1x = dx - arrowSize * Math.cos(angle1);
  const h1y = dy - arrowSize * Math.sin(angle1);
  const drawableHead1 = gen.line(dx, dy, h1x, h1y, { ...ROUGH_DEFAULTS, ...opts });
  const pHead1 = roughToFabric(drawableHead1, 0, 0);

  const h2x = dx - arrowSize * Math.cos(angle2);
  const h2y = dy - arrowSize * Math.sin(angle2);
  const drawableHead2 = gen.line(dx, dy, h2x, h2y, { ...ROUGH_DEFAULTS, ...opts });
  const pHead2 = roughToFabric(drawableHead2, 0, 0);

  const group = new fabric.Group([pLine, pHead1, pHead2], {
    left: Math.min(x1, x2, h1x + x1, h2x + x1),
    top: Math.min(y1, y2, h1y + y1, h2y + y1),
    id: crypto.randomUUID(),
    shapeType: 'arrow',
    selectable: true,
  });

  // Because group creation recalculates bounds, we need to correctly position it:
  // For safety, just set left/top to the min x/y of the components
  group.set({ left: Math.min(x1, x2) - arrowSize, top: Math.min(y1, y2) - arrowSize });
  
  fc.add(group);
  fc.setActiveObject(group);
  fc.requestRenderAll();
  return group;
}

export function drawLine(fc, x1, y1, x2, y2, opts = {}) {
  const drawable = gen.line(0, 0, x2 - x1, y2 - y1, { ...ROUGH_DEFAULTS, ...opts });
  const shape = roughToFabric(drawable, Math.min(x1, x2), Math.min(y1, y2), { shapeType: 'line', ...opts });
  fc.add(shape);
  fc.setActiveObject(shape);
  fc.requestRenderAll();
  return shape;
}

export function drawText(fc, x, y) {
  const t = new fabric.IText('', {
    left: x,
    top: y,
    fontFamily: 'Inter',
    fontSize: 18,
    fill: '#f0ede8',
    id: crypto.randomUUID(),
    shapeType: 'text',
    selectable: true,
  });
  fc.add(t);
  fc.setActiveObject(t);
  t.enterEditing();
  t.selectAll();
  return t;
}

export function startFreehand(fc, opts = {}) {
  fc.isDrawingMode = true;
  fc.freeDrawingBrush = new fabric.PencilBrush(fc);
  fc.freeDrawingBrush.color = opts.stroke ?? '#f0ede8';
  fc.freeDrawingBrush.width = opts.strokeWidth ?? 2;

  // We assign a unique handler to avoid duplicate listeners
  if (!fc._freehandCreatedHandler) {
    fc._freehandCreatedHandler = (e) => {
      if (e.path) {
        e.path.set({
          id: crypto.randomUUID(),
          shapeType: 'pencil'
        });
      }
    };
    fc.on('path:created', fc._freehandCreatedHandler);
  }
}

export function endFreehand(fc) {
  fc.isDrawingMode = false;
}
