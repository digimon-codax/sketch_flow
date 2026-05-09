import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      margin: 0,
      padding: 0
    }}>
      <div style={{
        fontFamily: '"Syne", sans-serif',
        fontWeight: 800,
        fontSize: '96px',
        color: 'var(--border)',
        lineHeight: 1
      }}>
        404
      </div>
      <div style={{
        fontFamily: '"Syne", sans-serif',
        fontWeight: 600,
        fontSize: '24px',
        color: 'var(--text-primary)',
        marginTop: '16px'
      }}>
        Page not found
      </div>
      <button 
        onClick={() => navigate('/')}
        style={{
          marginTop: '32px',
          background: 'var(--accent)',
          color: '#0d0d0d',
          fontWeight: 600,
          padding: '12px 24px',
          borderRadius: 'var(--radius)',
          fontSize: '14px',
          border: 'none',
          cursor: 'pointer'
        }}
      >
        Go to Dashboard
      </button>
    </div>
  );
}
