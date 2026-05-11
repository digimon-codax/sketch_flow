import React, { useState } from 'react';
import ColorPanel from './ColorPanel';
import LayersPanel from './LayersPanel';

export default function ArtRightPanel({ artCanvasRef }) {
  const [activeTab, setActiveTab] = useState('color');

  return (
    <div className="right-panel">
      <div className="right-panel-tabs">
        <button 
          className={`right-panel-tab ${activeTab === 'color' ? 'active' : ''}`}
          onClick={() => setActiveTab('color')}
        >
          🎨 Color
        </button>
        <button 
          className={`right-panel-tab ${activeTab === 'layers' ? 'active' : ''}`}
          onClick={() => setActiveTab('layers')}
        >
          ☰ Layers
        </button>
      </div>
      <div className="right-panel-content">
        {activeTab === 'color' && <ColorPanel />}
        {activeTab === 'layers' && <LayersPanel artCanvasRef={artCanvasRef} />}
      </div>
    </div>
  );
}
