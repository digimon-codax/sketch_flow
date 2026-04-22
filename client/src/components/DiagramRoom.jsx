import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCanvas } from '../hooks/useCanvas';
import { useCollaboration } from '../hooks/useCollaboration';
import { useDiagramStore } from '../store/diagramStore';
import { useUIStore } from '../store/uiStore';
import { getDiagram } from '../api/diagramsApi';
import { Canvas } from './Canvas';
import { Toolbar } from './Toolbar';
import { ContextPanel } from './ContextPanel';
import { AIOverlay } from './AIOverlay';
import { CursorOverlay } from './CursorOverlay';
import { UserAvatarStack } from './UserAvatarStack';

export const DiagramRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canvas, canvasRef, containerRef } = useCanvas(id);
  const { cursors } = useCollaboration(id, canvas);
  const setActiveDiagram = useDiagramStore((state) => state.setActiveDiagram);
  const setCollaborators = useDiagramStore((state) => state.setCollaborators);
  const collaborators = useDiagramStore((state) => state.collaborators);
  const activeElementId = useUIStore((state) => state.activeElementId);
  const aiAnalysisResult = useUIStore((state) => state.aiAnalysisResult);
  const setAiAnalysisResult = useUIStore((state) => state.setAiAnalysisResult);

  const [loading, setLoading] = useState(true);

  // Load Diagram metadata and members
  useEffect(() => {
    let active = true;
    const fetchDiagram = async () => {
      try {
        const diagram = await getDiagram(id);
        if (active) {
          setActiveDiagram(diagram.id, diagram.name);
          setCollaborators(diagram.members);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load diagram:', err);
        navigate('/'); // Redirect to dashboard if access denied or not found
      }
    };
    fetchDiagram();
    return () => { active = false; };
  }, [id, navigate, setActiveDiagram, setCollaborators]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading workspace...</div>;

  // Find active element object from canvas for the ContextPanel
  const activeObject = activeElementId && canvas ? canvas.getObjects().find(o => o.id === activeElementId) : null;
  const activeUserIds = Object.keys(cursors); // This tracks connected users (remote)
  
  return (
    <main className="w-full h-screen relative bg-gray-50 overflow-hidden font-sans">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <UserAvatarStack activeUserIds={activeUserIds} members={collaborators} />
      <Toolbar canvas={canvas} />
      <CursorOverlay cursors={cursors} canvas={canvas} />
      
      <Canvas canvas={canvas} canvasRef={canvasRef} containerRef={containerRef} />
      
      <ContextPanel activeObject={activeObject} diagramId={id} />
      
      {aiAnalysisResult && (
        <AIOverlay analysis={aiAnalysisResult} onClose={() => setAiAnalysisResult(null)} />
      )}
    </main>
  );
};
