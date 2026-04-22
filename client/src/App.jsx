import { useCanvas } from './hooks/useCanvas';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';

function App() {
  const { canvas, canvasRef, containerRef } = useCanvas();

  return (
    <main className="w-full h-screen relative bg-gray-50 text-slate-900 font-sans selection:bg-indigo-100">
      {/* Background pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]"></div>
      
      <Toolbar canvas={canvas} />
      
      <Canvas 
        canvas={canvas} 
        canvasRef={canvasRef} 
        containerRef={containerRef} 
      />

      {/* Context Panel and AI Overlay will go here in the next steps */}
    </main>
  );
}

export default App;
