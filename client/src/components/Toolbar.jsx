import { useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { cleanupLayout, assistArchitecture } from '../api/aiApi';
import { useUIStore } from '../store/uiStore';

// SVG Icons matching Excalidraw's style exactly
const SelectIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M4 4l6 14 2.5-5.5L18 10 4 4z" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);
const RectIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <rect x="3" y="5" width="14" height="10" rx="1.5" strokeLinejoin="round"/>
  </svg>
);
const DiamondIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M10 2.5L17.5 10 10 17.5 2.5 10 10 2.5z" strokeLinejoin="round"/>
  </svg>
);
const EllipseIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <ellipse cx="10" cy="10" rx="7.5" ry="5.5"/>
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M3 17L17 3M17 3H10M17 3v7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const LineIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M3 17L17 3" strokeLinecap="round"/>
  </svg>
);
const PenIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M14 3l3 3-9 9-4 1 1-4 9-9z" strokeLinejoin="round" strokeLinecap="round"/>
  </svg>
);
const TextIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
    <path d="M3 5h14v2H11v9H9V7H3V5z"/>
  </svg>
);
const HandIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M8 4v8M12 6v6M4 9v3a5 5 0 0010 0V9M4 9a2 2 0 014 0M8 9a2 2 0 014 0" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const EraserIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
    <path d="M15 4L4 15l3 3 11-11-3-3z" strokeLinejoin="round"/>
    <path d="M4 15l3 3H17" strokeLinecap="round"/>
  </svg>
);

const TOOLS = [
  { id: 'select', label: 'Select', shortcut: 'V', icon: SelectIcon },
  { id: 'hand',   label: 'Hand',   shortcut: 'H', icon: HandIcon },
];

const SHAPE_TOOLS = [
  { id: 'rect',    label: 'Rectangle', shortcut: 'R', icon: RectIcon },
  { id: 'diamond', label: 'Diamond',   shortcut: 'D', icon: DiamondIcon },
  { id: 'circle',  label: 'Ellipse',   shortcut: 'E', icon: EllipseIcon },
  { id: 'arrow',   label: 'Arrow',     shortcut: 'A', icon: ArrowIcon },
  { id: 'line',    label: 'Line',      shortcut: 'L', icon: LineIcon },
  { id: 'pen',     label: 'Draw',      shortcut: 'P', icon: PenIcon },
  { id: 'text',    label: 'Text',      shortcut: 'T', icon: TextIcon },
  { id: 'eraser',  label: 'Eraser',    shortcut: 'E', icon: EraserIcon },
];

