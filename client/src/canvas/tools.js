import { fabric } from 'fabric';
import rough from 'roughjs';

// Ensure we get the generator properly depending on how roughjs is bundled
const gen = (rough.generator ? rough.generator() : rough.default?.generator ? rough.default.generator() : rough.default());

export const ROUGH_DEFAULTS = {
  roughness: 1.2,
  strokeWidth: 1.5,
  stroke: '#f0ede8',
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
    fill: extraProps.fill && extraProps.fill !== 'transparent' ? extraProps.fill : 'transparent',
    strokeWidth: extraProps.strokeWidth || 1.5,
    ...extraProps,
  });
  
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

// --- CURVE CONTROLS LOGIC ---

function getArrowhead(p1, p2) {
  const arrowSize = 18;
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const angle1 = angle + Math.PI / 6;
  const angle2 = angle - Math.PI / 6;

  const h1x = p2.x - arrowSize * Math.cos(angle1);
  const h1y = p2.y - arrowSize * Math.sin(angle1);
  const h2x = p2.x - arrowSize * Math.cos(angle2);
  const h2y = p2.y - arrowSize * Math.sin(angle2);
  
  return [ {x: h1x, y: h1y}, {x: h2x, y: h2y} ];
}

function generateCurvePathStr(props) {
  const { p1, p2, cp, isArrow, opts } = props;
  const svgPath = `M ${p1.x} ${p1.y} Q ${cp.x} ${cp.y} ${p2.x} ${p2.y}`;
  const drawable = gen.path(svgPath, { ...ROUGH_DEFAULTS, ...opts });
  let pathStr = drawableToPath(drawable);

  if (isArrow) {
    const hds = getArrowhead(cp, p2);
    const d1 = gen.line(p2.x, p2.y, hds[0].x, hds[0].y, { ...ROUGH_DEFAULTS, ...opts });
    const d2 = gen.line(p2.x, p2.y, hds[1].x, hds[1].y, { ...ROUGH_DEFAULTS, ...opts });
    pathStr += ' ' + drawableToPath(d1) + ' ' + drawableToPath(d2);
  }

  return pathStr;
}

function updateCurveShape(shape) {
  const pathStr = generateCurvePathStr(shape.customProps);
  const tempPath = new fabric.Path(pathStr);
  shape.set({ 
    path: tempPath.path, 
    left: tempPath.left, 
    top: tempPath.top, 
    width: tempPath.width, 
    height: tempPath.height,
    pathOffset: tempPath.pathOffset
  });
  shape.customProps.lastLeft = tempPath.left;
  shape.customProps.lastTop = tempPath.top;
  shape.setCoords();
}

function makeControl(pointName, color) {
  return new fabric.Control({
    positionHandler: function(dim, finalMatrix, fabricObject) {
      const pt = fabricObject.customProps[pointName];
      return { x: pt.x, y: pt.y };
    },
    actionHandler: function(eventData, transform, x, y) {
      const target = transform.target;
      target.customProps[pointName] = { x, y };
      updateCurveShape(target);
      return true;
    },
    cursorStyle: 'pointer',
    render: function(ctx, left, top, styleOverride, fabricObject) {
      ctx.save();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(left, top, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }
  });
}

function setupCurveControls(shape) {
  shape.controls = {
    p1: makeControl('p1', '#3498db'),
    cp: makeControl('cp', '#d4a853'),
    p2: makeControl('p2', '#3498db')
  };
  shape.hasBorders = false;
  shape.customProps.lastLeft = shape.left;
  shape.customProps.lastTop = shape.top;
  
  shape.on('moving', () => {
    const dx = shape.left - shape.customProps.lastLeft;
    const dy = shape.top - shape.customProps.lastTop;
    shape.customProps.p1.x += dx;
    shape.customProps.p1.y += dy;
    shape.customProps.p2.x += dx;
    shape.customProps.p2.y += dy;
    shape.customProps.cp.x += dx;
    shape.customProps.cp.y += dy;
    shape.customProps.lastLeft = shape.left;
    shape.customProps.lastTop = shape.top;
  });
}

// --- CURVED DRAWING TOOLS ---

export function drawArrow(fc, x1, y1, x2, y2, opts = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.sqrt(dx * dx + dy * dy) < 1) return null;

  const cp = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  const customProps = { p1: {x: x1, y: y1}, p2: {x: x2, y: y2}, cp, isArrow: true, opts };
  
  const pathStr = generateCurvePathStr(customProps);
  const shape = new fabric.Path(pathStr, {
    fill: 'transparent',
    stroke: opts.stroke ?? '#f0ede8',
    strokeWidth: opts.strokeWidth || 1.5,
    id: crypto.randomUUID(),
    shapeType: 'arrow',
    selectable: true,
    hasControls: true,
    ...opts,
    customProps
  });

  setupCurveControls(shape);
  
  fc.add(shape);
  fc.setActiveObject(shape);
  fc.requestRenderAll();
  return shape;
}

export function drawLine(fc, x1, y1, x2, y2, opts = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.sqrt(dx * dx + dy * dy) < 1) return null;

  const cp = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  const customProps = { p1: {x: x1, y: y1}, p2: {x: x2, y: y2}, cp, isArrow: false, opts };
  
  const pathStr = generateCurvePathStr(customProps);
  const shape = new fabric.Path(pathStr, {
    fill: 'transparent',
    stroke: opts.stroke ?? '#f0ede8',
    strokeWidth: opts.strokeWidth || 1.5,
    id: crypto.randomUUID(),
    shapeType: 'line',
    selectable: true,
    hasControls: true,
    ...opts,
    customProps
  });

  setupCurveControls(shape);
  
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
