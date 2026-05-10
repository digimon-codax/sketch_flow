import React from 'react';
import { PenTool, Brush } from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import './ModeSwitcher.css';

export default function ModeSwitcher() {
  const canvasMode = useCanvasStore((state) => state.canvasMode);
  const setCanvasMode = useCanvasStore((state) => state.setCanvasMode);

  const handleSwitch = (mode) => {
    if (mode === canvasMode) return;
    
    // Unsaved strokes check placeholder
    if (canvasMode === 'art' && mode === 'diagram') {
      if (!window.confirm("Switching modes will not affect your diagram. Continue?")) {
        return;
      }
    }
    
    setCanvasMode(mode);
  };

  return (
    <div className="mode-switcher">
      <button 
        className={`mode-btn ${canvasMode === 'diagram' ? 'active' : ''}`}
        onClick={() => handleSwitch('diagram')}
      >
        <PenTool size={14} />
        Diagram
      </button>
      <button 
        className={`mode-btn ${canvasMode === 'art' ? 'active' : ''}`}
        onClick={() => handleSwitch('art')}
      >
        <Brush size={14} />
        Art
      </button>
    </div>
  );
}
