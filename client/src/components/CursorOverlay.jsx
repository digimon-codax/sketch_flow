import React from 'react';
import { MousePointer2 } from 'lucide-react';

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899'];

// Hash a string to a consistent index for the colors array
const getColor = (id) => COLORS[id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % COLORS.length];

export const CursorOverlay = ({ cursors, canvas }) => {
  if (!canvas) return null;

  // We need to map Fabric's logical canvas coordinates to the screen's DOM coordinates
  // so the HTML cursors overlay perfectly over the canvas zoom/pan state.
  const vpt = canvas.viewportTransform;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      {Object.entries(cursors).map(([userId, pos]) => {
        // Transform logical {x,y} to screen {x,y}
        const screenX = pos.x * vpt[0] + vpt[4];
        const screenY = pos.y * vpt[3] + vpt[5];
        const color = getColor(userId);

        return (
          <div
            key={userId}
            className="absolute top-0 left-0 transition-transform duration-75 ease-linear flex flex-col items-start"
            style={{ transform: `translate(${screenX}px, ${screenY}px)` }}
          >
            <MousePointer2 
              className="w-5 h-5 -ml-2 -mt-1 drop-shadow-md" 
              color={color}
              fill={color}
            />
            <div 
              className="px-2 py-0.5 text-[11px] font-medium text-white rounded-md whitespace-nowrap shadow-sm mt-1"
              style={{ backgroundColor: color }}
            >
              {pos.name || 'User'}
            </div>
          </div>
        );
      })}
    </div>
  );
};
