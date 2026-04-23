import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import api from '../api';
import SketchCanvas, { CanvasContext } from '../canvas/SketchCanvas';
import { useCanvasStore } from '../store/canvasStore';
import LeftToolbar from '../components/LeftToolbar/LeftToolbar';
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel';

function TopBar({ diagramId, diagramName }) {
  return (
    <div style={{ 
      height: '48px', 
      background: 'var(--bg-surface)', 
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      color: 'var(--text-primary)',
      fontWeight: '500'
    }}>
      {diagramName || 'Loading...'}
    </div>
  );
}

export default function CanvasPage() {
  const { id } = useParams();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const fabricCanvasRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDiagram = async () => {
      try {
        const res = await api.get(`/diagrams/${id}`);
        if (isMounted) {
          setDiagram(res.data);
        }
      } catch (err) {
        console.error('Failed to load diagram', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDiagram();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input or textarea
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

      const { setActiveTool } = useCanvasStore.getState();
      const fc = fabricCanvasRef.current;

      switch (e.key) {
        case 'v': setActiveTool('select'); break;
        case 'r': setActiveTool('rect'); break;
        case 'e': setActiveTool('ellipse'); break;
        case 'd': setActiveTool('diamond'); break;
        case 'a': setActiveTool('arrow'); break;
        case 'l': setActiveTool('line'); break;
        case 'p': setActiveTool('pencil'); break;
        case 't': setActiveTool('text'); break;
        case 'h': setActiveTool('hand'); break;
        case 'Backspace':
        case 'Delete':
          if (fc) {
            const activeObjects = fc.getActiveObjects();
            if (activeObjects.length) {
              activeObjects.forEach(obj => fc.remove(obj));
              fc.discardActiveObject();
              fc.requestRenderAll();
            }
          }
          break;
        case 'a':
        case 'A':
          if ((e.ctrlKey || e.metaKey) && fc) {
            e.preventDefault();
            fc.setActiveObject(new fabric.ActiveSelection(fc.getObjects(), { canvas: fc }));
            fc.requestRenderAll();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-base)'
      }}>
        {/* Simple spinner */}
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  return (
    <CanvasContext.Provider value={fabricCanvasRef}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', position: 'relative' }}>
        <TopBar diagramId={diagram?._id} diagramName={diagram?.name} />
        <PropertiesPanel canvasReady={canvasReady} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <LeftToolbar />
          <SketchCanvas setFabricCanvasRef={(ref) => { 
            fabricCanvasRef.current = ref.current; 
            setCanvasReady(true);
          }} />
        </div>
      </div>
    </CanvasContext.Provider>
  );
}
