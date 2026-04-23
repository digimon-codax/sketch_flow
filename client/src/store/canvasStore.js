import { create } from "zustand";

export const useCanvasStore = create((set) => ({
  // Selected canvas element ID
  selectedElementId: null,
  setSelectedElementId: (id) => set({ selectedElementId: id }),

  // Current scene elements (kept in sync for hooks that need them)
  elements: [],
  setElements: (elements) => set({ elements }),

  // Collaboration: list of connected users
  collaborators: [],
  setCollaborators: (collaborators) => set({ collaborators }),
}));
