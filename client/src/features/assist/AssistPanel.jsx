import React from 'react';
import { BrainCircuit, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore.js';

export default function AssistPanel() {
  const assistResult = useUIStore(s => s.assistResult);
  const clearAssistResult = useUIStore(s => s.clearAssistResult);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: '340px',
      background: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      zIndex: 500,
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      transform: assistResult ? 'translateY(0)' : 'translateY(100%)',
    }}>
      {/* Panel header */}
      <div style={{
        height: '52px',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Left group */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BrainCircuit size={16} color="var(--accent)" />
          <span style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
            Architecture Analysis
          </span>
          {assistResult && (
            <div style={{
              background: 'var(--accent-dim)',
              color: 'var(--accent)',
              border: '1px solid rgba(212,168,83,0.3)',
              padding: '2px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono'
            }}>
              {assistResult.scalabilityScore}/10
            </div>
          )}
        </div>

        {/* Center */}
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: '12px',
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '500px'
        }}>
          {assistResult?.summary}
        </div>

        {/* Right */}
        <button 
          onClick={clearAssistResult}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <X size={16} />
        </button>
      </div>

      {/* Suggestions scroll area */}
      <div className="assist-scroll-area" style={{
        flex: 1,
        overflow: 'hidden',
        padding: '16px 20px',
        display: 'flex',
        gap: '12px',
        overflowX: 'auto',
        alignItems: 'flex-start',
        scrollbarWidth: 'none', // Firefox
      }}>
        <style>
          {`
            .assist-scroll-area::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        
        {assistResult?.suggestions?.map((sug, i) => {
          let badgeBg = 'rgba(39,174,96,0.15)';
          let badgeColor = '#2d9';
          let badgeBorder = 'rgba(39,174,96,0.3)';
          
          if (sug.severity === 'high') {
            badgeBg = 'rgba(192,57,43,0.15)';
            badgeColor = '#e55';
            badgeBorder = 'rgba(192,57,43,0.3)';
          } else if (sug.severity === 'medium') {
            badgeBg = 'rgba(230,115,0,0.15)';
            badgeColor = '#e90';
            badgeBorder = 'rgba(230,115,0,0.3)';
          }

          return (
            <div key={i} style={{
              width: '220px',
              flexShrink: 0,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono',
                  background: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeBorder}`
                }}>
                  {sug.severity}
                </div>
                <div style={{
                  color: 'var(--text-hint)',
                  fontSize: '10px',
                  marginLeft: 'auto',
                  fontFamily: 'JetBrains Mono',
                  textTransform: 'uppercase'
                }}>
                  {sug.type}
                </div>
              </div>

              <div style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>
                {sug.title}
              </div>

              <div style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {sug.description}
              </div>

              <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '8px',
                marginTop: '4px',
                color: 'var(--accent)',
                fontSize: '12px',
                lineHeight: 1.4
              }}>
                → {sug.recommendation}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
