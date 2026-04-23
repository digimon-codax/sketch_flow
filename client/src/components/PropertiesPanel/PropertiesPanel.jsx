import React, { useEffect, useState, useContext } from 'react';
import { CanvasContext } from '../../canvas/SketchCanvas';
import './PropertiesPanel.css';

const PRESET_COLORS = ['#f0ede8', '#d4a853', '#c0392b', '#27ae60', '#3498db', '#9b59b6'];

export default function PropertiesPanel({ canvasReady }) {
  const fabricCanvasRef = useContext(CanvasContext);
  const [activeObj, setActiveObj] = useState(null);
  
  // Local state for properties
  const [stroke, setStroke] = useState('#f0ede8');
  const [fill, setFill] = useState('transparent');
  const [strokeWidth, setStrokeWidth] = useState(1.5);
  const [strokeStyle, setStrokeStyle] = useState('solid'); // 'solid', 'dashed', 'dotted'
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!canvasReady || !fabricCanvasRef || !fabricCanvasRef.current) return;
    const fc = fabricCanvasRef.current;

    const handleSelection = () => {
      const activeObjects = fc.getActiveObjects();
      if (activeObjects.length === 1) {
        const obj = activeObjects[0];
        setActiveObj(obj);
        
        // Populate values
        setStroke(obj.stroke || '#f0ede8');
        setFill(obj.fill || 'transparent');
        setStrokeWidth(obj.strokeWidth || 1.5);
        setOpacity(obj.opacity ?? 1);
        
        if (!obj.strokeDashArray || obj.strokeDashArray.length === 0) {
          setStrokeStyle('solid');
        } else if (obj.strokeDashArray[0] === 8) {
          setStrokeStyle('dashed');
        } else if (obj.strokeDashArray[0] === 2) {
          setStrokeStyle('dotted');
        }
      } else {
        setActiveObj(null);
      }
    };

    handleSelection();

    fc.on('selection:created', handleSelection);
    fc.on('selection:updated', handleSelection);
    fc.on('selection:cleared', () => setActiveObj(null));

    return () => {
      fc.off('selection:created', handleSelection);
      fc.off('selection:updated', handleSelection);
      fc.off('selection:cleared', () => setActiveObj(null));
    };
  }, [canvasReady, fabricCanvasRef]);

  if (!activeObj) return null;

  const updateObject = (key, value) => {
    if (!fabricCanvasRef.current || !activeObj) return;
    const fc = fabricCanvasRef.current;
    
    activeObj.set(key, value);
    fc.requestRenderAll();
  };

  const handleStrokeChange = (color) => {
    setStroke(color);
    updateObject('stroke', color);
  };

  const handleFillChange = (color) => {
    setFill(color);
    updateObject('fill', color);
  };

  const handleWidthChange = (w) => {
    setStrokeWidth(w);
    updateObject('strokeWidth', w);
  };

  const handleStyleChange = (style) => {
    setStrokeStyle(style);
    let dashArray = [];
    if (style === 'dashed') dashArray = [8, 4];
    if (style === 'dotted') dashArray = [2, 4];
    updateObject('strokeDashArray', dashArray);
  };

  const handleOpacityChange = (e) => {
    const val = parseInt(e.target.value, 10) / 100;
    setOpacity(val);
    updateObject('opacity', val);
  };

  return (
    <div className="props-panel-wrapper">
      <div className="props-panel">
        
        {/* Stroke Section */}
        <div className="props-section">
          <span className="props-label">Stroke</span>
          <div className="props-section-row">
            {PRESET_COLORS.map(c => (
              <div 
                key={c} 
                className={`color-circle ${stroke === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => handleStrokeChange(c)}
              />
            ))}
            <div className="color-input-wrapper">
              <input 
                type="color" 
                value={stroke !== 'transparent' ? stroke : '#ffffff'} 
                onChange={(e) => handleStrokeChange(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="props-divider" />

        {/* Fill Section */}
        <div className="props-section">
          <span className="props-label">Fill</span>
          <div className="props-section-row">
            <div 
              className={`color-circle none ${fill === 'transparent' ? 'active' : ''}`}
              onClick={() => handleFillChange('transparent')}
              title="None"
            />
            {PRESET_COLORS.map(c => (
              <div 
                key={c} 
                className={`color-circle ${fill === c ? 'active' : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => handleFillChange(c)}
              />
            ))}
            <div className="color-input-wrapper">
              <input 
                type="color" 
                value={fill !== 'transparent' ? fill : '#ffffff'} 
                onChange={(e) => handleFillChange(e.target.value)} 
              />
            </div>
          </div>
        </div>

        <div className="props-divider" />

        {/* Stroke Width Section */}
        <div className="props-section-row">
          <button className={`toggle-btn ${strokeWidth === 1.5 ? 'active' : ''}`} onClick={() => handleWidthChange(1.5)} title="Thin">
            <div style={{ width: '16px', height: '1px', background: 'currentColor' }} />
          </button>
          <button className={`toggle-btn ${strokeWidth === 3 ? 'active' : ''}`} onClick={() => handleWidthChange(3)} title="Mid">
            <div style={{ width: '16px', height: '2px', background: 'currentColor' }} />
          </button>
          <button className={`toggle-btn ${strokeWidth === 5 ? 'active' : ''}`} onClick={() => handleWidthChange(5)} title="Thick">
            <div style={{ width: '16px', height: '4px', background: 'currentColor' }} />
          </button>
        </div>

        <div className="props-divider" />

        {/* Stroke Style Section */}
        <div className="props-section-row">
          <button className={`toggle-btn ${strokeStyle === 'solid' ? 'active' : ''}`} onClick={() => handleStyleChange('solid')} title="Solid">
            <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="2" /></svg>
          </button>
          <button className={`toggle-btn ${strokeStyle === 'dashed' ? 'active' : ''}`} onClick={() => handleStyleChange('dashed')} title="Dashed">
            <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" /></svg>
          </button>
          <button className={`toggle-btn ${strokeStyle === 'dotted' ? 'active' : ''}`} onClick={() => handleStyleChange('dotted')} title="Dotted">
            <svg width="20" height="4" viewBox="0 0 20 4"><line x1="0" y1="2" x2="20" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="1 3" strokeLinecap="round" /></svg>
          </button>
        </div>

        <div className="props-divider" />

        {/* Opacity Section */}
        <div className="props-section">
          <span className="props-label">Opacity</span>
          <div className="opacity-slider">
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={Math.round(opacity * 100)} 
              onChange={handleOpacityChange} 
            />
            <span className="opacity-value">{Math.round(opacity * 100)}%</span>
          </div>
        </div>

      </div>
    </div>
  );
}
