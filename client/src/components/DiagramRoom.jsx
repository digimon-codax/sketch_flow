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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { canvas, canvasRef, containerRef } = useCanvas(id, loading);
  const { cursors } = useCollaboration(id, canvas);

  const setActiveDiagram = useDiagramStore((state) => state.setActiveDiagram);
  const setCollaborators = useDiagramStore((state) => state.setCollaborators);
  const collaborators = useDiagramStore((state) => state.collaborators);
  const activeElementId = useUIStore((state) => state.activeElementId);
  const aiAnalysisResult = useUIStore((state) => state.aiAnalysisResult);
  const setAiAnalysisResult = useUIStore((state) => state.setAiAnalysisResult);

  // Load diagram metadata
  useEffect(() => {
    let active = true;
    const fetchDiagram = async () => {
      try {
        const diagram = await getDiagram(id);
        if (active) {
          setActiveDiagram(diagram.id, diagram.name);
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
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-500">
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-3">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading workspace...</p>
      </div>
    );
  }

  const activeObject = activeElementId && canvas
    ? canvas.getObjects().find((o) => o.id === activeElementId)
    : null;
  const activeUserIds = Object.keys(cursors);

  return (
    <main className="w-full h-screen relative overflow-hidden font-sans bg-[#f8f9fa]">
      {/* Toolbar floats at top-center */}
      <Toolbar canvas={canvas} />

      {/* Avatar stack top-right */}
      <UserAvatarStack activeUserIds={activeUserIds} members={collaborators} />

      {/* Remote cursor overlay */}
      <CursorOverlay cursors={cursors} canvas={canvas} />

      {/* Fabric.js canvas fills the whole screen */}
      <Canvas canvasRef={canvasRef} containerRef={containerRef} />

      {/* Right-side context panel for selected shapes */}
      <ContextPanel activeObject={activeObject} diagramId={id} />

      {/* AI analysis overlay */}
      {aiAnalysisResult && (
        <AIOverlay analysis={aiAnalysisResult} onClose={() => setAiAnalysisResult(null)} />
      )}
    </main>
  );
};
