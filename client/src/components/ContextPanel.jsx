import { useState, useEffect } from 'react';

export const ContextPanel = ({ activeObject }) => {
  const [context, setContext] = useState({
    notes: '',
    code: '',
    links: [],
    files: [],
  });
  const [newLink, setNewLink] = useState('');

  // Sync panel state when the selected object changes
  useEffect(() => {
    if (activeObject && activeObject.context) {
      setContext({ ...activeObject.context });
    } else {
      setContext({ notes: '', code: '', links: [], files: [] });
    }
  }, [activeObject]);

  const save = (updated) => {
    if (!activeObject) return;
    activeObject.context = updated;
  };

  const handleChange = (field, value) => {
    const updated = { ...context, [field]: value };
    setContext(updated);
    save(updated);
  };

  const addLink = () => {
    if (!newLink.trim()) return;
    const updated = { ...context, links: [...context.links, newLink.trim()] };
    setContext(updated);
    save(updated);
    setNewLink('');
  };

  const removeLink = (index) => {
    const updated = { ...context, links: context.links.filter((_, i) => i !== index) };
    setContext(updated);
    save(updated);
  };

  if (!activeObject) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-white/90 backdrop-blur-xl border-l border-gray-200 shadow-2xl z-20 flex flex-col"
      style={{ animation: 'slideInRight 0.25s ease forwards' }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-white/60">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm tracking-wide">Context Layer</h2>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{activeObject.type} · {activeObject.id?.slice(0, 8)}</p>
        </div>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeObject.fill || '#6b7280' }} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            📝 Notes
          </label>
          <textarea
            value={context.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="Describe this component..."
            rows={3}
            className="w-full text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 transition"
          />
        </div>

        {/* Code */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            💻 Code Snippet
          </label>
          <textarea
            value={context.code}
            onChange={(e) => handleChange('code', e.target.value)}
            placeholder="// Paste relevant code..."
            rows={5}
            className="w-full text-xs text-emerald-700 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-600 font-mono transition"
          />
        </div>

        {/* Links */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            🔗 Links
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLink()}
              placeholder="https://..."
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-400 transition"
            />
            <button
              onClick={addLink}
              className="text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg transition-colors"
            >
              +
            </button>
          </div>
          <div className="space-y-1.5">
            {context.links.map((link, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 group">
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline truncate flex-1"
                >
                  {link}
                </a>
                <button
                  onClick={() => removeLink(i)}
                  className="text-gray-300 hover:text-red-400 ml-2 flex-shrink-0 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Files (placeholder UI) */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            📎 Files
          </label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center text-xs text-gray-400 hover:border-indigo-300 hover:text-indigo-400 transition-colors cursor-pointer">
            Drop files here or click to attach
          </div>
        </div>
      </div>
    </div>
  );
};
