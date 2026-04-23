import { create } from "zustand";

export const useUiStore = create((set) => ({
  // Shared selection state for canvas side panels
  activeElementId: null,
  setActiveElement: (id) => set({ activeElementId: id }),

  // Legacy AI overlay state used by Fabric canvas room
  aiAnalysisResult: null,
  setAiAnalysisResult: (result) => set({ aiAnalysisResult: result }),

  // Feature 2 — Arch Assist result
  assistResult: null,
  setAssistResult: (result) => set({ assistResult: result }),
  clearAssistResult: () => set({ assistResult: null }),

  // Toast / notification
  toast: null,
  showToast: (msg, type = "info") => {
    set({ toast: { msg, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));

// Backward-compatible alias for older imports
export const useUIStore = useUiStore;
