import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { useAuth } from './hooks/useAuth.hooks';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ConfigProvider } from 'antd';
import Box from '@mui/material/Box';
import styled from 'styled-components';

import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ProfilePage from './pages/ProfilePage';
import ProfileEditForm from './pages/ProfileEditForm';
import FavoritesPage from './pages/FavoritesPage';
import MyProductsPage from './pages/MyProductsPage';
import ChatPage from './pages/ChatPage';
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
      main: '#004f9e',
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

// Componente de botón estilizado
const StyledWrapper = styled.div`
  .button-container {
    position: fixed;
    top: 89px; /* Pantallas grandes por defecto */
    right: 20px;
    z-index: 100;
    
    /* Pantallas medianas (tablets) */
    @media (max-width: 768px) {
      top: 77px;
    }
    
    /* Pantallas pequeñas (móviles) */
    @media (max-width: 480px) {
      top: 75px;
    }
  }

  .button {
    position: relative;
    transition: all 0.3s ease-in-out;
    box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
    padding-block: 0.7rem;
    padding-inline: 1.8rem;
    background-color: #222;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #ffff;
    gap: 4px;
    font-weight: bold;
    border: 3px solid #ffffff4d;
    outline: none;
    overflow: hidden;
    font-size: 16px;
    z-index: 1;
  }

  .button-text {
    position: relative;
    z-index: 2;
  }

  .icon {
    width: 18px;
    height: 18px;
    transition: all 0.3s ease-in-out;
    position: relative;
    z-index: 2;
    flex-shrink: 0;
    color: white;
  }

  .button:hover {
    transform: scale(1.05);
    border-color: #fff9;
  }

  .button:hover .icon {
    transform: translateX(4px);
  }

  .button:hover::before {
    animation: shine 1.5s ease-out infinite;
  }

  .button::before {
    content: "";
    position: absolute;
    width: 100px;
    height: 100%;
    background-image: linear-gradient(
      120deg,
      rgba(255, 255, 255, 0) 30%,
      rgba(255, 255, 255, 0.8),
      rgba(255, 255, 255, 0) 70%
    );
    top: 0;
    left: -100px;
    opacity: 0.6;
    z-index: 0;
  }

  @keyframes shine {
    0% {
      left: -100px;
    }

    60% {
      left: 100%;
    }

    to {
      left: 100%;
    }
  }
`;

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Verificar si estamos en páginas donde no debe mostrarse el botón de vender
  const shouldHideButton = location.pathname === '/product/new' || location.pathname === '/login';

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
      minHeight: '100%',
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
              <Route 
                path="products/:productId" 
                element={<ProductDetailPage />} 
              />
                {/* Rutas protegidas */}
              <Route path="profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="profile/edit" element={<PrivateRoute><ProfileEditForm /></PrivateRoute>} />
              <Route path="favorites" element={<PrivateRoute><FavoritesPage /></PrivateRoute>} />
              <Route path="my-products" element={<PrivateRoute><MyProductsPage /></PrivateRoute>} />
              <Route path="chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
              <Route path="chat/:conversationId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
              <Route path="product/new" element={<PrivateRoute><NewProductPage /></PrivateRoute>} />
              <Route path="product/edit/:id" element={<PrivateRoute><EditProductPage /></PrivateRoute>} />
              
              {/* Seller routes */}
              <Route path="seller/dashboard" element={<PrivateRoute><SellerDashboardPage /></PrivateRoute>} />
              
              {/* Página 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>          </Routes>          {/* Botón flotante para agregar producto - oculto en login y página de publicación */}
          {!shouldHideButton && (
            <StyledWrapper>
              <div className="button-container">
                <button 
                  className="button"
                  onClick={handleAddProduct}
                  title="Vender nuevo producto"
                >
                  <span className="button-text">Vender</span>
                  <svg fill="currentColor" viewBox="0 0 24 24" className="icon">
                    <path clipRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.28 10.28a.75.75 0 000-1.06l-3-3a.75.75 0 10-1.06 1.06l1.72 1.72H8.25a.75.75 0 000 1.5h5.69l-1.72 1.72a.75.75 0 101.06 1.06l3-3z" fillRule="evenodd" />
                  </svg>
                </button>
              </div>
            </StyledWrapper>
          )}
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