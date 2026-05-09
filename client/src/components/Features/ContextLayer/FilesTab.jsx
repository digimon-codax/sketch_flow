import React, { useRef, useState } from 'react';
import { Upload, ImageIcon, FileText, File, Download, Trash2 } from 'lucide-react';
import api from '../../../api';

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FilesTab({ diagramId, elementId, files = [], onRefresh, isReadOnly = false }) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const uploadFile = async (file) => {
    if (!file || isReadOnly) return;
    if (file.size > 10 * 1024 * 1024) { setError('File is too large (max 10MB)'); return; }
    setError('');
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/context/${diagramId}/${elementId}/files`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteFile = async (fileId) => {
    if (isReadOnly) return;
    try {
      await api.delete(`/context/${diagramId}/${elementId}/files/${fileId}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      setError('Failed to delete file');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return <ImageIcon size={14} color="var(--text-secondary)" />;
    if (mimeType === 'application/pdf' || mimeType?.startsWith('text/')) return <FileText size={14} color="var(--text-secondary)" />;
    return <File size={14} color="var(--text-secondary)" />;
  };

  const getDownloadUrl = (url) => {
    if (url?.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    return `${apiUrl}${url}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Dropzone — hidden for viewer */}
      {!isReadOnly && (
        <div
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); uploadFile(e.dataTransfer.files[0]); }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
            backgroundColor: isDragging ? 'var(--accent-dim)' : 'transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '20px', textAlign: 'center', cursor: 'pointer',
            marginBottom: '12px', transition: 'all var(--transition)',
          }}
        >
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={(e) => uploadFile(e.target.files[0])} />
          {uploading ? (
            <div style={{ padding: '4px 0' }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              <Upload size={20} color="var(--text-hint)" style={{ margin: '0 auto' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-hint)', marginTop: '6px' }}>Drop a file or click to browse</div>
              <div style={{ fontSize: '10px', color: 'var(--text-hint)', marginTop: '4px' }}>Max 10MB</div>
            </>
          )}
        </div>
      )}

      {error && <div style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '8px', textAlign: 'center' }}>{error}</div>}

      {/* File list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {files.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-hint)', fontSize: '12px', marginTop: '10px' }}>No files added</div>
        ) : (
          files.map(f => (
            <div key={f._id || f.id} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', background: 'var(--bg-elevated)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            }}>
              {getFileIcon(f.mimeType || f.type)}
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-primary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.originalName || f.name}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-hint)' }}>{formatFileSize(f.size)}</span>
              </div>
              <a
                href={getDownloadUrl(f.url)} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', color: 'var(--text-secondary)' }}
              >
                <Download
                  size={14}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                />
              </a>
              {!isReadOnly && (
                <button
                  onClick={() => deleteFile(f._id || f.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                >
                  <Trash2
                    size={14} color="var(--text-secondary)"
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--danger)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}