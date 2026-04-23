import { create } from 'zustand';

export const useUIStore = create((set) => ({
  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),
  
  assistResult: null,
  setAssistResult: (result) => set({ assistResult: result }),
  clearAssistResult: () => set({ assistResult: null }),
  
  drawerOpen: false,
  setDrawerOpen: (bool) => set({ drawerOpen: bool }),
}));
