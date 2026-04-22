import { useState } from 'react';
import * as fabric from 'fabric';
import { cleanUpLayout } from '../lib/cleanUpLayout';
import { analyzeArchitecture } from '../lib/analyzeArchitecture';

export const Toolbar = ({ canvas, onAnalysisResult }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 80 + Math.random() * 200,
      top: 80 + Math.random() * 200,
      fill: '#3b82f6',
      width: 120,
      height: 60,
      rx: 8,
      ry: 8,
      shadow: new fabric.Shadow({ color: 'rgba(59,130,246,0.2)', blur: 12, offsetX: 0, offsetY: 4 }),
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 80 + Math.random() * 200,
      top: 80 + Math.random() * 200,
      fill: '#10b981',
      radius: 40,
      shadow: new fabric.Shadow({ color: 'rgba(16,185,129,0.2)', blur: 12, offsetX: 0, offsetY: 4 }),
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  const addLine = () => {
    if (!canvas) return;
    const line = new fabric.Line([100, 200, 300, 200], {
      stroke: '#6b7280',
      strokeWidth: 2,
    });
    canvas.add(line);
    canvas.setActiveObject(line);
  };

  const handleCleanUp = async () => {
    if (!canvas || isCleaning) return;
    setIsCleaning(true);
    cleanUpLayout(canvas);
    // Wait for the 600ms animation to complete before re-enabling
    setTimeout(() => setIsCleaning(false), 700);
  };

  const handleAnalyze = async () => {
    if (!canvas || isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeArchitecture(canvas);
      onAnalysisResult(result);
    } catch (err) {
      console.error('Analysis failed:', err);
      onAnalysisResult('⚠️ Analysis failed. Make sure the backend server is running on port 3001.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearBoard = () => {
    if (!canvas) return;
    if (window.confirm('Clear the entire board?')) {
      const objects = canvas.getObjects().filter((o) => !o.excludeFromExport);
      objects.forEach((o) => canvas.remove(o));
      canvas.renderAll();
    }
  };

  return (
    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg border border-gray-200 flex items-center gap-3 z-10 select-none">

      {/* Shape Tools */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-3">
        <button
          onClick={addRect}
          title="Add Rect Node"
          className="p-2 hover:bg-blue-50 rounded-lg transition-all group"
        >
          <div className="w-5 h-5 bg-blue-500 rounded group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={addCircle}
          title="Add Circle Node"
          className="p-2 hover:bg-emerald-50 rounded-lg transition-all group"
        >
          <div className="w-5 h-5 bg-emerald-500 rounded-full group-hover:scale-110 transition-transform" />
        </button>
        <button
          onClick={addLine}
          title="Add Edge (Line)"
          className="p-2 hover:bg-gray-100 rounded-lg transition-all group"
        >
          <div className="w-5 h-0.5 bg-gray-500 my-2.5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Clear */}
      <button
        onClick={clearBoard}
        className="text-xs font-medium text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors border-r border-gray-200 mr-1"
      >
        Clear
      </button>

      {/* Clean Up Layout */}
      <button
        onClick={handleCleanUp}
        disabled={isCleaning}
        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait px-4 py-1.5 rounded-lg transition-colors shadow-sm"
      >
        <span className={isCleaning ? 'animate-spin' : ''}>✨</span>
        {isCleaning ? 'Cleaning...' : 'Clean Up Layout'}
      </button>

      {/* Analyze Architecture */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing}
        className="flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 disabled:opacity-60 disabled:cursor-wait px-4 py-1.5 rounded-lg transition-all shadow-sm"
      >
        <span className={isAnalyzing ? 'animate-pulse' : ''}>🧠</span>
        {isAnalyzing ? 'Analyzing...' : 'Analyze Architecture'}
      </button>
    </div>
  );
};
