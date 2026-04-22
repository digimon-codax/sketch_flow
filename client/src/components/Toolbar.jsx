import { useState } from 'react';
import * as fabric from 'fabric';
import { cleanupLayout, assistArchitecture } from '../api/aiApi';
import { useUIStore } from '../store/uiStore';

export const Toolbar = ({ canvas }) => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const setAiAnalysisResult = useUIStore((state) => state.setAiAnalysisResult);

  const addShape = (type) => {
    if (!canvas) return;
    let shape;
    
    const commonProps = {
      left: 100 + Math.random() * 100,
      top: 100 + Math.random() * 100,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetY: 4 }),
    };

    if (type === 'rect') {
      shape = new fabric.Rect({ ...commonProps, width: 120, height: 60, fill: '#3b82f6', rx: 8, ry: 8 });
    } else if (type === 'circle') {
      shape = new fabric.Circle({ ...commonProps, radius: 40, fill: '#10b981' });
    } else if (type === 'line') {
      shape = new fabric.Line([100, 200, 300, 200], { stroke: '#6b7280', strokeWidth: 2 });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
    }
  };

  const handleCleanUp = async () => {
    if (!canvas || isCleaning) return;
    setIsCleaning(true);
    try {
      const objectsJSON = canvas.toJSON(['id']).objects;
      const { layout } = await cleanupLayout(objectsJSON);
      
      layout.forEach(({ id, left, top }) => {
        const obj = canvas.getObjects().find((o) => o.id === id);
        if (obj) {
          fabric.util.animate({
            startValue: 0,
            endValue: 1,
            duration: 600,
            easing: fabric.util.ease.easeInOutCubic,
            onChange: (val) => {
              const currentLeft = obj.left;
              const currentTop = obj.top;
              obj.set({ left: currentLeft + (left - currentLeft) * val, top: currentTop + (top - currentTop) * val });
              canvas.renderAll();
            },
            onComplete: () => {
              obj.setCoords();
              canvas.renderAll();
            }
          });
        }
      });
      
      // Allow time for animation before firing delta manually if needed (or rely on modified events)
      setTimeout(() => {
        setIsCleaning(false);
        canvas.fire('object:modified'); 
      }, 700);

    } catch (err) {
      console.error(err);
      setIsCleaning(false);
    }
  };

  const handleAnalyze = async () => {
    if (!canvas || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const imageBase64 = canvas.toDataURL('image/png');
      const objectsJSON = canvas.toJSON(['id']).objects;
      const result = await assistArchitecture(imageBase64, objectsJSON);
      setAiAnalysisResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      setAiAnalysisResult({ error: 'Analysis failed. Make sure Anthropic API key is set.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-3 z-10 select-none">
      <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
        <button onClick={() => addShape('rect')} className="p-2 hover:bg-blue-50 rounded-lg group"><div className="w-5 h-5 bg-blue-500 rounded group-hover:scale-110 transition-transform" /></button>
        <button onClick={() => addShape('circle')} className="p-2 hover:bg-emerald-50 rounded-lg group"><div className="w-5 h-5 bg-emerald-500 rounded-full group-hover:scale-110 transition-transform" /></button>
        <button onClick={() => addShape('line')} className="p-2 hover:bg-gray-100 rounded-lg group"><div className="w-5 h-0.5 bg-gray-500 my-2.5 group-hover:scale-110 transition-transform" /></button>
      </div>

      <button onClick={handleCleanUp} disabled={isCleaning} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-1.5 rounded-lg shadow-sm transition-colors">
        <span className={isCleaning ? 'animate-spin' : ''}>✨</span>
        {isCleaning ? 'Cleaning...' : 'Clean Up Layout'}
      </button>

      <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 disabled:opacity-60 px-4 py-1.5 rounded-lg shadow-sm transition-colors">
        <span className={isAnalyzing ? 'animate-pulse' : ''}>🧠</span>
        {isAnalyzing ? 'Analyzing...' : 'Arch Assist'}
      </button>
    </div>
  );
};
