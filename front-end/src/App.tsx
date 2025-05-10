import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
// Importamos correctamente desde hooks/useAuth
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ConfigProvider } from 'antd';
import Box from '@mui/material/Box';
import styled from 'styled-components';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ConfirmEmailPage from './pages/ConfirmEmailPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditForm from './pages/ProfileEditForm';
import FavoritesPage from './pages/FavoritesPage';
import ChatPage from './pages/ChatPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PrivateRoute from './components/PrivateRoute';
import NewProductPage from './pages/NewProductPage';
import EditProductPage from './pages/EditProductPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorBoundary from './components/ErrorBoundary';
import SellerDashboardPage from './pages/SellerDashboardPage';

// Tema personalizado para Material UI
const theme = createTheme({
  palette: {
    primary: {
      main: '#4f46e5',
    },
    secondary: {
      main: '#3730a3',
    },
  },
});

// Tema personalizado para Ant Design
const antTheme = {
  token: {
    colorPrimary: '#4f46e5',
    borderRadius: 6,
  },
};

const StyledWrapper = styled.div`
  .plusButton {
    /* Config start */
    --plus_sideLength: 2.5rem;
    --plus_topRightTriangleSideLength: 0.9rem;
    /* Config end */
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid white;
    width: var(--plus_sideLength);
    height: var(--plus_sideLength);
    background-color: #000000;
    overflow: hidden;
  }

  .plusButton::before {
    position: absolute;
    content: "";
    top: 0;
    right: 0;
    width: 0;
    height: 0;
    border-width: 0 var(--plus_topRightTriangleSideLength) var(--plus_topRightTriangleSideLength) 0;
    border-style: solid;
    border-color: #cdcdcd;
    transition-timing-function: ease-in-out;
    transition-duration: 0.2s;
  }

  .plusButton:hover {
    cursor: pointer;
  }

  .plusButton:hover::before,
  .plusButton:focus-visible::before {
    --plus_topRightTriangleSideLength: calc(var(--plus_sideLength) * 2);
  }

  .plusButton>.plusIcon {
    fill: white;
    width: calc(var(--plus_sideLength) * 0.7);
    height: calc(var(--plus_sideLength) * 0.7);
    z-index: 1;
    transition-timing-function: ease-in-out;
    transition-duration: 0.2s;
  }

  .plusButton:hover>.plusIcon,
  .plusButton:focus-visible>.plusIcon {
    fill: black;
    transform: rotate(180deg);
  }
`;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const handleAddProduct = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    navigate('/product/new');
  };

  return (
    <Box sx={{ 
      width: '100%', 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
      paddingTop: '64px', /* Ajuste para la altura del header */
    }}>
      <ThemeProvider theme={theme}>
        <ConfigProvider theme={antTheme}>
          <CssBaseline />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={
                <ErrorBoundary>
                  <HomePage />
                </ErrorBoundary>
              } />
              <Route path="login" element={<LoginPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="confirm-email/:uid/:token" element={<ConfirmEmailPage />} />
              <Route 
                path="products/:productId" 
                element={<ProductDetailPage />} 
              />
              
              {/* Rutas protegidas */}
              <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="profile/edit" element={<PrivateRoute><ProfileEditForm /></PrivateRoute>} />
              <Route path="favorites" element={<PrivateRoute><FavoritesPage /></PrivateRoute>} />
              <Route path="chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
              <Route path="chat/:conversationId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
              <Route path="product/new" element={<PrivateRoute><NewProductPage /></PrivateRoute>} />
              <Route path="product/edit/:id" element={<PrivateRoute><EditProductPage /></PrivateRoute>} />
              
              {/* Seller routes */}
              <Route path="seller/dashboard" element={<PrivateRoute><SellerDashboardPage /></PrivateRoute>} />
              
              {/* Página 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>

          <StyledWrapper
            style={{
              position: 'fixed',
              bottom: 16,
              right: 16,
            }}
          >
            <div 
              tabIndex={0} 
              className="plusButton" 
              onClick={handleAddProduct}
              title="Publicar nuevo producto"
            >
              <svg className="plusIcon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
                <g>
                  <path d="M13.75 23.75V16.25H6.25V13.75H13.75V6.25H16.25V13.75H23.75V16.25H16.25V23.75H13.75Z" />
                </g>
              </svg>
            </div>
          </StyledWrapper>
        </ConfigProvider>
      </ThemeProvider>
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;