import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Edit2, Copy, Trash2 } from 'lucide-react';
import api from '../api/index';
import { useAuthStore } from '../store/authStore';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* ─── Thumbnail sub-component ──────────────────────────────────────────── */
function DiagramThumbnail({ elements }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !elements?.length) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 140, 90);

    const minX = Math.min(...elements.map(e => e.x ?? 0));
    const minY = Math.min(...elements.map(e => e.y ?? 0));
    const maxX = Math.max(...elements.map(e => (e.x ?? 0) + (e.width || 60)));
    const maxY = Math.max(...elements.map(e => (e.y ?? 0) + (e.height || 40)));

    const contentW = maxX - minX || 1;
    const contentH = maxY - minY || 1;

    const scaleX = 130 / contentW;
    const scaleY = 80 / contentH;
    const scale = Math.min(scaleX, scaleY, 1);

    const offsetX = (140 - contentW * scale) / 2 - minX * scale;
    const offsetY = (90 - contentH * scale) / 2 - minY * scale;

    ctx.strokeStyle = 'rgba(240, 237, 232, 0.25)';
    ctx.fillStyle   = 'rgba(240, 237, 232, 0.07)';
    ctx.lineWidth   = 0.8;

    elements.forEach(el => {
      if (el.x == null) return;
      const x = el.x * scale + offsetX;
      const y = el.y * scale + offsetY;
      const w = (el.width  || 60) * scale;
      const h = (el.height || 40) * scale;

      ctx.beginPath();
      if (el.type === 'ellipse') {
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      } else if (el.type === 'line' || el.type === 'arrow') {
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y + h);
      } else {
        ctx.roundRect ? ctx.roundRect(x, y, w, h, 2) : ctx.rect(x, y, w, h);
      }
      ctx.fill();
      ctx.stroke();
    });
  }, [elements]);

  if (!elements?.length) {
    return (
      <div style={{
        height: 90, background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-hint)', fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        Empty canvas
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={140}
      height={90}
      style={{
        width: '100%', height: 90,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-elevated)',
        display: 'block',
      }}
    />
  );
}

