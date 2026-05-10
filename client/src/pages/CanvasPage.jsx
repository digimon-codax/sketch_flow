import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { fabric } from 'fabric';
import { EyeOff } from 'lucide-react';
import api from '../api';
import SketchCanvas, { CanvasContext } from '../canvas/SketchCanvas';
import { useCanvasStore } from '../store/canvasStore';
import { useUIStore } from '../store/uiStore';
import LeftToolbar from '../components/LeftToolbar/LeftToolbar';
import PropertiesPanel from '../components/PropertiesPanel/PropertiesPanel';
import TopBar from '../components/TopBar/TopBar';
import CollabCursors from '../components/CollabCursors/CollabCursors';
import ContextDrawer from '../components/Features/ContextLayer/ContextDrawer';
import AssistPanel from '../features/assist/AssistPanel';
import { deserializeCanvas } from '../canvas/serialize';
import { useWebSocket } from '../hooks/useWebSocket';
import { useCollaboration } from '../hooks/useCollaboration';

const serializeSingleObject = (obj) => {
  let pathData = null;
  if (obj.type === 'path') pathData = obj.get('path');
  return {
    id: obj.id,
    type: obj.shapeType,
    left: obj.left,
    top: obj.top,
    width: obj.width,
    height: obj.height,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle ?? 0,
    text: obj.text ?? '',
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily,
    stroke: obj.stroke ?? '#f0ede8',
    fill: obj.fill ?? 'transparent',
    strokeWidth: obj.strokeWidth ?? 1.5,
    strokeDashArray: obj.strokeDashArray ?? null,
    opacity: obj.opacity ?? 1,
    pathData: pathData,
    pathOffset: obj.pathOffset,
    customProps: obj.customProps ? JSON.parse(JSON.stringify(obj.customProps)) : null,
  };
};

