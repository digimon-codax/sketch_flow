import { create } from 'zustand';

export const useArtStore = create((set) => ({
  // ── Layers ───────────────────────────────────────────────────────────────
  layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, opacity: 1, data: null }],
  activeLayerId: 'layer-1',
  
  setActiveLayer: (id) => set({ activeLayerId: id }),
  addLayer: (layer) => set((state) => ({ layers: [...state.layers, layer] })),
  deleteLayer: (id) => set((state) => ({ layers: state.layers.filter(l => l.id !== id) })),
  toggleLayerVisibility: (id) => set((state) => ({
    layers: state.layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l)
  })),
  setLayerOpacity: (id, opacity) => set((state) => ({
    layers: state.layers.map(l => l.id === id ? { ...l, opacity } : l)
  })),
  reorderLayers: (newLayers) => set({ layers: newLayers }),

  // ── Brush Settings ───────────────────────────────────────────────────────
  brushType: 'pencil', // pencil | ink | watercolor | charcoal | eraser | smudge | eyedropper
  brushSize: 8,
  brushOpacity: 1,
  brushColor: '#000000',
  secondaryColor: '#ffffff',
  
  setBrushType: (type) => set({ brushType: type }),
  setBrushSize: (size) => set({ brushSize: size }),
  setBrushOpacity: (opacity) => set({ brushOpacity: opacity }),
  setBrushColor: (color) => set({ brushColor: color }),
  setSecondaryColor: (color) => set({ secondaryColor: color }),
  swapColors: () => set((state) => ({
    brushColor: state.secondaryColor,
    secondaryColor: state.brushColor,
  })),

  // ── Palette ──────────────────────────────────────────────────────────────
  palette: ['#000000', '#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'],
  recentColors: [],
  
  setPalette: (newPalette) => set({ palette: newPalette }),
  setPaletteColor: (index, color) => set((state) => {
    const next = [...state.palette];
    next[index] = color;
    return { palette: next };
  }),
  addToPalette: (color) => set((state) => {
    if (state.palette.includes(color)) return {};
    const next = [...state.palette, color];
    if (next.length > 16) next.shift(); // remove oldest if over 16
    return { palette: next };
  }),
  addToRecentColors: (color) => set((state) => {
    const newRecents = [color, ...state.recentColors.filter(c => c !== color)].slice(0, 10);
    return { recentColors: newRecents };
  }),

  // ── Symmetry ─────────────────────────────────────────────────────────────
  symmetryMode: 'none', // none | horizontal | vertical | both | radial
  symmetryLines: 8,
  
  setSymmetryMode: (mode) => set({ symmetryMode: mode }),
  setSymmetryLines: (lines) => set({ symmetryLines: lines }),

  // ── History ──────────────────────────────────────────────────────────────
  strokeHistory: [],
  historyPointer: -1,
  
  pushStroke: (snapshot) => set((state) => {
    const newHistory = state.strokeHistory.slice(0, state.historyPointer + 1);
    newHistory.push(snapshot);
    if (newHistory.length > 50) newHistory.shift();
    return { strokeHistory: newHistory, historyPointer: newHistory.length - 1 };
  }),
  undoStroke: () => set((state) => ({
    historyPointer: Math.max(-1, state.historyPointer - 1)
  })),
  redoStroke: () => set((state) => ({
    historyPointer: Math.min(state.strokeHistory.length - 1, state.historyPointer + 1)
  })),
}));

