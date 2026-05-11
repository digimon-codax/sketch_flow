import { create } from 'zustand';

export const useUIStore = create((set) => ({
  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  
  toastMessage: null,
  showToast: (msg) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      set((state) => (state.toastMessage === msg ? { toastMessage: null } : state));
    }, 3000);
  },

  assistResult: null,
  setAssistResult: (result) => set({ assistResult: result }),
  clearAssistResult: () => set({ assistResult: null }),
  
  drawerOpen: false,
  setDrawerOpen: (bool) => set({ drawerOpen: bool }),

  cleanupLoading: false,
  setCleanupLoading: (bool) => set({ cleanupLoading: bool }),
}));
