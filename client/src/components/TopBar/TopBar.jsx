import React, { useState, useEffect, useContext } from 'react';
import { Sparkles, BrainCircuit, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { CanvasContext } from '../../canvas/SketchCanvas';
import { useCleanup } from '../../features/cleanup/useCleanup';
import { useArchAssist } from '../../features/assist/useArchAssist';
import './TopBar.css';

const DiamondLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 12L12 22L22 12L12 2Z" />
  </svg>
);

export default function TopBar({ diagramId, diagramName, saveState }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(diagramName || 'Untitled Diagram');
  const [zoom, setZoom] = useState(100);
  const [copied, setCopied] = useState(false);
  
  const fabricCanvasRef = useContext(CanvasContext);
  const { run: runCleanup, loading: cleanupLoading } = useCleanup(fabricCanvasRef);
  const { run: runAssist, loading: assistLoading } = useArchAssist(fabricCanvasRef);
  const navigate = useNavigate();

  // Sync external name changes
  useEffect(() => {
    if (diagramName) setName(diagramName);
  }, [diagramName]);

  // Read zoom level
  useEffect(() => {
    if (!fabricCanvasRef || !fabricCanvasRef.current) return;
    const fc = fabricCanvasRef.current;
    
    const updateZoom = () => {
      // Zoom is a float (e.g., 1 for 100%, 0.5 for 50%)
      setZoom(Math.round(fc.getZoom() * 100));
    };

    updateZoom();
    fc.on('mouse:wheel', updateZoom);
    return () => {
      fc.off('mouse:wheel', updateZoom);
    };
  }, [fabricCanvasRef]);

  const handleNameSave = async () => {
    setIsEditing(false);
    const finalName = name.trim() || 'Untitled Diagram';
    if (finalName !== diagramName && diagramId) {
      try {
        await api.patch(`/diagrams/${diagramId}`, { name: finalName });
        // The parent doesn't automatically refetch the single diagram, 
        // but normally we would update it or rely on a global store.
        setName(finalName);
      } catch (err) {
        console.error('Failed to update name', err);
        setName(diagramName); // revert on error
      }
    } else {
      setName(finalName);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleNameSave();
    if (e.key === 'Escape') {
      setIsEditing(false);
      setName(diagramName || 'Untitled Diagram');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Get current user for avatar
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : { name: 'User' };
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div style={{
      height: '48px',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '12px',
      position: 'relative',
      zIndex: 200
    }}>
      {/* Left Section */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <DiamondLogo />
        <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '16px', color: 'var(--accent)' }}>
          SketchFlow
        </span>
        <div style={{ height: '20px', borderRight: '1px solid var(--border)', margin: '0 4px' }} />
        
        {isEditing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--border-focus)',
              borderRadius: 0,
              padding: '2px 4px',
              width: 'auto',
              minWidth: '120px',
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: '14px',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        ) : (
          <div 
            onClick={() => setIsEditing(true)}
            style={{
              fontFamily: 'Inter',
              fontWeight: 500,
              fontSize: '14px',
              color: 'var(--text-primary)',
              cursor: 'text',
              padding: '2px 4px'
            }}
            title="Rename diagram"
          >
            {name}
          </div>
        )}

        {saveState && (
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
            {saveState === 'saving' ? 'Saving...' : 'Saved'}
          </div>
        )}
      </div>

      {/* Center Section */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px'
      }}>
        <button 
          className={`feature-btn ${cleanupLoading ? 'loading' : ''}`} 
          onClick={runCleanup}
          disabled={cleanupLoading}
        >
          {cleanupLoading ? (
            <div className="spin-icon" style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(212,168,83,0.3)',
              borderTopColor: 'var(--accent)'
            }} />
          ) : (
            <Sparkles size={14} />
          )}
          {cleanupLoading ? "Cleaning..." : "Cleanup"}
        </button>
        <button 
          className={`feature-btn ${assistLoading ? 'loading' : ''}`} 
          onClick={runAssist}
          disabled={assistLoading}
        >
          {assistLoading ? (
            <div className="spin-icon" style={{
              width: '14px', height: '14px', borderRadius: '50%',
              border: '2px solid rgba(212,168,83,0.3)',
              borderTopColor: 'var(--accent)'
            }} />
          ) : (
            <BrainCircuit size={14} />
          )}
          {assistLoading ? "Analyzing..." : "Assist"}
        </button>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
        
        {/* Zoom */}
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px', fontFamily: 'JetBrains Mono' }}>
          {zoom}%
        </div>

        {/* Share Button */}
        <button className="feature-btn" onClick={handleShare}>
          <Share2 size={14} /> {copied ? 'Copied!' : 'Share'}
        </button>

        <div style={{ height: '20px', borderRight: '1px solid var(--border)', margin: '0 4px' }} />

        {/* User Avatar & Dropdown */}
        <div 
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            position: 'relative'
          }}
          title="Sign out"
          onClick={handleSignOut}
        >
          {initial}
        </div>
      </div>
    </div>
  );
}
