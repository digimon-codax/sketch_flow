import React, { useState, useEffect } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';

export default function LinksTab({ links = [], onSave }) {
  const [localLinks, setLocalLinks] = useState(links);
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setLocalLinks(links || []);
  }, [links]);

  const addLink = () => {
    if (!inputVal) return;
    
    let validUrl = inputVal;
    if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
      validUrl = 'https://' + validUrl;
    }
    
    try {
      new URL(validUrl);
    } catch (_) {
      setError('Enter a valid URL');
      return;
    }
    
    const newLinks = [...localLinks, validUrl];
    setLocalLinks(newLinks);
    onSave(newLinks);
    setInputVal('');
    setError('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLink();
    }
  };

  const removeLink = (index) => {
    const newLinks = [...localLinks];
    newLinks.splice(index, 1);
    setLocalLinks(newLinks);
    onSave(newLinks);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input 
          type="url" 
          placeholder="https://example.com"
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setError('');
          }}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 10px',
            fontSize: '12px',
            outline: 'none'
          }}
        />
        <button 
          onClick={addLink}
          style={{
            background: 'var(--accent)',
            color: '#0d0d0d',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            whiteSpace: 'nowrap',
            fontSize: '12px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Add
        </button>
      </div>
      {error && <div style={{ color: 'var(--danger)', fontSize: '10px', marginTop: '4px' }}>{error}</div>}

      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {localLinks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-hint)', fontSize: '12px', marginTop: '20px' }}>
            No links added
          </div>
        ) : (
          localLinks.map((link, i) => {
            let hostname = link;
            try {
              hostname = new URL(link).hostname;
            } catch(e) {}
            
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <ExternalLink size={12} color="var(--text-secondary)" />
                <a 
                  href={link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    color: 'var(--accent)',
                    fontSize: '12px',
                    flex: 1,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: '200px',
                    textDecoration: 'none'
                  }}
                  title={link}
                >
                  {hostname}
                </a>
                <button 
                  onClick={() => removeLink(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px'
                  }}
                >
                  <Trash2 size={14} color="var(--text-secondary)" 
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}