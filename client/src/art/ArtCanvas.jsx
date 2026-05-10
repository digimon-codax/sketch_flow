import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';

const ArtCanvas = forwardRef((props, ref) => {
  const containerRef = useRef(null);
  const compositeRef = useRef(null);
  const activeRef = useRef(null);

  // Initialize and handle resize
  useEffect(() => {
    const container = containerRef.current;
    const compCanvas = compositeRef.current;
    const actCanvas = activeRef.current;
    
    if (!container || !compCanvas || !actCanvas) return;

    let resizeTimer;

    const resizeCanvases = () => {
      const rect = container.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;

      // Save composite content before resize
      let savedImage = null;
      if (compCanvas.width > 0 && compCanvas.height > 0) {
        savedImage = new Image();
        savedImage.src = compCanvas.toDataURL();
      }

      // Resize composite
      compCanvas.width = newWidth;
      compCanvas.height = newHeight;
      
      // Resize active
      actCanvas.width = newWidth;
      actCanvas.height = newHeight;

      const ctx = compCanvas.getContext('2d');
      
      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, newWidth, newHeight);

      // Restore saved drawing if exists
      if (savedImage) {
        savedImage.onload = () => {
          ctx.drawImage(savedImage, 0, 0);
        };
      }
    };

    // Initial size
    resizeCanvases();

    // Window resize handler (debounced)
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvases, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, []);

  // Expose API to parent
  useImperativeHandle(ref, () => ({
    getCompositeDataURL: () => {
      if (!compositeRef.current) return null;
      return compositeRef.current.toDataURL('image/png');
    },
    clearCanvas: () => {
      const compCanvas = compositeRef.current;
      if (!compCanvas) return;
      const ctx = compCanvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, compCanvas.width, compCanvas.height);
    },
    flattenLayersToComposite: () => {
      // Placeholder for future implementation
      console.log('flattenLayersToComposite called');
    }
  }));

  const canvasStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    touchAction: 'none' // CRITICAL for pen tablet and touch
  };

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* Composite Canvas (Bottom) */}
      <canvas 
        ref={compositeRef}
        style={canvasStyle}
      />
      
      {/* Active Canvas (Top) */}
      <canvas 
        ref={activeRef}
        style={{ ...canvasStyle, zIndex: 10 }}
      />
    </div>
  );
});

export default ArtCanvas;
