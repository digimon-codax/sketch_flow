import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/index";
import { useAuthStore } from "../store/authStore";

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard() {
  const navigate  = useNavigate();
  const { user, logout } = useAuthStore();
  const [diagrams, setDiagrams] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState("");
  const [showNew,  setShowNew]  = useState(false);

  useEffect(() => {
    api.get("/diagrams")
      .then((r) => setDiagrams(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function createDiagram(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/diagrams", { name: newName.trim() });
      navigate(`/d/${data._id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function deleteDiagram(id, e) {
    e.stopPropagation();
    if (!confirm("Delete this diagram? This cannot be undone.")) return;
    await api.delete(`/diagrams/${id}`);
    setDiagrams((prev) => prev.filter((d) => d._id !== id));
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#6965db] rounded-md flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-bold text-gray-900">SketchFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="text-sm text-gray-500 hover:text-gray-800 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Page title + new button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Diagrams</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {diagrams.length} diagram{diagrams.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="bg-[#6965db] hover:bg-[#5b57c8] text-white font-semibold px-4 py-2 rounded-lg text-sm transition flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> New diagram
          </button>
        </div>

        {/* New diagram modal */}
        {showNew && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h2 className="font-bold text-lg mb-4">New diagram</h2>
              <form onSubmit={createDiagram} className="space-y-3">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. System Architecture"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6965db]/30 focus:border-[#6965db]"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowNew(false); setNewName(""); }}
                    className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" disabled={creating || !newName.trim()}
                    className="flex-1 py-2 bg-[#6965db] text-white rounded-lg text-sm font-semibold disabled:opacity-60 hover:bg-[#5b57c8] transition"
                  >
                    {creating ? "Creating…" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Diagram grid */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-3 border-[#6965db] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : diagrams.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🎨</div>
            <p className="text-gray-500 text-sm">No diagrams yet.</p>
            <button
              onClick={() => setShowNew(true)}
              className="mt-4 text-[#6965db] font-semibold text-sm hover:underline"
            >
              Create your first diagram →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {diagrams.map((d) => (
              <div
                key={d._id}
                onClick={() => navigate(`/d/${d._id}`)}
                className="group bg-white border border-gray-100 rounded-xl p-5 cursor-pointer hover:border-[#6965db]/30 hover:shadow-md transition-all"
              >
                {/* Canvas preview placeholder */}
                <div className="w-full h-28 bg-[#f8f9fa] rounded-lg mb-4 flex items-center justify-center border border-gray-100">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="opacity-20">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#6965db" strokeWidth="1.5"/>
                    <path d="M3 9h18M9 21V9" stroke="#6965db" strokeWidth="1.5"/>
                  </svg>
                </div>

                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{d.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(d.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteDiagram(d._id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition p-1 -mr-1"
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/>
                    </svg>
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
