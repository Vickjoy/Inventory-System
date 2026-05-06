// src/components/DirectorRoute/DirectorRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DirectorRoute = ({ children }) => {
  const { isDirector, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isDirector) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default DirectorRoute;