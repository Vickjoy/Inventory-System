// src/components/AdminRoute/AdminRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
};

export default AdminRoute;