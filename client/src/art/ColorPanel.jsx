import React, { useState, useRef, useCallback } from 'react';
import { HexColorPicker } from 'react-colorful';
import { ArrowLeftRight } from 'lucide-react';
import { useArtStore } from './artStore';
import './ColorPanel.css';

function PaletteSwatch({ color, isActive, onClick, onLongPress }) {
  const [showSaved, setShowSaved] = useState(false);
  const pressTimer = useRef(null);

  const handleMouseDown = () => {
    pressTimer.current = setTimeout(() => {
      onLongPress();
      setShowSaved(true);
      setTimeout(() => setShowSaved(false), 1200);
    }, 500);
  };

  const handleMouseUp = () => {
    clearTimeout(pressTimer.current);
  };

  return (
    <button
      className={`palette-swatch ${isActive ? 'active' : ''}`}
      style={{ background: color }}
      onClick={onClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      title={color}
    >
      {showSaved && <span className="palette-tooltip">Saved!</span>}
    </button>
  );
}

export default function ColorPanel() {
  const {
    brushColor, setBrushColor,
    secondaryColor,
    swapColors,
    brushOpacity, setBrushOpacity,
    palette, setPaletteColor, addToPalette,
    recentColors,
    addToRecentColors,
  } = useArtStore();

  const handleColorChange = useCallback((color) => {
    setBrushColor(color);
    addToRecentColors(color);
  }, [setBrushColor, addToRecentColors]);

  const handleHexInput = (e) => {
    const val = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      handleColorChange(val);
    } else {
      // Allow typing in progress, update store only when valid
      setBrushColor(val);
    }
  };

  return (
    <div className="color-panel">

      {/* ─── SECTION 1: Current Color ─── */}
      <div className="cp-section">
        <div className="cp-label">Color</div>
        <div className="color-swatch-pair">
          <div className="swatch-stack">
            {/* Background/Secondary color (bottom) */}
            <div
              className="swatch-bg"
              style={{ background: secondaryColor }}
              onClick={swapColors}
              title="Secondary color — click to swap"
            />
            {/* Foreground/Primary color (top) */}
            <div
              className="swatch-fg"
              style={{ background: brushColor }}
              title="Primary color"
            />
            {/* Swap button */}
            <button className="swap-btn" onClick={swapColors} title="Swap colors (X)">
              <ArrowLeftRight size={9} />
            </button>
          </div>

          {/* Current hex label */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              {brushColor.toUpperCase()}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-hint)' }}>
              {Math.round(brushOpacity * 100)}% opacity
            </span>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: Color Picker ─── */}
      <div className="cp-section">
        <div className="cp-picker-wrap">
          <HexColorPicker
            color={brushColor}
            onChange={handleColorChange}
            style={{ width: '100%', height: '160px' }}
          />
        </div>
        <input
          className="cp-hex-input"
          value={brushColor}
          onChange={handleHexInput}
          maxLength={7}
          spellCheck={false}
        />
      </div>

      {/* ─── SECTION 3: Opacity ─── */}
      <div className="cp-section">
        <div className="cp-opacity-row">
          <span className="cp-label" style={{ marginBottom: 0 }}>Opacity</span>
          <span className="cp-opacity-value">{Math.round(brushOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          className="cp-range"
          min={0} max={100} step={1}
          value={Math.round(brushOpacity * 100)}
          onChange={(e) => setBrushOpacity(parseInt(e.target.value) / 100)}
        />
      </div>

      {/* ─── SECTION 4: Saved Palette ─── */}
      <div className="cp-section">
        <div className="cp-label">Palette</div>
        <div className="palette-grid">
          {palette.map((color, idx) => (
            <PaletteSwatch
              key={`${color}-${idx}`}
              color={color}
              isActive={brushColor === color}
              onClick={() => handleColorChange(color)}
              onLongPress={() => setPaletteColor(idx, brushColor)}
            />
          ))}
        </div>
        <button
          className="add-palette-btn"
          onClick={() => addToPalette(brushColor)}
        >
          + Add current color
        </button>
      </div>

      {/* ─── SECTION 5: Recent Colors ─── */}
      {recentColors.length > 0 && (
        <div className="cp-section">
          <div className="cp-label">Recent</div>
          <div className="recent-row">
            {recentColors.slice(0, 8).map((color, idx) => (
              <button
                key={`${color}-${idx}`}
                className="recent-swatch"
                style={{ background: color }}
                onClick={() => handleColorChange(color)}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