/* ─── Main Dashboard ───────────────────────────────────────────────────── */
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const sfUser = (() => { try { return JSON.parse(localStorage.getItem('sf_user') ?? '{}'); } catch { return {}; } })();
  const currentUserId = sfUser.id ?? sfUser._id ?? '';

  const [diagrams,     setDiagrams]     = useState([]);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [sortOption,   setSortOption]   = useState('newest');
  const [editingId,    setEditingId]    = useState(null);
  const [editingName,  setEditingName]  = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [creating,     setCreating]     = useState(false);
  const [newName,      setNewName]      = useState('');
  const [showNew,      setShowNew]      = useState(false);

  useEffect(() => {
    api.get('/diagrams')
      .then(r => setDiagrams(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  /* ── Derived list ─────────────────────────────────────────────────── */
  const displayDiagrams = useMemo(() => {
    let list = [...diagrams];
    if (searchQuery.trim()) {
      list = list.filter(d =>
        d.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
    }
    switch (sortOption) {
      case 'newest': list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
      case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'az':     list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'za':     list.sort((a, b) => b.name.localeCompare(a.name)); break;
    }
    return list;
  }, [diagrams, searchQuery, sortOption]);

  /* ── Actions ──────────────────────────────────────────────────────── */
  async function createDiagram(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/diagrams', { name: newName.trim() });
      navigate(`/d/${data._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id) {
    if (!editingName.trim()) { setEditingId(null); return; }
    try {
      await api.patch('/diagrams/' + id, { name: editingName.trim() });
      setDiagrams(prev => prev.map(d =>
        d._id === id ? { ...d, name: editingName.trim() } : d
      ));
    } catch (err) {
      console.error('Rename failed', err);
    } finally {
      setEditingId(null);
    }
  }

  async function duplicateDiagram(e, id) {
    e.stopPropagation();
    try {
      const { data: source } = await api.get('/diagrams/' + id);
      const { data: copy }   = await api.post('/diagrams', { name: source.name + ' (copy)' });
      await api.patch('/diagrams/' + copy._id, {
        elements: source.elements,
        appState: source.appState,
      });
      setDiagrams(prev => [{ ...copy, elements: source.elements }, ...prev]);
    } catch (err) {
      console.error('Duplicate failed', err);
    }
  }

  async function confirmDelete() {
    try {
      await api.delete('/diagrams/' + deleteTarget.id);
      setDiagrams(prev => prev.filter(d => d._id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed', err);
    }
  }

  /* ── Styles ───────────────────────────────────────────────────────── */
  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    paddingRight: 16,
  };

  const btnStyle = (variant = 'secondary') => ({
    padding: '8px 20px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: variant === 'danger' ? 600 : 400,
    cursor: 'pointer',
    border: variant === 'danger' ? 'none' : '1px solid var(--border)',
    background: variant === 'danger' ? 'var(--danger)' : 'transparent',
    color: variant === 'danger' ? 'white' : 'var(--text-secondary)',
    transition: 'var(--transition)',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'Inter, sans-serif' }}>
      {/* ── Inline styles ─────────────────────────────────── */}
      <style>{`
        .card-title-row:hover .rename-btn { opacity: 1 !important; }
        .card-action-btn { opacity: 0; transition: opacity 0.15s; }
        .dash-card:hover .card-action-btn { opacity: 1; }
      `}</style>

      {/* ── Header ──────────────────────────────────────── */}
      <header style={{
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--accent)">
            <path d="M12 2L2 12L12 22L22 12L12 2Z" />
          </svg>
          <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 16, color: 'var(--accent)' }}>
            SketchFlow
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{user?.name}</span>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────── */}
      <main style={{ maxWidth: 1040, margin: '0 auto', padding: '40px 24px' }}>

        {/* Title + New */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Syne', margin: 0 }}>
              My Diagrams
            </h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              {diagrams.length} diagram{diagrams.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{
              background: 'var(--accent)', color: '#0d0d0d',
              fontWeight: 600, padding: '9px 18px',
              borderRadius: 'var(--radius-sm)', fontSize: 13,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> New diagram
          </button>
        </div>

        {/* Search + Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
            <Search
              size={14}
              color="var(--text-hint)"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              placeholder="Search diagrams..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingLeft: 34, boxSizing: 'border-box' }}
            />
          </div>
          <select
            value={sortOption}
            onChange={e => setSortOption(e.target.value)}
            style={selectStyle}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A → Z</option>
            <option value="za">Z → A</option>
          </select>
        </div>

        {/* Content area */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
            <div style={{
              width: 36, height: 36,
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : diagrams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>No diagrams yet.</p>
            <button
              onClick={() => setShowNew(true)}
              style={{ marginTop: 12, background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}
            >
              Create your first diagram →
            </button>
          </div>
        ) : displayDiagrams.length === 0 ? (
          /* Empty search state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 0', gap: 8 }}>
            <Search size={24} color="var(--text-hint)" />
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0 }}>
              No diagrams match "{searchQuery}"
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {displayDiagrams.map(d => {
              const isOwner = d.members?.some(m => {
                const mId = (m.userId?._id ?? m.userId)?.toString();
                return mId === currentUserId && m.role === 'owner';
              });

              return (
                <div
                  key={d._id}
                  className="dash-card"
                  onClick={() => navigate(`/d/${d._id}`)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(212,168,83,0.4)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Shared badge */}
                  {!isOwner && (
                    <div style={{
                      position: 'absolute', top: 12, right: 12,
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-hint)', fontSize: 10,
                      fontFamily: 'JetBrains Mono, monospace',
                      padding: '2px 8px', borderRadius: 4,
                    }}>
                      Shared with you
                    </div>
                  )}

                  {/* Thumbnail */}
                  <div style={{ marginBottom: 14 }}>
                    <DiagramThumbnail elements={d.elements} />
                  </div>

                  {/* Title row */}
                  <div className="card-title-row" style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', marginBottom: 4 }}>
                    {editingId === d._id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onBlur={() => saveRename(d._id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveRename(d._id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{
                          fontSize: 14, fontWeight: 500,
                          padding: '2px 4px',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--border-focus)',
                          borderRadius: 0, width: '100%', outline: 'none',
                          color: 'var(--text-primary)',
                        }}
                      />
                    ) : (
                      <>
                        <span style={{
                          fontWeight: 500, fontSize: 15,
                          color: 'var(--text-primary)',
                          flex: 1, overflow: 'hidden',
                          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {d.name}
                        </span>
                        <button
                          className="rename-btn"
                          onClick={e => { e.stopPropagation(); setEditingId(d._id); setEditingName(d.name); }}
                          style={{ opacity: 0, transition: 'opacity 0.15s', padding: 4, background: 'none', border: 'none', color: 'var(--text-secondary)', borderRadius: 4, cursor: 'pointer' }}
                          title="Rename"
                        >
                          <Edit2 size={12} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Footer row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-hint)' }}>
                      {timeAgo(d.updatedAt)}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="card-action-btn"
                        onClick={e => duplicateDiagram(e, d._id)}
                        title="Duplicate"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="card-action-btn"
                        onClick={e => { e.stopPropagation(); setDeleteTarget({ id: d._id, name: d.name }); }}
                        title="Delete"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── New diagram modal ─────────────────────────────── */}
      {showNew && (
        <div
          onClick={() => { setShowNew(false); setNewName(''); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 28, width: 360,
            }}
          >
            <h2 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', marginTop: 0, marginBottom: 16 }}>
              New diagram
            </h2>
            <form onSubmit={createDiagram}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. System Architecture"
                style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => { setShowNew(false); setNewName(''); }} style={{ ...btnStyle('secondary'), flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  style={{ ...btnStyle('danger'), flex: 1, background: 'var(--accent)', color: '#0d0d0d', opacity: (creating || !newName.trim()) ? 0.6 : 1 }}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────── */}
      {deleteTarget && (
        <div
          onClick={() => setDeleteTarget(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 28, width: 360,
            }}
          >
            <h2 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 18, color: 'var(--text-primary)', marginTop: 0, marginBottom: 10 }}>
              Delete diagram?
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              This will permanently delete{' '}
              <strong style={{ color: 'var(--text-primary)' }}>"{deleteTarget.name}"</strong>
              {' '}and all its context data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
              <button onClick={() => setDeleteTarget(null)} style={btnStyle('secondary')}>
                Cancel
              </button>
              <button onClick={confirmDelete} style={btnStyle('danger')}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
