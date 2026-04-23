import { fabric } from 'fabric';
import { setupCurveControls } from './tools';

export function serializeCanvas(fc) {
  return fc.getObjects()
    .filter(obj => obj.id && obj.shapeType)
    .map(obj => {
      // Get the absolute path string if it's a Path
      let pathData = null;
      if (obj.type === 'path') {
        // fabric obj.path is an array of arrays: [["M", 0, 0], ["L", 100, 100]]
        // We can just store this array directly, or store obj.toJSON().path
        pathData = obj.get('path');
      }

      return {
        id: obj.id,
        type: obj.shapeType,
        left: obj.left,
        top: obj.top,
        width: obj.width,
        height: obj.height,
        scaleX: obj.scaleX ?? 1,
        scaleY: obj.scaleY ?? 1,
        angle: obj.angle ?? 0,
        
        text: obj.text ?? '',
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
        
        stroke: obj.stroke ?? '#f0ede8',
        fill: obj.fill ?? 'transparent',
        strokeWidth: obj.strokeWidth ?? 1.5,
        strokeDashArray: obj.strokeDashArray ?? null,
        opacity: obj.opacity ?? 1,
        
        pathData: pathData,
        pathOffset: obj.pathOffset,
        customProps: obj.customProps ? JSON.parse(JSON.stringify(obj.customProps)) : null,
      };
    });
}

export function deserializeCanvas(fc, elements) {
  // Remove all user-drawn objects (keep grid if any)
  const toRemove = fc.getObjects().filter(o => o.id && o.shapeType);
  toRemove.forEach(o => fc.remove(o));

  // Recreate each element
  elements.forEach(el => {
    let obj = null;

    const commonOpts = {
      id: el.id,
      shapeType: el.type,
      left: el.left,
      top: el.top,
      width: el.width,
      height: el.height,
      scaleX: el.scaleX,
      scaleY: el.scaleY,
      angle: el.angle,
      stroke: el.stroke,
      fill: el.fill,
      strokeWidth: el.strokeWidth,
      strokeDashArray: el.strokeDashArray,
      opacity: el.opacity,
      selectable: true,
      hasControls: true,
      hasBorders: true,
    };

    if (el.type === 'text') {
      obj = new fabric.IText(el.text, {
        ...commonOpts,
        fontSize: el.fontSize || 24,
        fontFamily: el.fontFamily || 'Inter',
        fill: el.fill === 'transparent' ? el.stroke : el.fill,
        strokeWidth: 0,
      });
      // Text has no borders by default in our engine
      obj.set({ hasBorders: true });
    } else if (el.pathData) {
      // It's a shape drawn via roughjs -> fabric.Path
      obj = new fabric.Path(el.pathData, {
        ...commonOpts,
        pathOffset: el.pathOffset,
      });
      
      // If it's a curve (line/arrow), restore customProps and controls
      if ((el.type === 'line' || el.type === 'arrow') && el.customProps) {
        obj.customProps = el.customProps;
        setupCurveControls(obj);
      }
    }

    if (obj) {
      fc.add(obj);
    }
  });

  fc.requestRenderAll();
}
