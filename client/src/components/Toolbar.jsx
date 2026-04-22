import { useState } from 'react';
import * as fabric from 'fabric';
import { cleanupLayout, assistArchitecture } from '../api/aiApi';
import { useUIStore } from '../store/uiStore';
import { Square, Circle, Minus } from 'lucide-react';

export const Toolbar = ({ canvas }) => {
  const [isCleaning, setIsCleaning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const setAiAnalysisResult = useUIStore((state) => state.setAiAnalysisResult);

  const addShape = (type) => {
    if (!canvas) return;
    let shape;

    const commonProps = {
      fill: 'rgba(255, 255, 255, 0.01)',
      stroke: '#1e1e1e',
      strokeWidth: 2.5,
      strokeLineJoin: 'round',
      strokeLineCap: 'round',
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.06)', blur: 4, offsetY: 2 }),
    };

    const center = canvas.getVpCenter();
    const cx = center.x + (Math.random() * 40 - 20);
    const cy = center.y + (Math.random() * 40 - 20);
    commonProps.left = cx;
    commonProps.top = cy;

    if (type === 'rect') {
      shape = new fabric.Rect({ ...commonProps, width: 120, height: 80, rx: 12, ry: 12 });
    } else if (type === 'circle') {
      shape = new fabric.Circle({ ...commonProps, radius: 45 });
    } else if (type === 'line') {
      shape = new fabric.Line([cx - 60, cy, cx + 60, cy], { ...commonProps, fill: undefined });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
    }
  };

  const handleCleanUp = async () => {
    if (!canvas || isCleaning) return;

    // Collect all non-grid objects with their IDs
    const objectsToLayout = canvas.getObjects().filter(o => o.id && !o.excludeFromExport);
    if (objectsToLayout.length === 0) {
      alert('Add some shapes to the canvas first!');
      return;
    }

    setIsCleaning(true);
    try {
      const objectsJSON = objectsToLayout.map(o => ({
        id: o.id,
        type: o.type,
        left: o.left,
        top: o.top,
        width: o.width,
        height: o.height,
      }));

      const { layout } = await cleanupLayout(objectsJSON);
      if (!layout || !Array.isArray(layout)) throw new Error('Invalid layout from server');

      // Fabric v7 removed fabric.util.animate — use requestAnimationFrame instead
      const DURATION = 600; // ms
      const start = performance.now();

      // Store initial positions
      const initial = {};
      layout.forEach(({ id, left, top }) => {
        const obj = canvas.getObjects().find(o => o.id === id);
        if (obj) initial[id] = { fromLeft: obj.left, fromTop: obj.top, toLeft: left, toTop: top };
      });

      const easeInOutCubic = (t) =>
        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      const animate = (now) => {
        const elapsed = now - start;
        const raw = Math.min(elapsed / DURATION, 1);
        const t = easeInOutCubic(raw);

        layout.forEach(({ id }) => {
          const obj = canvas.getObjects().find(o => o.id === id);
          const pos = initial[id];
          if (!obj || !pos) return;
          obj.set({
            left: pos.fromLeft + (pos.toLeft - pos.fromLeft) * t,
            top:  pos.fromTop  + (pos.toTop  - pos.fromTop)  * t,
          });
          obj.setCoords();
        });

        canvas.requestRenderAll();

        if (raw < 1) {
          requestAnimationFrame(animate);
        } else {
          // Done — trigger a save + WS broadcast
          canvas.fire('object:modified');
          setIsCleaning(false);
        }
      };

      requestAnimationFrame(animate);
    } catch (err) {
      console.error('[CleanUp] Error:', err);
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
    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white px-3 py-2 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-gray-100 flex items-center gap-3 z-10 select-none">
      <div className="flex items-center gap-1 border-r border-gray-100 pr-3">
        <button onClick={() => addShape('rect')} className="p-2.5 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-xl transition-colors"><Square size={20} strokeWidth={2.5} /></button>
        <button onClick={() => addShape('circle')} className="p-2.5 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-xl transition-colors"><Circle size={20} strokeWidth={2.5} /></button>
        <button onClick={() => addShape('line')} className="p-2.5 hover:bg-indigo-50 text-gray-700 hover:text-indigo-600 rounded-xl transition-colors"><Minus size={20} strokeWidth={2.5} /></button>
      </div>

      <button onClick={handleCleanUp} disabled={isCleaning} className="flex items-center gap-2 text-sm font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 disabled:opacity-60 px-4 py-2 rounded-xl transition-colors">
        <span className={isCleaning ? 'animate-spin' : ''}>✨</span>
        {isCleaning ? 'Cleaning...' : 'Clean Up'}
      </button>

      <button onClick={handleAnalyze} disabled={isAnalyzing} className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 px-4 py-2 rounded-xl shadow-sm transition-colors">
        <span className={isAnalyzing ? 'animate-pulse' : ''}>🧠</span>
        {isAnalyzing ? 'Analyzing...' : 'Arch Assist'}
      </button>
    </div>
  );
};
