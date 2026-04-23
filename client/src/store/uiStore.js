import { create } from "zustand";

export const useUiStore = create((set) => ({
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
