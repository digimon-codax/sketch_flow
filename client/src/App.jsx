import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CanvasPage from './pages/CanvasPage';
import NotFoundPage from './pages/NotFoundPage';
import ProtectedRoute, { PublicRoute } from './components/ProtectedRoute';

function AppRoutes() {
  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <PublicRoute>
            <LandingPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } 
      />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/canvas/:id" 
        element={
          <ProtectedRoute>
            <CanvasPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/d/:id" 
        element={
          <ProtectedRoute>
            <CanvasPage />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