export default function CanvasPage() {
  const { id } = useParams();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const [canvasReady, setCanvasReady] = useState(false);
  const [saveState, setSaveState] = useState(''); // 'saving' | 'saved' | ''
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [myRole, setMyRole] = useState('editor');
  
  const fabricCanvasRef = useRef(null);
  const historyRef = useRef(null);
  const clipboardRef = useRef([]);

  const ws = useWebSocket(import.meta.env.VITE_WS_URL || 'ws://localhost:3001');
  useCollaboration(fabricCanvasRef, id, ws);

  useEffect(() => {
    let isMounted = true;
    const fetchDiagram = async () => {
      try {
        const res = await api.get(`/diagrams/${id}`);
        if (isMounted) {
          setDiagram(res.data);

          // Detect role
          const sfUser = (() => { try { return JSON.parse(localStorage.getItem('sf_user') ?? '{}'); } catch { return {}; } })();
          const currentUserId = (sfUser.id ?? sfUser._id ?? '').toString();
          const myMember = res.data.members?.find(m => {
            const mId = (m.userId?._id ?? m.userId)?.toString();
            return mId === currentUserId;
          });
          const role = myMember?.role ?? 'viewer';
          setMyRole(role);
          useCanvasStore.getState().setUserRole(role);
        }
      } catch (err) {
        console.error('Failed to load diagram', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchDiagram();
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    let debounceSnap = null;
    
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      const { setActiveTool } = useCanvasStore.getState();
      const fc = fabricCanvasRef.current;
      if (!fc) return;

      const triggerSnap = () => {
        if (debounceSnap) clearTimeout(debounceSnap);
        debounceSnap = setTimeout(() => {
          if (historyRef.current) {
            historyRef.current.snapshot(() => fc.getObjects().filter(o => o.id && (o.shapeType || o.type === 'path')).map(serializeSingleObject));
          }
        }, 300);
      };

      if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
        switch (e.key) {
          case 'v': setActiveTool('select'); break;
          case 'r': setActiveTool('rect'); break;
          case 'e': setActiveTool('ellipse'); break;
          case 'd': setActiveTool('diamond'); break;
          case 'a': setActiveTool('arrow'); break;
          case 'l': setActiveTool('line'); break;
          case 'p': setActiveTool('pencil'); break;
          case 't': setActiveTool('text'); break;
          case 'h': setActiveTool('hand'); break;
          case 'Backspace':
          case 'Delete':
            const activeObjs = fc.getActiveObjects();
            if (activeObjs.length) {
              activeObjs.forEach(o => fc.remove(o));
              fc.discardActiveObject();
              fc.requestRenderAll();
              triggerSnap();
            }
            break;
          case 'Escape':
            fc.discardActiveObject();
            fc.requestRenderAll();
            setActiveTool('select');
            useUIStore.getState().setDrawerOpen(false);
            useUIStore.getState().setSelectedElementId(null);
            break;
          case 'ArrowLeft':
          case 'ArrowRight':
          case 'ArrowUp':
          case 'ArrowDown':
            e.preventDefault();
            const nudge = e.shiftKey ? 10 : 1;
            fc.getActiveObjects().forEach(obj => {
              if (e.key === 'ArrowLeft') obj.set({ left: obj.left - nudge });
              if (e.key === 'ArrowRight') obj.set({ left: obj.left + nudge });
              if (e.key === 'ArrowUp') obj.set({ top: obj.top - nudge });
              if (e.key === 'ArrowDown') obj.set({ top: obj.top + nudge });
              obj.setCoords();
            });
            fc.requestRenderAll();
            triggerSnap();
            break;
        }
      } else if (e.shiftKey && !e.ctrlKey && !e.metaKey) {
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
          e.preventDefault();
          const nudge = 10;
          fc.getActiveObjects().forEach(obj => {
            if (e.key === 'ArrowLeft') obj.set({ left: obj.left - nudge });
            if (e.key === 'ArrowRight') obj.set({ left: obj.left + nudge });
            if (e.key === 'ArrowUp') obj.set({ top: obj.top - nudge });
            if (e.key === 'ArrowDown') obj.set({ top: obj.top + nudge });
            obj.setCoords();
          });
          fc.requestRenderAll();
          triggerSnap();
        }
      }

      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              historyRef.current?.redo(els => deserializeCanvas(fc, els));
            } else {
              historyRef.current?.undo(els => deserializeCanvas(fc, els));
            }
            break;
          case 'y':
            e.preventDefault();
            historyRef.current?.redo(els => deserializeCanvas(fc, els));
            break;
          case 'a':
            e.preventDefault();
            const all = fc.getObjects().filter(o => o.id && o.shapeType);
            if (all.length > 0) {
              fc.setActiveObject(new fabric.ActiveSelection(all, { canvas: fc }));
            }
            fc.requestRenderAll();
            break;
          case 'c':
            clipboardRef.current = fc.getActiveObjects().map(o => ({
              ...serializeSingleObject(o),
              id: null
            }));
            break;
          case 'v':
            if (!clipboardRef.current?.length) return;
            fc.discardActiveObject();
            const newIds = [];
            clipboardRef.current.forEach(el => {
              const shifted = { ...el, x: el.left + 20, y: el.top + 20, id: crypto.randomUUID() };
              shifted.left = shifted.x;
              shifted.top = shifted.y;
              newIds.push(shifted);
            });
            deserializeCanvas(fc, newIds.concat(fc.getObjects().filter(o => o.id && o.shapeType).map(serializeSingleObject)));
            
            triggerSnap();
            
            clipboardRef.current = clipboardRef.current.map(el => ({
              ...el,
              left: el.left + 20,
              top: el.top + 20
            }));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (debounceSnap) clearTimeout(debounceSnap);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const isReadOnly = myRole === 'viewer';

  return (
    <CanvasContext.Provider value={fabricCanvasRef}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', position: 'relative' }}>
        <TopBar diagramId={diagram?._id} diagramName={diagram?.name} saveState={saveState} />

        {/* Viewer banner */}
        {isReadOnly && (
          <div style={{
            height: 32, background: 'var(--accent-dim)',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, flexShrink: 0,
          }}>
            <EyeOff size={12} color="var(--accent)" />
            <span style={{ fontSize: 12, color: 'var(--accent)', fontFamily: 'Inter, sans-serif' }}>
              View only — you don't have edit access to this diagram
            </span>
          </div>
        )}

        <PropertiesPanel canvasReady={canvasReady} />
        <CollabCursors />
        <ContextDrawer diagramId={id} isReadOnly={isReadOnly} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <LeftToolbar />
          <SketchCanvas 
            diagramId={id}
            initialElements={diagram?.elements}
            setSaveState={setSaveState}
            setHistoryRef={(h) => historyRef.current = h}
            setFabricCanvasRef={(ref) => { 
              fabricCanvasRef.current = ref.current; 
              setCanvasReady(true);
            }} 
          />
        </div>
        <AssistPanel />

        {/* Shortcuts Help Button */}
        <button 
          onClick={() => setShowShortcuts(true)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            zIndex: 300,
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ?
        </button>

        {/* Shortcuts Modal */}
        {showShortcuts && (
          <div 
            onClick={() => setShowShortcuts(false)}
            style={{
              position: 'fixed',
              top: 0, left: 0, width: '100vw', height: '100vh',
              background: 'rgba(0,0,0,0.4)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                width: '600px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', fontFamily: '"Syne", sans-serif' }}>Keyboard Shortcuts</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { key: 'v', desc: 'Select Tool' },
                  { key: 'r', desc: 'Rectangle' },
                  { key: 'e', desc: 'Ellipse' },
                  { key: 'd', desc: 'Diamond' },
                  { key: 'a', desc: 'Arrow' },
                  { key: 'l', desc: 'Line' },
                  { key: 'p', desc: 'Pencil' },
                  { key: 't', desc: 'Text' },
                  { key: 'h', desc: 'Hand Tool' },
                  { key: 'Delete', desc: 'Delete Selected' },
                  { key: 'Escape', desc: 'Deselect All' },
                  { key: 'Ctrl+A', desc: 'Select All' },
                  { key: 'Ctrl+C', desc: 'Copy' },
                  { key: 'Ctrl+V', desc: 'Paste' },
                  { key: 'Ctrl+Z', desc: 'Undo' },
                  { key: 'Ctrl+Y', desc: 'Redo' },
                  { key: 'Arrows', desc: 'Nudge 1px' },
                  { key: 'Shift+Arrows', desc: 'Nudge 10px' },
                ].map(s => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontFamily: '"JetBrains Mono", monospace',
                      fontSize: '12px',
                      color: 'var(--text-primary)'
                    }}>
                      {s.key}
                    </div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {s.desc}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </CanvasContext.Provider>
  );
}
