import { create } from 'zustand';

export const useDiagramStore = create((set) => ({
  activeDiagramId: null,
  activeDiagramName: '',
  collaborators: [], // { id, name, color }

  setActiveDiagram: (id, name) => set({ activeDiagramId: id, activeDiagramName: name }),
  setCollaborators: (collaborators) => set({ collaborators }),
  addCollaborator: (collaborator) => 
    set((state) => ({ 
      collaborators: [...state.collaborators.filter(c => c.id !== collaborator.id), collaborator] 
    })),
  removeCollaborator: (userId) => 
    set((state) => ({ 
      collaborators: state.collaborators.filter(c => c.id !== userId) 
    })),
}));
