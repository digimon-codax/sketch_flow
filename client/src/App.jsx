import { useState, useEffect } from 'react';
import { useCanvas } from './hooks/useCanvas';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { ContextPanel } from './components/ContextPanel';
import { AIOverlay } from './components/AIOverlay';

function App() {
  const { canvas, canvasRef, containerRef } = useCanvas();
  const [activeObject, setActiveObject] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);

  // Track canvas selection for the Context Panel
  useEffect(() => {
    if (!canvas) return;

    const onSelected = (e) => {
      const obj = e.selected?.[0] || canvas.getActiveObject();
      // Only show context panel for nodes (not grid lines or edges)
      if (obj && !obj.excludeFromExport && (obj.type === 'rect' || obj.type === 'circle')) {
        setActiveObject(obj);
      } else {
        setActiveObject(null);
      }
    };

    const onCleared = () => setActiveObject(null);

    canvas.on('selection:created', onSelected);
    canvas.on('selection:updated', onSelected);
    canvas.on('selection:cleared', onCleared);

    return () => {
      canvas.off('selection:created', onSelected);
      canvas.off('selection:updated', onSelected);
      canvas.off('selection:cleared', onCleared);
    };
  }, [canvas]);

  return (
    <main className="w-full h-screen relative bg-gray-50 overflow-hidden font-sans">

      {/* Floating top toolbar */}
      <Toolbar canvas={canvas} onAnalysisResult={setAiAnalysis} />

      {/* Fabric Canvas */}
      <Canvas canvas={canvas} canvasRef={canvasRef} containerRef={containerRef} />

      {/* Right-side context panel — slides in when a node is selected */}
      <ContextPanel activeObject={activeObject} />

      {/* AI analysis overlay — appears after Analyze is clicked */}
      {aiAnalysis && (
        <AIOverlay analysis={aiAnalysis} onClose={() => setAiAnalysis(null)} />
      )}
    </main>
  );
}

export default App;
