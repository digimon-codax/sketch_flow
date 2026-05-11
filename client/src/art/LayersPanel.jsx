import React, { useState, useRef, useEffect } from 'react';
import { Plus, Copy, Trash2, Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import { useArtStore } from './artStore';
import './LayersPanel.css';

const BLEND_MODES = [
  { label: 'Normal',     value: 'source-over' },
  { label: 'Multiply',   value: 'multiply' },
  { label: 'Screen',     value: 'screen' },
  { label: 'Overlay',    value: 'overlay' },
  { label: 'Soft Light', value: 'soft-light' },
  { label: 'Hard Light', value: 'hard-light' },
  { label: 'Darken',     value: 'darken' },
  { label: 'Lighten',    value: 'lighten' },
];

function LayerRow({ layer, isActive, artCanvasRef, onSelect }) {
  const { toggleLayerVisibility, setLayerLocked, renameLayer } = useArtStore();
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(layer.name);
  const [thumb, setThumb] = useState(null);
  const dragRef = useRef(null);

  // Refresh thumbnail whenever this component re-renders (after stroke commits)
  useEffect(() => {
    if (!artCanvasRef?.current) return;
    const url = artCanvasRef.current.getLayerThumbnail(layer.id);
    if (url) setThumb(url);
  });

  const handleVisibilityClick = (e) => {
    e.stopPropagation();
    toggleLayerVisibility(layer.id);
    // Recomposite after toggle
    artCanvasRef?.current?.recompositeAllLayers();
  };

  const handleLockClick = (e) => {
    e.stopPropagation();
    setLayerLocked(layer.id, !layer.locked);
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
  };

  const commitName = () => {
    setEditing(false);
    const trimmed = nameVal.trim();
    if (trimmed) renameLayer(layer.id, trimmed);
    else setNameVal(layer.name);
  };

  return (
    <div
      className={`layer-row ${isActive ? 'active' : ''}`}
      onClick={onSelect}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('layerId', layer.id); }}
    >
      {/* Visibility */}
      <button className="layer-vis-btn" onClick={handleVisibilityClick}>
        {layer.visible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>

      {/* Thumbnail */}
      {thumb
        ? <img className="layer-thumb" src={thumb} alt="" />
        : <div className="layer-thumb" style={{ background: '#f0f0f0' }} />
      }

      {/* Name */}
      {editing ? (
        <input
          className="layer-name-input"
          value={nameVal}
          autoFocus
          onChange={e => setNameVal(e.target.value)}
          onBlur={commitName}
          onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setEditing(false); setNameVal(layer.name); } }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="layer-name" onDoubleClick={handleDoubleClick}>{layer.name}</span>
      )}

      {/* Opacity */}
      <span className="layer-opacity">{Math.round(layer.opacity * 100)}%</span>

      {/* Lock */}
      <button className={`layer-lock-btn ${layer.locked ? 'locked' : ''}`} onClick={handleLockClick}>
        {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
      </button>
    </div>
  );
}

export default function LayersPanel({ artCanvasRef }) {
  const {
    layers, activeLayerId,
    setActiveLayer, addLayer, deleteLayer, reorderLayers,
    setLayerOpacity, setLayerBlendMode,
  } = useArtStore();

  const activeLayer = layers.find(l => l.id === activeLayerId);

  const getSize = () => artCanvasRef?.current?.getCanvasSize() ?? { width: 800, height: 600 };

  const handleAdd = () => {
    const id = `layer-${Date.now()}`;
    const n = layers.length + 1;
    artCanvasRef?.current?.createLayerCanvas(id);
    addLayer({ id, name: `Layer ${n}`, visible: true, opacity: 1, blendMode: 'source-over', locked: false });
    setActiveLayer(id);
  };

  const handleDuplicate = () => {
    if (!activeLayerId) return;
    const srcLayer = layers.find(l => l.id === activeLayerId);
    if (!srcLayer) return;
    const newId = `layer-${Date.now()}`;
    artCanvasRef?.current?.duplicateLayerCanvas(activeLayerId, newId);
    const idx = layers.findIndex(l => l.id === activeLayerId);
    const newLayers = [...layers];
    newLayers.splice(idx + 1, 0, { ...srcLayer, id: newId, name: `${srcLayer.name} copy` });
    reorderLayers(newLayers);
    setActiveLayer(newId);
    artCanvasRef?.current?.recompositeAllLayers();
  };

  const handleDelete = () => {
    if (layers.length <= 1) return;
    artCanvasRef?.current?.deleteLayerCanvas(activeLayerId);
    const idx = layers.findIndex(l => l.id === activeLayerId);
    deleteLayer(activeLayerId);
    const next = layers[idx - 1] ?? layers[idx + 1];
    if (next) setActiveLayer(next.id);
    artCanvasRef?.current?.recompositeAllLayers();
  };

  // Drag-and-drop reorder
  const [dragOverId, setDragOverId] = useState(null);
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (e, targetId) => {
    e.preventDefault();
    setDragOverId(null);
    const srcId = e.dataTransfer.getData('layerId');
    if (srcId === targetId) return;
    const next = [...layers];
    const fromIdx = next.findIndex(l => l.id === srcId);
    const toIdx = next.findIndex(l => l.id === targetId);
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    reorderLayers(next);
    artCanvasRef?.current?.recompositeAllLayers();
  };

  // Layers rendered top→bottom in UI (reverse of array)
  const displayLayers = [...layers].reverse();

  return (
    <div className="layers-panel">
      {/* Header */}
      <div className="lp-header">
        <span className="lp-title">Layers</span>
        <div className="lp-actions">
          <button className="lp-icon-btn" onClick={handleAdd} title="Add Layer"><Plus size={13} /></button>
          <button className="lp-icon-btn" onClick={handleDuplicate} title="Duplicate Layer"><Copy size={13} /></button>
          <button className="lp-icon-btn danger" onClick={handleDelete} title="Delete Layer" disabled={layers.length <= 1}><Trash2 size={13} /></button>
        </div>
      </div>

      {/* Layer list */}
      <div className="layers-list">
        {displayLayers.map(layer => (
          <div
            key={layer.id}
            className={dragOverId === layer.id ? 'drag-over' : ''}
            onDragOver={(e) => handleDragOver(e, layer.id)}
            onDrop={(e) => handleDrop(e, layer.id)}
            onDragLeave={() => setDragOverId(null)}
          >
            <LayerRow
              layer={layer}
              isActive={layer.id === activeLayerId}
              artCanvasRef={artCanvasRef}
              onSelect={() => setActiveLayer(layer.id)}
            />
          </div>
        ))}
      </div>

      {/* Active layer settings */}
      {activeLayer && (
        <div className="lp-section">
          <div className="lp-section-label">Blend Mode</div>
          <select
            className="lp-blend-select"
            value={activeLayer.blendMode || 'source-over'}
            onChange={e => {
              setLayerBlendMode(activeLayerId, e.target.value);
              artCanvasRef?.current?.recompositeAllLayers();
            }}
          >
            {BLEND_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <div className="lp-section-label">Opacity — {Math.round(activeLayer.opacity * 100)}%</div>
          <input
            type="range"
            className="lp-slider"
            min={0} max={100} step={1}
            value={Math.round(activeLayer.opacity * 100)}
            onChange={e => {
              setLayerOpacity(activeLayerId, parseInt(e.target.value) / 100);
              artCanvasRef?.current?.recompositeAllLayers();
            }}
          />
        </div>
      )}
    </div>
  );
}
