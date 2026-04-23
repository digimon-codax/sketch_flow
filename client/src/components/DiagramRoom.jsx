import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCanvasEngine } from '../canvas/useCanvasEngine';
import { useCanvasTools } from '../canvas/useCanvasTools';
import { useDiagramStore } from '../store/diagramStore';
import { useUIStore } from '../store/uiStore';
import { getDiagram } from '../api/diagramsApi';
import { CanvasViewport } from '../canvas/CanvasViewport';
import { Toolbar } from './Toolbar';
import { ContextPanel } from './ContextPanel';
import { AIOverlay } from './AIOverlay';
import { CursorOverlay } from './CursorOverlay';
import { UserAvatarStack } from './UserAvatarStack';

// Zoom controls — bottom-left like Excalidraw
const ZoomControls = ({ canvas }) => {
  const [zoom, setZoom] = useState(100);

  const changeZoom = (delta) => {
    if (!canvas) return;
    let z = canvas.getZoom();
    z = Math.min(20, Math.max(0.1, z + delta));
    const center = canvas.getCenterPoint();
    canvas.zoomToPoint(center, z);
    setZoom(Math.round(z * 100));
  };

  const resetZoom = () => {
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.setViewportTransform([1,0,0,1,0,0]);
    setZoom(100);
  };

  return (
    <div style={{
      position: 'absolute', bottom: 20, left: 20, zIndex: 20,
      display: 'flex', alignItems: 'center', gap: 2,
      background: '#fff', border: '1px solid #e3e2fe', borderRadius: 10,
      padding: '4px 6px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      userSelect: 'none',
    }}>
      <button onClick={() => changeZoom(-0.1)} style={btnStyle} title="Zoom out (Ctrl+-)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3d3d3d" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="8" x2="13" y2="8"/>
        </svg>
      </button>
      <button onClick={resetZoom} style={{ ...btnStyle, minWidth: 52, fontSize: 12, fontWeight: 600, color: '#3d3d3d' }}>
        {zoom}%
      </button>
      <button onClick={() => changeZoom(0.1)} style={btnStyle} title="Zoom in (Ctrl++)">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#3d3d3d" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="3" x2="8" y2="13"/><line x1="3" y1="8" x2="13" y2="8"/>
        </svg>
      </button>
    </div>
  );
};

const btnStyle = {
  width: 32, height: 32, border: 'none', background: 'transparent',
  borderRadius: 7, cursor: 'pointer', display: 'flex',
  alignItems: 'center', justifyContent: 'center',
};

export const DiagramRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTool, setActiveTool] = useState('select');

  const { canvas, canvasRef, containerRef, remoteCursors = {} } = useCanvasEngine(id, loading);

  const setActiveDiagram = useDiagramStore((state) => state.setActiveDiagram);
  const setCollaborators = useDiagramStore((state) => state.setCollaborators);
  const collaborators = useDiagramStore((state) => state.collaborators);
  const activeElementId = useUIStore((state) => state.activeElementId);
  const aiAnalysisResult = useUIStore((state) => state.aiAnalysisResult);
  const setAiAnalysisResult = useUIStore((state) => state.setAiAnalysisResult);

  useCanvasTools({ canvas, setActiveTool });

  // Load diagram metadata
  useEffect(() => {
    let active = true;
    const fetchDiagram = async () => {
      try {
        const diagram = await getDiagram(id);
        const diagramId = diagram?._id ?? diagram?.id ?? id;
        const diagramName = diagram?.name ?? 'Untitled Diagram';
        if (active) {
          setActiveDiagram(diagramId, diagramName);
          setCollaborators(diagram.members ?? []);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load diagram:', err);
        if (active) {
          setError('Could not load diagram. Redirecting...');
          setTimeout(() => navigate('/'), 1500);
        }
      }
    };
    fetchDiagram();
    return () => { active = false; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8f9fa', color:'#6b7280', fontFamily:'sans-serif' }}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8f9fa', gap:12 }}>
        <div style={{
          width: 36, height: 36, border: '3px solid #5753d4',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color:'#5753d4', fontSize:14, fontWeight:600, fontFamily:'sans-serif' }}>Loading workspace…</p>
      </div>
    );
  }

  const activeObject = activeElementId && canvas
    ? canvas.getObjects().find((o) => o.id === activeElementId)
    : null;
  const activeUserIds = Object.keys(remoteCursors ?? {});

  return (
    <main style={{ width:'100vw', height:'100vh', position:'relative', overflow:'hidden', fontFamily:'sans-serif', background:'#f8f9fa' }}>
      {/* Top-center Excalidraw-style toolbar */}
      <Toolbar canvas={canvas} activeTool={activeTool} setActiveTool={setActiveTool} />

      {/* Top-right avatar stack */}
      <UserAvatarStack activeUserIds={activeUserIds} members={collaborators} />

      {/* Remote cursor overlay */}
      <CursorOverlay cursors={remoteCursors} canvas={canvas} />

      {/* Full-screen canvas */}
      <CanvasViewport canvasRef={canvasRef} containerRef={containerRef} />

      {/* Bottom-left zoom controls */}
      <ZoomControls canvas={canvas} />

      {/* Right-side context panel */}
      <ContextPanel activeObject={activeObject} diagramId={id} />

      {/* AI overlay */}
      {aiAnalysisResult && (
        <AIOverlay analysis={aiAnalysisResult} onClose={() => setAiAnalysisResult(null)} />
      )}
    </main>
  );
};
