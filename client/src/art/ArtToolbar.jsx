import React, { useEffect, useRef } from 'react';
import { Pencil, PenTool, Droplets, Wind, Eraser, Blend, Pipette, CircleSlash, FlipHorizontal, FlipVertical, PlusSquare, Asterisk, HelpCircle, Trash2 } from 'lucide-react';
import { useArtStore } from './artStore';
import { useUIStore } from '../store/uiStore';
import './ArtToolbar.css';

const BRUSHES = [
  { id: 'pencil', icon: Pencil, key: 'P', label: 'Pencil' },
  { id: 'ink', icon: PenTool, key: 'I', label: 'Ink' },
  { id: 'watercolor', icon: Droplets, key: 'W', label: 'Watercolor' },
  { id: 'charcoal', icon: Wind, key: 'C', label: 'Charcoal' },
  { id: 'eraser', icon: Eraser, key: 'E', label: 'Eraser' },
  { id: 'smudge', icon: Blend, key: 'S', label: 'Smudge' },
  { id: 'eyedropper', icon: Pipette, key: 'Alt', label: 'Eyedropper' },
];

const SYMMETRY_MODES = [
  { id: 'none', icon: CircleSlash, label: 'None' },
  { id: 'horizontal', icon: FlipHorizontal, label: 'Horizontal' },
  { id: 'vertical', icon: FlipVertical, label: 'Vertical' },
  { id: 'both', icon: PlusSquare, label: 'Both' },
  { id: 'radial', icon: Asterisk, label: 'Radial' },
];

export default function ArtToolbar({ artCanvasRef }) {
  const { 
    brushType, setBrushType, 
    brushSize, setBrushSize,
    brushColor,
    symmetryMode, setSymmetryMode,
    symmetryLines, setSymmetryLines,
    undoStroke, redoStroke
  } = useArtStore();
  
  const previousTool = useRef(brushType);

  // Track last non-eyedropper tool for alt-key revert
  const handleSetBrushType = (type) => {
    if (type !== 'eyedropper') previousTool.current = type;
    setBrushType(type);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z') {
          const state = useArtStore.getState();
          if (e.shiftKey) {
            if (state.historyPointer < state.strokeHistory.length - 1) {
              const nextPointer = state.historyPointer + 1;
              artCanvasRef?.current?.applySnapshot(state.strokeHistory[nextPointer]);
              state.redoStroke();
            }
          } else {
            if (state.historyPointer > 0) {
              const prevPointer = state.historyPointer - 1;
              artCanvasRef?.current?.applySnapshot(state.strokeHistory[prevPointer]);
              state.undoStroke();
            }
          }
          e.preventDefault();
        }
        return;
      }

      switch (key) {
        case 'p': handleSetBrushType('pencil'); break;
        case 'i': handleSetBrushType('ink'); break;
        case 'w': handleSetBrushType('watercolor'); break;
        case 'c': handleSetBrushType('charcoal'); break;
        case 'e': handleSetBrushType('eraser'); break;
        case 's': handleSetBrushType('smudge'); break;
        case '[': setBrushSize(Math.max(1, brushSize - 5)); break;
        case ']': setBrushSize(Math.min(100, brushSize + 5)); break;
      }
    };

    const handleAltDown = (e) => {
      if (e.key === 'Alt' && useArtStore.getState().brushType !== 'eyedropper') {
        previousTool.current = useArtStore.getState().brushType;
        setBrushType('eyedropper');
      }
    };

    const handleAltUp = (e) => {
      if (e.key === 'Alt' && useArtStore.getState().brushType === 'eyedropper') {
        setBrushType(previousTool.current || 'pencil');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleAltDown);
    window.addEventListener('keyup', handleAltUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleAltDown);
      window.removeEventListener('keyup', handleAltUp);
    };
  }, [brushSize, redoStroke, setBrushSize, setBrushType, undoStroke]);

  return (
    <div className="art-toolbar">
      {/* ─── BRUSH TOOLS ─── */}
      <div className="toolbar-section">
        {BRUSHES.map(tool => {
          const Icon = tool.icon;
          const isActive = brushType === tool.id;
          return (
            <button
              key={tool.id}
              className={`tool-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleSetBrushType(tool.id)}
            >
              <Icon size={16} />
              <div className="tool-tooltip">
                <span>{tool.label}</span>
                <span className="tool-tooltip-key">{tool.key}</span>
              </div>
            </button>
          );
        })}
      </div>


      <div className="tool-separator" />

      {/* ─── BRUSH SIZE ─── */}
      <div className="toolbar-section size-section">
        <input 
          type="range" 
          className="size-slider"
          orient="vertical"
          min="1" max="100" step="1"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
        />
        <div style={{ marginTop: '8px', position: 'relative', width: '40px', height: '40px', borderRadius: '4px', background: '#e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div 
            className="size-preview" 
            style={{ 
              width: Math.min(40, brushSize) + 'px', 
              height: Math.min(40, brushSize) + 'px',
              backgroundColor: brushType === 'eraser' ? '#ffffff' : brushColor,
              borderRadius: '50%',
              boxShadow: brushType === 'eraser' ? 'inset 0 0 0 1px #ccc' : 'none',
              opacity: brushType === 'watercolor' ? 0.6 : (brushType === 'charcoal' ? 0.8 : 1),
              filter: brushType === 'charcoal' ? 'url(#noise-filter)' : 'none'
            }} 
          />
        </div>
      </div>

      <div className="tool-separator" />

      {/* ─── SYMMETRY ─── */}
      <div className="toolbar-section">
        {SYMMETRY_MODES.map(mode => {
          const Icon = mode.icon;
          const isActive = symmetryMode === mode.id;
          return (
            <button
              key={mode.id}
              className={`tool-btn symmetry-btn ${isActive ? 'active' : ''}`}
              onClick={() => setSymmetryMode(mode.id)}
            >
              <Icon size={14} />
              <div className="tool-tooltip">
                <span>{mode.label} Symmetry</span>
              </div>
            </button>
          );
        })}
        
        {symmetryMode === 'radial' && (
          <div className="radial-lines-input">
            <span style={{fontSize: '9px', color: 'var(--text-hint)'}}>Lines</span>
            <input 
              type="number" 
              min="2" max="16" 
              value={symmetryLines}
              onChange={(e) => setSymmetryLines(parseInt(e.target.value) || 2)}
            />
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <div className="tool-separator" />

      {/* ─── AT BOTTOM ─── */}
      <div className="zoom-display">100%</div>
      <button 
        className="tool-btn" 
        style={{ marginBottom: '8px' }}
        title="Help"
      >
        <HelpCircle size={16} />
      </button>

      <button 
        className="tool-btn danger-btn" 
        style={{ marginBottom: '8px', color: '#ef4444' }}
        title="Clear Canvas"
        onClick={() => {
          if (window.confirm("Clear all layers? This cannot be undone.")) {
            artCanvasRef?.current?.clearCanvas();
            artCanvasRef?.current?.takeSnapshot();
            useUIStore.getState().showToast("Canvas cleared");
          }
        }}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
