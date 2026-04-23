import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage    from "./components/Auth/LoginPage";
import RegisterPage from "./components/Auth/RegisterPage";
import Dashboard    from "./components/Dashboard";
import SketchCanvas from "./components/Canvas/SketchCanvas";

// Guard: redirect to /login if not authenticated
function PrivateRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={
          <PrivateRoute><Dashboard /></PrivateRoute>
        } />
        <Route path="/d/:id" element={
          <PrivateRoute><SketchCanvas /></PrivateRoute>
        } />
        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
