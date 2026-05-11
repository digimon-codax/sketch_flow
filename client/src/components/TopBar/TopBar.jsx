import React, { useState, useEffect, useContext } from 'react';
import { Sparkles, BrainCircuit, Share2, X, Link, Check, CloudUpload, Download, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import { CanvasContext } from '../../canvas/SketchCanvas';
import { useCleanup } from '../../features/cleanup/useCleanup';
import { useArchAssist } from '../../features/assist/useArchAssist';
import { useCanvasStore } from '../../store/canvasStore';
import { useUIStore } from '../../store/uiStore';
import { useArtStore } from '../../art/artStore';
import ModeSwitcher from '../ModeSwitcher/ModeSwitcher';
import './TopBar.css';

const DiamondLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 12L12 22L22 12L12 2Z" />
  </svg>
);

const AVATAR_COLORS = ['#e03131','#1971c2','#2f9e44','#e67700','#9c36b5','#0c8599'];
function avatarColor(id = '') {
  return AVATAR_COLORS[id.toString().charCodeAt(0) % AVATAR_COLORS.length];
}

/* ─── Share Modal ────────────────────────────────────────────────────────── */
function ShareModal({ diagramId, onClose }) {
  const sfUser = (() => { try { return JSON.parse(localStorage.getItem('sf_user') ?? '{}'); } catch { return {}; } })();
  const currentUserId = (sfUser.id ?? sfUser._id ?? '').toString();

  const [members,       setMembers]       = useState([]);
  const [inviteEmail,   setInviteEmail]   = useState('');
  const [inviteRole,    setInviteRole]    = useState('editor');
  const [inviteError,   setInviteError]   = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [linkCopied,    setLinkCopied]    = useState(false);

  useEffect(() => {
    if (!diagramId) return;
    api.get('/diagrams/' + diagramId + '/members')
      .then(r => setMembers(r.data))
      .catch(console.error);
  }, [diagramId]);

  const amIOwner = members.some(m => m.userId?.toString() === currentUserId && m.role === 'owner');

  async function handleInvite() {
    if (!inviteEmail.trim()) { setInviteError('Enter an email address'); return; }
    setInviteLoading(true);
    setInviteError('');
    try {
      const { data } = await api.post('/diagrams/' + diagramId + '/members', {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setMembers(data);
      setInviteEmail('');
    } catch (err) {
      setInviteError(err.response?.data?.error ?? 'Failed to invite user');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(memberId, newRole) {
    try {
      const { data } = await api.patch(
        '/diagrams/' + diagramId + '/members/' + memberId,
        { role: newRole }
      );
      setMembers(data);
    } catch (err) {
      console.error('Role change failed', err);
    }
  }

  async function handleRemoveMember(memberId) {
    try {
      await api.delete('/diagrams/' + diagramId + '/members/' + memberId);
      setMembers(prev => prev.filter(m => m.userId?.toString() !== memberId?.toString()));
    } catch (err) {
      console.error('Remove failed', err);
    }
  }

  const inputStyle = {
    flex: 1,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 10px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const selectStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', width: 440, maxHeight: '80vh',
          overflowY: 'auto', padding: 24,
        }}
      >
        {/* Modal header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 16, color: 'var(--text-primary)' }}>
            Share diagram
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4, borderRadius: 4, display: 'flex' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Invite section ── */}
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 10 }}>
          Invite people
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="email"
            placeholder="colleague@example.com"
            value={inviteEmail}
            onChange={e => { setInviteEmail(e.target.value); setInviteError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
            style={inputStyle}
          />
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} style={{ ...selectStyle, width: 110 }}>
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button
            onClick={handleInvite}
            disabled={inviteLoading}
            style={{
              width: 80,
              background: 'var(--accent)', color: '#0d0d0d', fontWeight: 600,
              borderRadius: 'var(--radius-sm)', fontSize: 13,
              border: 'none', cursor: 'pointer',
              opacity: inviteLoading ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {inviteLoading
              ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#0d0d0d', animation: 'spin 0.8s linear infinite' }} />
              : 'Invite'
            }
          </button>
        </div>
        {inviteError && (
          <div style={{ color: 'var(--danger)', fontSize: 12, marginTop: 6 }}>{inviteError}</div>
        )}

        {/* ── Members section ── */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 12 }}>
            People with access
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.map(member => {
              const mId = member.userId?.toString();
              const isMe = mId === currentUserId;
              const color = avatarColor(mId);
              const initial = (member.name ?? '?').charAt(0).toUpperCase();
              return (
                <div key={mId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: 'white', flexShrink: 0,
                  }}>
                    {initial}
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {member.email}
                    </div>
                  </div>
                  {/* Role control */}
                  {amIOwner && !isMe ? (
                    <select
                      value={member.role}
                      onChange={e => handleRoleChange(mId, e.target.value)}
                      style={{ ...selectStyle, padding: '4px 6px', fontSize: 12 }}
                    >
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                      <option value="owner">Owner</option>
                    </select>
                  ) : isMe ? (
                    <span style={{ fontSize: 11, color: 'var(--text-hint)', fontFamily: 'JetBrains Mono' }}>(you)</span>
                  ) : (
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: 11,
                      fontFamily: 'JetBrains Mono',
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                    }}>
                      {member.role}
                    </span>
                  )}
                  {/* Remove */}
                  {amIOwner && !isMe && (
                    <button
                      onClick={() => handleRemoveMember(mId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--text-secondary)', display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Copy link section ── */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              readOnly
              value={window.location.href}
              style={{ ...inputStyle, color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', cursor: 'text' }}
              onClick={e => e.target.select()}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                border: linkCopied ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: linkCopied ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                color: linkCopied ? 'var(--accent)' : 'var(--text-secondary)',
                padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
                transition: 'var(--transition)',
              }}
            >
              {linkCopied ? <Check size={12} /> : <Link size={12} />}
              {linkCopied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── TopBar ─────────────────────────────────────────────────────────────── */
export default function TopBar({ diagramId, diagramName, saveState, artCanvasRef }) {
  const [isEditing,  setIsEditing]  = useState(false);
  const [name,       setName]       = useState(diagramName || 'Untitled Diagram');
  const [zoom,       setZoom]       = useState(100);
  const [shareOpen,  setShareOpen]  = useState(false);

  const fabricCanvasRef = useContext(CanvasContext);
  const { run: runCleanup, loading: cleanupLoading } = useCleanup(fabricCanvasRef);
  const { run: runAssist,  loading: assistLoading  } = useArchAssist(fabricCanvasRef);
  const userRole = useCanvasStore(s => s.userRole);
  const canvasMode = useCanvasStore(s => s.canvasMode);
  const navigate = useNavigate();
  const [artSaving, setArtSaving] = useState(false);
  const [artSaved,  setArtSaved]  = useState(false);

  useEffect(() => { if (diagramName) setName(diagramName); }, [diagramName]);

  useEffect(() => {
    if (!fabricCanvasRef?.current) return;
    const fc = fabricCanvasRef.current;
    const updateZoom = () => setZoom(Math.round(fc.getZoom() * 100));
    updateZoom();
    fc.on('mouse:wheel', updateZoom);
    return () => fc.off('mouse:wheel', updateZoom);
  }, [fabricCanvasRef]);

  const handleNameSave = async () => {
    setIsEditing(false);
    const finalName = name.trim() || 'Untitled Diagram';
    if (finalName !== diagramName && diagramId) {
      try {
        await api.patch(`/diagrams/${diagramId}`, { name: finalName });
        setName(finalName);
      } catch (err) {
        console.error('Failed to update name', err);
        setName(diagramName);
      }
    } else {
      setName(finalName);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleNameSave();
    if (e.key === 'Escape') { setIsEditing(false); setName(diagramName || 'Untitled Diagram'); }
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('sf_user');
    navigate('/login');
  };

  const handleSaveArt = async () => {
    if (!artCanvasRef?.current || !diagramId) return;
    setArtSaving(true);
    try {
      const { layers: layerList } = useArtStore.getState();

      // Build per-layer full-res dataURLs directly from live canvases
      const layersData = {};
      layerList.forEach(layer => {
        const lc = artCanvasRef.current.layerCanvases?.get(layer.id);
        if (lc && lc.width > 0) {
          layersData[layer.id] = lc.toDataURL('image/png');
        }
      });

      // Composite PNG for quick preview
      const dataURL = artCanvasRef.current.getCompositeDataURL();

      await api.patch(`/diagrams/${diagramId}`, {
        // Persist mode so page reopens in art mode on refresh
        appState: { canvasMode: 'art' },
        artData: {
          dataURL,
          layers: layersData,
          layerMeta: layerList,
          updatedAt: Date.now(),
        }
      });
      setArtSaved(true);
      useUIStore.getState().showToast('Artwork saved');
      setTimeout(() => setArtSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save artwork', err);
    } finally {
      setArtSaving(false);
    }
  };


  const handleExportArt = (format) => {
    if (!artCanvasRef?.current) return;
    const dataURL = artCanvasRef.current.getCompositeDataURL();
    if (!dataURL) return;
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    // Re-encode with correct mime if needed
    const link = document.createElement('a');
    link.download = `${name || 'artwork'}.${format}`;
    link.href = dataURL;
    link.click();
  };

  const sfUser = (() => { try { return JSON.parse(localStorage.getItem('sf_user') ?? localStorage.getItem('user') ?? '{}'); } catch { return {}; } })();
  const initial = (sfUser.name ?? 'U').charAt(0).toUpperCase();

  const spinnerEl = (
    <div className="spin-icon" style={{
      width: '14px', height: '14px', borderRadius: '50%',
      border: '2px solid rgba(212,168,83,0.3)',
      borderTopColor: 'var(--accent)',
    }} />
  );

  return (
    <>
      <div style={{
        height: '48px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: '12px',
        position: 'relative', zIndex: 200,
      }}>
        {/* Left */}
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
              onChange={e => setName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleKeyDown}
              style={{
                background: 'transparent', border: 'none',
                borderBottom: '1px solid var(--border-focus)',
                borderRadius: 0, padding: '2px 4px',
                width: 'auto', minWidth: '120px',
                fontFamily: 'Inter', fontWeight: 500,
                fontSize: '14px', color: 'var(--text-primary)', outline: 'none',
              }}
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '14px', color: 'var(--text-primary)', cursor: 'text', padding: '2px 4px' }}
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

        {/* Center — Mode switcher and AI buttons */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <ModeSwitcher />
          
          {userRole !== 'viewer' && canvasMode === 'diagram' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`feature-btn ${cleanupLoading ? 'loading' : ''}`}
                onClick={runCleanup}
                disabled={cleanupLoading}
              >
                {cleanupLoading ? spinnerEl : <Sparkles size={14} />}
                {cleanupLoading ? 'Cleaning...' : 'Cleanup'}
              </button>
              <button
                className={`feature-btn ${assistLoading ? 'loading' : ''}`}
                onClick={runAssist}
                disabled={assistLoading}
              >
                {assistLoading ? spinnerEl : <BrainCircuit size={14} />}
                {assistLoading ? 'Analyzing...' : 'Assist'}
              </button>
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px', fontFamily: 'JetBrains Mono' }}>
            {zoom}%
          </div>

          {/* Art mode: Save + Export buttons */}
          {canvasMode === 'art' && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`feature-btn ${artSaving ? 'loading' : ''}`}
                onClick={handleSaveArt}
                disabled={artSaving}
                style={artSaved ? { color: '#22c55e', borderColor: '#22c55e' } : {}}
              >
                {artSaving ? spinnerEl : <CloudUpload size={14} />}
                {artSaving ? 'Saving...' : artSaved ? '✓ Saved' : 'Save Art'}
              </button>

              <div style={{ position: 'relative' }} className="export-dropdown-wrap">
                <button
                  className="feature-btn"
                  onClick={(e) => {
                    const el = e.currentTarget.nextSibling;
                    el.style.display = el.style.display === 'flex' ? 'none' : 'flex';
                  }}
                >
                  <Download size={14} /> Export <ChevronDown size={12} />
                </button>
                <div style={{
                  display: 'none', flexDirection: 'column',
                  position: 'absolute', top: '36px', right: 0,
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '8px', padding: '4px', minWidth: '170px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 500,
                }}>
                  {[['png','Export as PNG'], ['jpeg','Export as JPEG']].map(([fmt, label]) => (
                    <button key={fmt}
                      onClick={() => { handleExportArt(fmt); }}
                      style={{
                        background: 'none', border: 'none', textAlign: 'left',
                        padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                        color: 'var(--text-primary)', fontSize: '13px',
                        fontFamily: 'Inter', whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => e.target.style.background = 'var(--bg-hover)'}
                      onMouseLeave={e => e.target.style.background = 'none'}
                    >{label}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <button className="feature-btn" onClick={() => setShareOpen(true)}>
            <Share2 size={14} /> Share
          </button>

          <div style={{ height: '20px', borderRight: '1px solid var(--border)', margin: '0 4px' }} />

          <div
            style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'var(--accent)', color: '#000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
            }}
            title="Sign out"
            onClick={handleSignOut}
          >
            {initial}
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareModal diagramId={diagramId} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
