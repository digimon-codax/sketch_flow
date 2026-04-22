import { create } from 'zustand';

export const useUIStore = create((set) => ({
  activeElementId: null,
  isContextPanelOpen: false,
  aiAnalysisResult: null,

  setActiveElement: (id) => set({ activeElementId: id, isContextPanelOpen: !!id }),
  closeContextPanel: () => set({ isContextPanelOpen: false, activeElementId: null }),
  setAiAnalysisResult: (result) => set({ aiAnalysisResult: result }),
}));
