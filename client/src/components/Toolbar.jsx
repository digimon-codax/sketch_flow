import * as fabric from 'fabric';

export const Toolbar = ({ canvas }) => {
  const addRect = () => {
    if (!canvas) return;
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      fill: '#3b82f6',
      width: 100,
      height: 100,
      rx: 8, // rounded corners
      ry: 8,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 0, offsetY: 4 })
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
  };

  const addCircle = () => {
    if (!canvas) return;
    const circle = new fabric.Circle({
      left: 250,
      top: 100,
      fill: '#10b981',
      radius: 50,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 0, offsetY: 4 })
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
  };

  const addLine = () => {
    if (!canvas) return;
    const line = new fabric.Line([100, 250, 300, 250], {
      stroke: '#6b7280',
      strokeWidth: 4,
      selectable: true,
      hasControls: true,
      hasBorders: true
    });
    canvas.add(line);
    canvas.setActiveObject(line);
  };

  const clearBoard = () => {
    if (!canvas) return;
    if (confirm('Clear the entire board?')) {
      const objects = canvas.getObjects().filter(o => !o.excludeFromExport);
      objects.forEach(o => canvas.remove(o));
    }
  };

  return (
    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-gray-200 flex items-center gap-4 z-10">
      <div className="flex items-center gap-2 border-r border-gray-300 pr-4">
        <button onClick={addRect} className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Add Node (Rect)">
          <div className="w-6 h-6 bg-blue-500 rounded-sm group-hover:scale-110 transition-transform"></div>
        </button>
        <button onClick={addCircle} className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Add Node (Circle)">
          <div className="w-6 h-6 bg-emerald-500 rounded-full group-hover:scale-110 transition-transform"></div>
        </button>
        <button onClick={addLine} className="p-2 hover:bg-gray-100 rounded-lg transition-colors group" title="Add Edge (Line)">
          <div className="w-6 h-1 bg-gray-500 my-2.5 group-hover:scale-110 transition-transform"></div>
        </button>
      </div>

      <div className="flex items-center gap-2 pl-2 border-r border-gray-300 pr-4">
        <button onClick={clearBoard} className="text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
          Clear
        </button>
      </div>
      
      <div className="flex items-center gap-2 pl-2">
        <button 
          className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-lg transition-colors shadow-sm"
          onClick={() => alert('Clean up coming in next step!')}
        >
          ✨ Clean Up Layout
        </button>
        <button 
          className="text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-4 py-1.5 rounded-lg transition-colors shadow-sm"
          onClick={() => alert('AI Analysis coming in next step!')}
        >
          🧠 Analyze Architecture
        </button>
      </div>
    </div>
  );
};
