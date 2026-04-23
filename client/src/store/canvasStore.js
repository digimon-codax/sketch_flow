import { create } from 'zustand';

export const useCanvasStore = create((set) => ({
  elements: [],
  setElements: (els) => set({ elements: els }),
  
  activeTool: 'select',
  setActiveTool: (tool) => set({ activeTool: tool }),
  
  strokeColor: '#f0ede8',
  fillColor: 'transparent',
  strokeWidth: 1.5,
  strokeStyle: 'solid',
  
  setStrokeColor: (color) => set({ strokeColor: color }),
  setFillColor: (color) => set({ fillColor: color }),
  setStrokeWidth: (width) => set({ strokeWidth: width }),
  setStrokeStyle: (style) => set({ strokeStyle: style }),

  remoteCursors: {},
  updateRemoteCursor: (userId, data) => set((state) => ({
    remoteCursors: { ...state.remoteCursors, [userId]: data }
  })),
  removeRemoteCursor: (userId) => set((state) => {
    const newCursors = { ...state.remoteCursors };
    delete newCursors[userId];
    return { remoteCursors: newCursors };
  }),

  roomUsers: [],
  setRoomUsers: (users) => set({ roomUsers: users }),
}));
