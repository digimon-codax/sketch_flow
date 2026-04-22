import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDiagrams, createDiagram } from '../api/diagramsApi';
import { useAuthStore } from '../store/authStore';

export const Dashboard = () => {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newDiagramName, setNewDiagramName] = useState('');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDiagrams();
  }, []);

  const fetchDiagrams = async () => {
    try {
      const data = await getDiagrams();
      setDiagrams(data);
    } catch (err) {
      console.error('Failed to load diagrams', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newDiagramName.trim()) return;
    try {
      const newDiagram = await createDiagram(newDiagramName.trim());
      navigate(`/diagram/${newDiagram.id}`);
    } catch (err) {
      console.error('Failed to create diagram', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">SketchFlow</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm font-medium text-gray-500 hover:text-gray-900">Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Your Diagrams</h2>
          
          <form onSubmit={handleCreate} className="flex gap-2">
            <input
              type="text"
              value={newDiagramName}
              onChange={(e) => setNewDiagramName(e.target.value)}
              placeholder="New Diagram Name"
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm w-64"
            />
            <button type="submit" disabled={!newDiagramName.trim()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              Create
            </button>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">Loading diagrams...</div>
        ) : diagrams.length === 0 ? (
          <div className="text-center py-20 bg-white border border-gray-200 rounded-2xl border-dashed">
            <div className="text-gray-400 mb-2">No diagrams yet</div>
            <p className="text-sm text-gray-500">Create your first architectural diagram above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                onClick={() => navigate(`/diagram/${diagram.id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg hover:border-indigo-300 transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </div>
                <h3 className="font-semibold text-gray-900 text-lg mb-1">{diagram.name}</h3>
                <p className="text-sm text-gray-500 mb-4">Updated {new Date(diagram.updatedAt).toLocaleDateString()}</p>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {diagram.members.slice(0, 3).map((m) => (
                      <div key={m.id} className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600" title={m.user.name}>
                        {m.user.name.charAt(0)}
                      </div>
                    ))}
                  </div>
                  {diagram.members.length > 3 && <span className="text-xs font-medium text-gray-500">+{diagram.members.length - 3}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
