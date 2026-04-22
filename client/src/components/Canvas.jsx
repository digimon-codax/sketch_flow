import { useEffect } from 'react';

export const Canvas = ({ canvasRef, containerRef, canvas }) => {
  useEffect(() => {
    if (!canvas) return;

    const handleKeyDown = (e) => {
      // Delete selected objects with Backspace or Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Prevent deleting if user is typing in an input field
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
          return;
        }

        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
          canvas.discardActiveObject();
          activeObjects.forEach((obj) => {
            canvas.remove(obj);
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvas]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-screen bg-gray-50 overflow-hidden outline-none cursor-crosshair"
    >
      <canvas ref={canvasRef} className="absolute top-0 left-0" />
    </div>
  );
};
