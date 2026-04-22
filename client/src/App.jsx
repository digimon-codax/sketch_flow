import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AuthPage } from './components/AuthPage';
import { Dashboard } from './components/Dashboard';
import { DiagramRoom } from './components/DiagramRoom';

const ProtectedRoute = ({ children }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/diagram/:id" element={
          <ProtectedRoute>
            <DiagramRoom />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

export default App;
