import { useEffect, useRef } from 'react';

export const AIOverlay = ({ analysis, onClose }) => {
  const panelRef = useRef(null);

  // Allow dragging the panel
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    let isDragging = false;
    let startX, startY, initLeft, initTop;

    const onMouseDown = (e) => {
      if (!e.target.closest('.drag-handle')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      initLeft = rect.left;
      initTop = rect.top;
      panel.style.transition = 'none';
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${initLeft + dx}px`;
      panel.style.top = `${initTop + dy}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    };

    const onMouseUp = () => { isDragging = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    panel.addEventListener('mousedown', onMouseDown);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      panel.removeEventListener('mousedown', onMouseDown);
    };
  }, []);

  if (!analysis) return null;

  // Format the analysis text into sections
  const lines = analysis.split('\n').filter(Boolean);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-8 right-8 w-[420px] max-h-[60vh] flex flex-col z-50 animate-fade-in"
      style={{ animation: 'fadeInUp 0.35s ease forwards' }}
    >
      {/* Glass card */}
      <div className="bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header – drag handle */}
        <div className="drag-handle flex items-center justify-between px-5 py-4 border-b border-white/10 cursor-move select-none">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <span className="text-white font-semibold text-sm tracking-wide">Architecture Analysis</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">AI</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-3 scrollbar-thin">
          {lines.map((line, i) => {
            // Bold headers that start with # or **
            if (line.startsWith('##') || line.startsWith('**')) {
              return (
                <h3 key={i} className="text-white font-semibold text-sm mt-4 first:mt-0">
                  {line.replace(/^#+\s*/, '').replace(/\*\*/g, '')}
                </h3>
              );
            }
            if (line.startsWith('-') || line.startsWith('•')) {
              return (
                <div key={i} className="flex gap-2 text-gray-300 text-sm">
                  <span className="text-indigo-400 mt-0.5 flex-shrink-0">›</span>
                  <span>{line.replace(/^[-•]\s*/, '')}</span>
                </div>
              );
            }
            return (
              <p key={i} className="text-gray-300 text-sm leading-relaxed">
                {line}
              </p>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-gray-500">Powered by GPT-4o</span>
          <button
            onClick={onClose}
            className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