const ToolButton = ({ tool, active, onClick }) => (
  <button
    title={`${tool.label} (${tool.shortcut})`}
    onClick={() => onClick(tool.id)}
    style={{
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 8,
      border: 'none',
      cursor: 'pointer',
      background: active ? '#e8e7ff' : 'transparent',
      color: active ? '#5753d4' : '#3d3d3d',
      transition: 'background 0.1s, color 0.1s',
      position: 'relative',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f1f0ff'; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
  >
    <tool.icon />
  </button>
);

const Divider = () => (
  <div style={{ width: 1, height: 24, background: '#e3e2fe', margin: '0 4px', flexShrink: 0 }} />
);

export const Toolbar = ({ canvas, activeTool, setActiveTool }) => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const setAiAnalysisResult = useUIStore((state) => state.setAiAnalysisResult);

  const handleToolSelect = useCallback((toolId) => {
    if (!canvas) return;
    setActiveTool(toolId);

    // Reset canvas mode
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.defaultCursor = 'default';

    if (toolId === 'pen') {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush.width = 2;
      canvas.freeDrawingBrush.color = '#1e1e1e';
    } else if (toolId === 'hand') {
      canvas.defaultCursor = 'grab';
      canvas.selection = false;
    } else if (toolId === 'eraser') {
      canvas.defaultCursor = 'crosshair';
    } else if (toolId !== 'select') {
      // Shape tools — next click on canvas will add a shape
      canvas.defaultCursor = 'crosshair';
      canvas.selection = false;
    }
  }, [canvas, setActiveTool]);

  const addShape = useCallback((type) => {
    if (!canvas) return;
    const center = canvas.getVpCenter();
    const offset = () => (Math.random() * 60 - 30);

    const commonProps = {
      left: center.x + offset(),
      top:  center.y + offset(),
      fill: 'transparent',
      stroke: '#1e1e1e',
      strokeWidth: 2,
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
      originX: 'center',
      originY: 'center',
    };

    let shape;
    if (type === 'rect') {
      shape = new fabric.Rect({ ...commonProps, width: 160, height: 100, rx: 8, ry: 8 });
    } else if (type === 'diamond') {
      const pts = [
        { x: 0, y: -55 }, { x: 80, y: 0 },
        { x: 0, y: 55 }, { x: -80, y: 0 },
      ];
      shape = new fabric.Polygon(pts, { ...commonProps });
    } else if (type === 'circle') {
      shape = new fabric.Ellipse({ ...commonProps, rx: 70, ry: 45 });
    } else if (type === 'arrow') {
      const cx = center.x + offset();
      const cy = center.y + offset();
      shape = new fabric.Line([cx - 60, cy, cx + 60, cy], {
        ...commonProps, left: undefined, top: undefined,
        stroke: '#1e1e1e', strokeWidth: 2,
      });
    } else if (type === 'line') {
      const cx = center.x + offset();
      const cy = center.y + offset();
      shape = new fabric.Line([cx - 60, cy, cx + 60, cy], {
        ...commonProps, left: undefined, top: undefined,
      });
    } else if (type === 'text') {
      shape = new fabric.IText('Text', {
        left: center.x + offset(),
        top: center.y + offset(),
        fontFamily: 'Segoe UI, sans-serif',
        fontSize: 20,
        fill: '#1e1e1e',
        originX: 'center',
        originY: 'center',
      });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
      if (type === 'text') shape.enterEditing();
    }
    // Return to select after placing
    handleToolSelect('select');
  }, [canvas, handleToolSelect]);

  // Wire canvas mouse:down to place shapes for shape tools
  const handleCanvasClick = useCallback((toolId) => {
    if (['rect','diamond','circle','arrow','line','text'].includes(toolId)) {
      addShape(toolId);
    }
  }, [addShape]);

  // Connect tool click → shape placement for non-select tools
  const onToolClick = (toolId) => {
    handleToolSelect(toolId);
    // For shape tools, immediately add at center
    if (['rect','diamond','circle','arrow','line','text'].includes(toolId)) {
      addShape(toolId);
    }
  };

  const handleCleanUp = async () => {
    if (!canvas || isCleaning) return;
    const objectsToLayout = canvas.getObjects().filter(o => o.id && !o.excludeFromExport);
    if (objectsToLayout.length === 0) return;

    setIsCleaning(true);
    try {
      const objectsJSON = objectsToLayout.map(o => ({
        id: o.id, type: o.type,
        left: o.left, top: o.top,
        width: o.width, height: o.height,
      }));

      const { layout } = await cleanupLayout(objectsJSON);
      if (!layout || !Array.isArray(layout)) throw new Error('Invalid layout');

      const DURATION = 600;
      const start = performance.now();
      const initial = {};
      layout.forEach(({ id, left, top }) => {
        const obj = canvas.getObjects().find(o => o.id === id);
        if (obj) initial[id] = { fromLeft: obj.left, fromTop: obj.top, toLeft: left, toTop: top };
      });

      const ease = (t) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

      const animFrame = (now) => {
        const t = ease(Math.min((now - start) / DURATION, 1));
        layout.forEach(({ id }) => {
          const obj = canvas.getObjects().find(o => o.id === id);
          const p = initial[id];
          if (!obj || !p) return;
          obj.set({ left: p.fromLeft + (p.toLeft - p.fromLeft) * t, top: p.fromTop + (p.toTop - p.fromTop) * t });
          obj.setCoords();
        });
        canvas.requestRenderAll();
        if (t < 1) requestAnimationFrame(animFrame);
        else { canvas.fire('object:modified'); setIsCleaning(false); }
      };
      requestAnimationFrame(animFrame);
    } catch (err) {
      console.error('[CleanUp]', err);
      setIsCleaning(false);
    }
  };

  const handleAnalyze = async () => {
    if (!canvas || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const imageBase64 = canvas.toDataURL('image/png');
      const objectsJSON = canvas.toJSON(['id']).objects;
      const result = await assistArchitecture(imageBase64, objectsJSON);
      setAiAnalysisResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAiAnalysisResult({ error: 'Analysis failed. Add your Anthropic API key to .env' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toolbarStyle = {
    position: 'absolute',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    background: '#fff',
    border: '1px solid #e3e2fe',
    borderRadius: 12,
    padding: '6px 8px',
    boxShadow: '0 2px 12px rgba(87,83,212,0.10), 0 1px 3px rgba(0,0,0,0.06)',
    userSelect: 'none',
    flexWrap: 'nowrap',
  };

  const allTools = [...TOOLS, ...SHAPE_TOOLS];

  return (
    <div style={toolbarStyle}>
      {/* Standard tools */}
      {TOOLS.map(tool => (
        <ToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={onToolClick} />
      ))}

      <Divider />

      {/* Shape / draw tools */}
      {SHAPE_TOOLS.map(tool => (
        <ToolButton key={tool.id} tool={tool} active={activeTool === tool.id} onClick={onToolClick} />
      ))}

      <Divider />

      {/* SketchFlow Unique Features */}
      <button
        onClick={handleCleanUp}
        disabled={isCleaning}
        title="AI-powered layout cleanup (SketchFlow exclusive)"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, border: '1px solid #e3e2fe',
          background: isCleaning ? '#f1f0ff' : '#f8f7ff',
          color: '#5753d4', fontWeight: 600, fontSize: 13,
          cursor: isCleaning ? 'wait' : 'pointer',
          whiteSpace: 'nowrap', transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (!isCleaning) e.currentTarget.style.background = '#e8e7ff'; }}
        onMouseLeave={e => { if (!isCleaning) e.currentTarget.style.background = '#f8f7ff'; }}
      >
        <span style={{ fontSize: 15 }} className={isCleaning ? 'animate-spin inline-block' : ''}>✨</span>
        {isCleaning ? 'Cleaning…' : 'Clean Up'}
      </button>

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        title="Claude AI architecture analysis (SketchFlow exclusive)"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', borderRadius: 8, border: 'none',
          background: isAnalyzing ? '#4340b0' : '#5753d4',
          color: '#fff', fontWeight: 700, fontSize: 13,
          cursor: isAnalyzing ? 'wait' : 'pointer',
          whiteSpace: 'nowrap', transition: 'background 0.15s',
          boxShadow: '0 2px 8px rgba(87,83,212,0.30)',
        }}
        onMouseEnter={e => { if (!isAnalyzing) e.currentTarget.style.background = '#4340b0'; }}
        onMouseLeave={e => { if (!isAnalyzing) e.currentTarget.style.background = '#5753d4'; }}
      >
        <span style={{ fontSize: 15 }} className={isAnalyzing ? 'animate-pulse inline-block' : ''}>🧠</span>
        {isAnalyzing ? 'Analyzing…' : 'Arch Assist'}
      </button>
    </div>
  );
};
