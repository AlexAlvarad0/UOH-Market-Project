import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CircularProgress, Box } from '@mui/material';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Mostrar un indicador de carga si estamos verificando la autenticación
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Si no está autenticado, redirigir a la página de login
  if (!isAuthenticated) {
    console.log("PrivateRoute: Usuario no autenticado, redirigiendo a login");
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Si está autenticado, mostrar el componente hijo
  return <>{children}</>;
};

export default PrivateRoute;
