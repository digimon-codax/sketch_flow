import React, { useEffect, useState, useContext } from 'react';
import { CanvasContext } from '../../canvas/SketchCanvas';
import { Trash2 } from 'lucide-react';
import './PropertiesPanel.css';

const PRESET_COLORS = ['#f0ede8', '#d4a853', '#c0392b', '#27ae60', '#3498db', '#9b59b6'];

export default function PropertiesPanel() {
  const fabricCanvasRef = useContext(CanvasContext);
  const [showProps, setShowProps] = useState(false);
  const [activeObj, setActiveObj] = useState(null);

  const [stroke, setStroke] = useState('#f0ede8');
  const [fill, setFill] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [strokeStyle, setStrokeStyle] = useState('solid');
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    if (!fabricCanvasRef || !fabricCanvasRef.current) return;
    const fc = fabricCanvasRef.current;

    const handleSelection = () => {
      const activeObjects = fc.getActiveObjects();
      if (activeObjects.length > 0) {
        setShowProps(true);
        const obj = activeObjects[0];
        setActiveObj(obj);

        setStroke(obj.customStroke ?? obj.stroke ?? '#f0ede8');
        setFill(obj.customFill ?? obj.fill ?? 'transparent');
        setStrokeWidth(obj.strokeWidth ?? 1.5);
        setStrokeStyle(obj.customStrokeStyle ?? 'solid');
        setOpacity(Math.round((obj.opacity ?? 1) * 100));
        setFontSize(obj.fontSize ?? 16);
      } else {
        setShowProps(false);
        setActiveObj(null);
      }
    };

    fc.on('selection:created', handleSelection);
    fc.on('selection:updated', handleSelection);
    fc.on('selection:cleared', handleSelection);

    return () => {
      fc.off('selection:created', handleSelection);
      fc.off('selection:updated', handleSelection);
      fc.off('selection:cleared', handleSelection);
    };
  }, [fabricCanvasRef]);

  if (!showProps) return null;

  const updateSelection = (updates) => {
    if (!fabricCanvasRef || !fabricCanvasRef.current) return;
    const fc = fabricCanvasRef.current;
    const activeObjects = fc.getActiveObjects();
    
    activeObjects.forEach(obj => {
      if (updates.stroke !== undefined) {
        if (obj.type === 'i-text' || obj.shapeType === 'text') {
          obj.set({ fill: updates.stroke });
        } else {
          obj.customStroke = updates.stroke;
          obj.set({ stroke: updates.stroke });
        }
      }
      if (updates.fill !== undefined) {
        obj.customFill = updates.fill;
        obj.set({ fill: updates.fill });
      }
      if (updates.strokeWidth !== undefined) {
        obj.set({ strokeWidth: updates.strokeWidth });
      }
      if (updates.strokeDashArray !== undefined) {
        obj.set({ strokeDashArray: updates.strokeDashArray });
      }
      if (updates.customStrokeStyle !== undefined) {
        obj.customStrokeStyle = updates.customStrokeStyle;
      }
      if (updates.opacity !== undefined) {
        obj.set({ opacity: updates.opacity });
      }
      if (updates.fontSize !== undefined) {
        obj.set({ fontSize: updates.fontSize });
      }
    });
    fc.requestRenderAll();
    fc.fire('object:modified'); // Trigger history snapshot
  };

  const handleStroke = (color) => {
    setStroke(color);
    updateSelection({ stroke: color });
  };

  const handleFill = (color) => {
    setFill(color);
    updateSelection({ fill: color });
  };

  const handleWidth = (w) => {
    setStrokeWidth(w);
    updateSelection({ strokeWidth: w });
  };

  const handleStyle = (style) => {
    setStrokeStyle(style);
    if (style === 'solid') updateSelection({ strokeDashArray: [], customStrokeStyle: 'solid' });
    else if (style === 'dashed') updateSelection({ strokeDashArray: [8, 4], customStrokeStyle: 'dashed' });
    else if (style === 'dotted') updateSelection({ strokeDashArray: [2, 4], customStrokeStyle: 'dotted' });
  };

  const handleOpacity = (e) => {
    const v = parseInt(e.target.value);
    setOpacity(v);
    updateSelection({ opacity: v / 100 });
  };

  const handleFontSize = (e) => {
    const v = parseInt(e.target.value);
    setFontSize(v);
    updateSelection({ fontSize: v });
  };

  const handleDelete = () => {
    if (!fabricCanvasRef || !fabricCanvasRef.current) return;
    const fc = fabricCanvasRef.current;
    fc.getActiveObjects().forEach(o => fc.remove(o));
    fc.discardActiveObject();
    fc.requestRenderAll();
    fc.fire('object:modified');
  };

  const isText = activeObj && (activeObj.type === 'i-text' || activeObj.shapeType === 'text');

  return (
    <div className="props-panel">
      <div className="props-section">
        <span className="props-label">STROKE COLOR</span>
        <div className="props-row">
          {PRESET_COLORS.map(c => (
            <div 
              key={c}
              className={`color-circle ${stroke === c ? 'active' : ''}`}
              style={{ background: c, color: c }}
              onClick={() => handleStroke(c)}
            />
          ))}
          <input 
            type="color" 
            className="color-input"
            value={stroke && stroke !== 'transparent' ? stroke : '#f0ede8'}
            onChange={e => handleStroke(e.target.value)}
          />
        </div>
      </div>

      <div className="props-section">
        <span className="props-label">FILL COLOR</span>
        <div className="props-row">
          <div 
            className={`color-circle none ${fill === 'transparent' ? 'active' : ''}`}
            style={{ color: 'transparent' }}
            onClick={() => handleFill('transparent')}
          />
          {PRESET_COLORS.map(c => (
            <div 
              key={c}
              className={`color-circle ${fill === c ? 'active' : ''}`}
              style={{ background: c, color: c }}
              onClick={() => handleFill(c)}
            />
          ))}
          <input 
            type="color" 
            className="color-input"
            value={fill && fill !== 'transparent' ? fill : '#ffffff'}
            onChange={e => handleFill(e.target.value)}
          />
        </div>
      </div>

      <div className="props-section">
        <span className="props-label">STROKE WIDTH</span>
        <div className="props-row">
          <button className={`stroke-width-btn ${strokeWidth === 1 ? 'active' : ''}`} onClick={() => handleWidth(1)}>
            <div style={{ width: '16px', height: '1px', background: 'currentColor' }} />
          </button>
          <button className={`stroke-width-btn ${strokeWidth === 2 ? 'active' : ''}`} onClick={() => handleWidth(2)}>
            <div style={{ width: '16px', height: '2px', background: 'currentColor' }} />
          </button>
          <button className={`stroke-width-btn ${strokeWidth === 3.5 ? 'active' : ''}`} onClick={() => handleWidth(3.5)}>
            <div style={{ width: '16px', height: '3.5px', background: 'currentColor' }} />
          </button>
        </div>
      </div>

      <div className="props-section">
        <span className="props-label">STROKE STYLE</span>
        <div className="props-row">
          <button className={`stroke-style-btn ${strokeStyle === 'solid' ? 'active' : ''}`} onClick={() => handleStyle('solid')}>
             <div style={{ width: '16px', height: '1px', background: 'currentColor' }} />
          </button>
          <button className={`stroke-style-btn ${strokeStyle === 'dashed' ? 'active' : ''}`} onClick={() => handleStyle('dashed')}>
             <div style={{ width: '16px', borderBottom: '1px dashed currentColor' }} />
          </button>
          <button className={`stroke-style-btn ${strokeStyle === 'dotted' ? 'active' : ''}`} onClick={() => handleStyle('dotted')}>
             <div style={{ width: '16px', borderBottom: '1px dotted currentColor' }} />
          </button>
        </div>
      </div>

      <div className="props-section">
        <span className="props-label">OPACITY</span>
        <div className="props-row">
          <input type="range" className="opacity-slider" min="0" max="100" step="1" value={opacity} onChange={handleOpacity} />
          <span className="opacity-value">{opacity}%</span>
        </div>
      </div>

      {isText && (
        <div className="props-section">
          <span className="props-label">FONT SIZE</span>
          <div className="props-row">
            <select className="font-size-select" value={fontSize} onChange={handleFontSize}>
              {[12, 14, 16, 18, 24, 32, 48].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <button className="delete-btn" onClick={handleDelete}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}
