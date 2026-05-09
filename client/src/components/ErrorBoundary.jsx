import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          background: 'var(--bg-base)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <AlertTriangle size={48} color="var(--danger)" />
          <div style={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 600,
            fontSize: '24px',
            color: 'var(--text-primary)',
            marginTop: '16px'
          }}>
            Something went wrong
          </div>
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            marginTop: '8px',
            fontFamily: 'monospace',
            maxWidth: '80%',
            wordWrap: 'break-word',
            textAlign: 'center'
          }}>
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => {
              this.setState({ hasError: false });
              window.location.href = '/';
            }}
            style={{
              marginTop: '24px',
              background: 'var(--accent)',
              color: '#0d0d0d',
              fontWeight: 600,
              padding: '10px 20px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
