import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Upload } from 'lucide-react';
import api from '../api';
import '../styles/dashboard.css';

export default function Dashboard() {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  // Parse user from local storage safely
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('sf_user')) || {};
    } catch {
      return {};
    }
  })();

  const fetchDiagrams = async () => {
    setLoading(true);
    try {
      const res = await api.get('/diagrams');
      setDiagrams(res.data);
    } catch (err) {
      console.error('Failed to fetch diagrams', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagrams();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_user');
    navigate('/login');
  };

  const handleNewDiagram = async () => {
    setCreating(true);
    try {
      const res = await api.post('/diagrams', { name: 'Untitled Diagram' });
      navigate(`/canvas/${res.data._id}`);
    } catch (err) {
      console.error('Failed to create diagram', err);
      setCreating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Prevent navigating to the diagram
    if (!window.confirm('Are you sure you want to delete this diagram?')) return;
    
    try {
      await api.delete(`/diagrams/${id}`);
      fetchDiagrams();
    } catch (err) {
      console.error('Failed to delete diagram', err);
      alert('Could not delete diagram. Are you sure you are the owner?');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="dash-container">
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <div className="dash-nav-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 12L12 22L22 12L12 2Z" fill="var(--accent)" />
            </svg>
            SketchFlow
          </div>
        </div>
        <div className="dash-nav-right">
          <span className="dash-nav-user">{user.name || 'User'}</span>
          <button onClick={handleSignOut} className="dash-nav-signout">Sign out</button>
        </div>
      </nav>

      <main className="dash-body">
        <div className="dash-header-row">
          <h1 className="dash-title">Your Diagrams</h1>
          <button 
            className="btn-new" 
            onClick={handleNewDiagram}
            disabled={creating}
          >
            {creating ? 'Creating...' : '+ New Diagram'}
          </button>
        </div>

        {loading ? (
          <div className="dash-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="dash-card skeleton-pulse" style={{ pointerEvents: 'none' }}>
                <div className="skeleton-text"></div>
                <div className="skeleton-preview"></div>
                <div className="skeleton-bottom"></div>
              </div>
            ))}
          </div>
        ) : diagrams.length === 0 ? (
          <div className="dash-empty">
            <Upload size={48} className="dash-empty-icon" strokeWidth={1.5} />
            <h2 className="dash-empty-title">No diagrams yet</h2>
            <p className="dash-empty-text">Create your first diagram to get started</p>
            <button 
              className="btn-new" 
              onClick={handleNewDiagram}
              disabled={creating}
            >
              {creating ? 'Creating...' : '+ New Diagram'}
            </button>
          </div>
        ) : (
          <div className="dash-grid">
            {diagrams.map((diagram) => (
              <div 
                key={diagram._id} 
                className="dash-card"
                onClick={() => navigate(`/canvas/${diagram._id}`)}
              >
                <div className="dash-card-name" title={diagram.name}>
                  {diagram.name}
                </div>
                
                <div className="dash-card-preview">
                  <span className="dash-card-preview-text">
                    {diagram.elements?.length > 0 
                      ? `[${diagram.elements.length}] elements` 
                      : 'Empty canvas'}
                  </span>
                </div>
                
                <div className="dash-card-bottom">
                  <span className="dash-card-date">
                    {formatDate(diagram.updatedAt || diagram.createdAt)}
                  </span>
                  <button 
                    className="dash-card-trash" 
                    onClick={(e) => handleDelete(e, diagram._id)}
                    title="Delete diagram"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
