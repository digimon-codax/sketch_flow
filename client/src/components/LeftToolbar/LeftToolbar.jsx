import React from 'react';
import { 
  MousePointer2, Square, Circle, Diamond, 
  ArrowRight, Minus, Pencil, Type, Hand, Eraser 
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { CanvasContext } from '../../canvas/SketchCanvas';
import './LeftToolbar.css';

const TOOLS = [
  { id: 'select', icon: MousePointer2, key: 'V', label: 'Select' },
  { id: 'rect', icon: Square, key: 'R', label: 'Rectangle' },
  { id: 'ellipse', icon: Circle, key: 'E', label: 'Ellipse' },
  { id: 'diamond', icon: Diamond, key: 'D', label: 'Diamond' },
  { id: 'arrow', icon: ArrowRight, key: 'A', label: 'Arrow' },
  { id: 'line', icon: Minus, key: 'L', label: 'Line' },
  { id: 'pencil', icon: Pencil, key: 'P', label: 'Draw' },
  { id: 'text', icon: Type, key: 'T', label: 'Text' },
  { type: 'separator' },
  { id: 'hand', icon: Hand, key: 'H', label: 'Pan' },
  { id: 'eraser', icon: Eraser, key: '', label: 'Eraser' },
];

export default function LeftToolbar() {
  const { activeTool, setActiveTool } = useCanvasStore();
  const fabricCanvasRef = React.useContext(CanvasContext);

  const handleToolClick = (toolId) => {
    if (toolId === 'eraser') {
      const fc = fabricCanvasRef?.current;
      if (fc) {
        const activeObjects = fc.getActiveObjects();
        if (activeObjects.length) {
          activeObjects.forEach(obj => fc.remove(obj));
          fc.discardActiveObject();
          fc.requestRenderAll();
        }
      }
      return;
    }
    setActiveTool(toolId);
  };

  return (
    <div className="left-toolbar">
      {TOOLS.map((tool, idx) => {
        if (tool.type === 'separator') {
          return <div key={`sep-${idx}`} className="tool-separator" />;
        }
        const Icon = tool.icon;
        const isActive = activeTool === tool.id;

        return (
          <button
            key={tool.id}
            className={`tool-btn ${isActive ? 'active' : ''}`}
            onClick={() => handleToolClick(tool.id)}
          >
            <Icon size={16} />
            <div className="tool-tooltip">
              <span>{tool.label}</span>
              {tool.key && <span className="tool-tooltip-key">{tool.key}</span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
