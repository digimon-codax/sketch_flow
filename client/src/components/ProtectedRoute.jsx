import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('sf_token');
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  
  try {
    JSON.parse(localStorage.getItem('sf_user'));
  } catch {
    localStorage.clear();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
}

export function PublicRoute({ children }) {
  const token = localStorage.getItem('sf_token');
  if (token) return <Navigate to="/" replace />;
  return children;
}
