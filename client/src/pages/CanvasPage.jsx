import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import SketchCanvas, { CanvasContext } from '../canvas/SketchCanvas';

function TopBar({ diagramId, diagramName }) {
  return (
    <div style={{ 
      height: '48px', 
      background: 'var(--bg-surface)', 
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      color: 'var(--text-primary)',
      fontWeight: '500'
    }}>
      {diagramName || 'Loading...'}
    </div>
  );
}

function LeftToolbar() {
  return (
    <div style={{ 
      width: '52px', 
      background: 'var(--bg-surface)', 
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '16px'
    }}>
      {/* Toolbar icons will go here */}
    </div>
  );
}

export default function CanvasPage() {
  const { id } = useParams();
  const [diagram, setDiagram] = useState(null);
  const [loading, setLoading] = useState(true);
  const fabricCanvasRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchDiagram = async () => {
      try {
        const res = await api.get(`/diagrams/${id}`);
        if (isMounted) {
          setDiagram(res.data);
        }
      } catch (err) {
        console.error('Failed to load diagram', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDiagram();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'var(--bg-base)'
      }}>
        {/* Simple spinner */}
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  return (
    <CanvasContext.Provider value={fabricCanvasRef}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
        <TopBar diagramId={diagram?._id} diagramName={diagram?.name} />
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <LeftToolbar />
          <SketchCanvas setFabricCanvasRef={(ref) => { fabricCanvasRef.current = ref.current; }} />
        </div>
      </div>
    </CanvasContext.Provider>
  );
}
