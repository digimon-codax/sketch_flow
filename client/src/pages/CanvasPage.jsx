import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import api from '../api';
import SketchCanvas, { CanvasContext } from '../canvas/SketchCanvas';
import { useCanvasStore } from '../store/canvasStore';
import LeftToolbar from '../components/LeftToolbar/LeftToolbar';
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel';
import TopBar from '../components/TopBar/TopBar';
import { deserializeCanvas } from '../canvas/serialize';

export default function CanvasPage() {
  const { id } = useParams();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const [saveState, setSaveState] = useState(''); // 'saving' | 'saved' | ''
  const fabricCanvasRef = useRef(null);
  const historyRef = useRef(null); // Will be populated by SketchCanvas

  useEffect(() => {
    let isMounted = true;
    
    const fetchDiagram = async () => {
      try {
        const res = await api.get(`/diagrams/${id}`);
        if (isMounted) {
          setDiagram(res.data);
          // If the diagram has elements, we should deserialize them once the canvas is ready.
          // This will be handled by passing diagram.elements to SketchCanvas.
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
        case 'z':
        case 'Z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              historyRef.current?.redo(els => deserializeCanvas(fc, els));
            } else {
              historyRef.current?.undo(els => deserializeCanvas(fc, els));
            }
          }
          break;
        case 'y':
        case 'Y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            historyRef.current?.redo(els => deserializeCanvas(fc, els));
          }
          break;
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
        <TopBar diagramId={diagram?._id} diagramName={diagram?.name} saveState={saveState} />
        <PropertiesPanel canvasReady={canvasReady} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <LeftToolbar />
          <SketchCanvas 
            diagramId={id}
            initialElements={diagram?.elements}
            setSaveState={setSaveState}
            setHistoryRef={(h) => historyRef.current = h}
            setFabricCanvasRef={(ref) => { 
              fabricCanvasRef.current = ref.current; 
              setCanvasReady(true);
            }} 
          />
        </div>
      </div>
    </CanvasContext.Provider>
  );
}
