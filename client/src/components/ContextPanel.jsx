import { useState, useEffect } from 'react';
import { getContext, updateContext, uploadFile, deleteFile } from '../api/contextApi';

export const ContextPanel = ({ activeObject, diagramId }) => {
  const [activeTab, setActiveTab] = useState('notes');
  const [context, setContext] = useState({ notes: '', codeSnippet: '', links: [], files: [] });
  const [newLink, setNewLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!activeObject || !activeObject.contextId) return;
    
    let active = true;
    setIsLoading(true);
    
    getContext(activeObject.contextId).then(data => {
      if (active) {
        setContext(data);
        setIsLoading(false);
      }
    }).catch(() => {
      if (active) setIsLoading(false);
    });

    return () => { active = false; };
  }, [activeObject]);

  const save = async (updated) => {
    if (!activeObject || !activeObject.contextId || !diagramId) return;
    try {
      await updateContext(activeObject.contextId, {
        ...updated,
        diagramId,
        fabricId: activeObject.id
      });
    } catch (err) {
      console.error('Failed to save context:', err);
    }
  };

  const handleNotesChange = (e) => {
    const notes = e.target.value;
    setContext(prev => ({ ...prev, notes }));
    save({ notes });
  };

  const handleCodeChange = (e) => {
    const codeSnippet = e.target.value;
    setContext(prev => ({ ...prev, codeSnippet }));
    save({ codeSnippet });
  };

  const addLink = () => {
    if (!newLink.trim()) return;
    const links = [...context.links, newLink.trim()];
    setContext(prev => ({ ...prev, links }));
    save({ links });
    setNewLink('');
  };

  const removeLink = (index) => {
    const links = context.links.filter((_, i) => i !== index);
    setContext(prev => ({ ...prev, links }));
    save({ links });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeObject || !diagramId) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('diagramId', diagramId);
      formData.append('fabricId', activeObject.id);
      
      const newFile = await uploadFile(activeObject.contextId, formData);
      setContext(prev => ({ ...prev, files: [...prev.files, newFile] }));
    } catch (err) {
      console.error('File upload failed:', err);
    } finally {
      setIsUploading(false);
      e.target.value = ''; // reset input
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!activeObject) return;
    try {
      await deleteFile(activeObject.contextId, fileId);
      setContext(prev => ({ ...prev, files: prev.files.filter(f => f.id !== fileId) }));
    } catch (err) {
      console.error('File delete failed:', err);
    }
  };

  if (!activeObject) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-xl border-l border-gray-200 shadow-2xl z-20 flex flex-col" style={{ animation: 'slideInRight 0.25s ease forwards' }}>
      <div className="px-5 py-4 border-b border-gray-200 bg-white">
        <h2 className="font-semibold text-gray-900 text-sm">Context Properties</h2>
        <p className="text-xs text-gray-500 mt-0.5">{activeObject.type} · {activeObject.id.slice(0,8)}</p>
      </div>

      <div className="flex border-b border-gray-200">
        {['notes', 'links', 'code', 'files'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-10">Loading context...</div>
        ) : (
          <>
            {activeTab === 'notes' && (
              <textarea
                value={context.notes || ''}
                onChange={handleNotesChange}
                placeholder="Add architectural notes, decision records, or descriptions..."
                className="w-full h-full min-h-[300px] text-sm text-gray-800 bg-white border border-gray-200 rounded-xl px-4 py-3 resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            )}

            {activeTab === 'code' && (
              <textarea
                value={context.codeSnippet || ''}
                onChange={handleCodeChange}
                placeholder="// Paste interface definitions, schemas, or relevant code..."
                className="w-full h-full min-h-[300px] text-sm text-emerald-400 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 resize-none focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
            )}

            {activeTab === 'links' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={newLink}
                    onChange={e => setNewLink(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addLink()}
                    placeholder="https://..."
                    className="flex-1 text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button onClick={addLink} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 rounded-lg font-bold">+</button>
                </div>
                <div className="space-y-2">
                  {context.links?.map((link, i) => (
                    <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2 group">
                      <a href={link} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline truncate flex-1">{link}</a>
                      <button onClick={() => removeLink(i)} className="text-gray-400 hover:text-red-500 ml-2">✕</button>
                    </div>
                  ))}
                  {context.links?.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No links added</p>}
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-4">
                <label className={`block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                  <span className="text-sm font-medium text-gray-600">{isUploading ? 'Uploading...' : 'Click to upload file'}</span>
                </label>
                <div className="space-y-2">
                  {context.files?.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                      <div className="overflow-hidden">
                        <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-900 truncate block hover:text-indigo-600">{file.name}</a>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button onClick={() => handleDeleteFile(file.id)} className="text-red-500 hover:text-red-700 text-xs font-medium px-2 py-1 bg-red-50 rounded-md">Delete</button>
                    </div>
                  ))}
                  {context.files?.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No files attached</p>}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
