import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { useAuth } from './hooks/useAuth.hooks';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ConfigProvider } from 'antd';
import Box from '@mui/material/Box';
import AddCircleIcon from '@mui/icons-material/AddCircle';

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

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  // Verificar si estamos en la página de publicación de producto
  const isProductPage = location.pathname === '/product/new';

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
          {/* Botón flotante para agregar producto - oculto en la página de publicación */}
          {!isProductPage && (
            <div
              style={{
                position: 'fixed',
                top: 75, // Debajo del header
                right: 16,
                zIndex: 100
              }}
            >            
              <button 
                onClick={handleAddProduct}
                className="flex justify-center items-center gap-2 w-28 h-12 cursor-pointer rounded-md shadow-2xl text-white font-semibold bg-gradient-to-r from-[#004f9e] via-[#1d4ed8] to-[#3b82f6] hover:shadow-xl hover:shadow-blue-500 hover:scale-105 duration-300 hover:from-[#3b82f6] hover:to-[#1e40af]"
                title="Vender nuevo producto"
              >
                <AddCircleIcon sx={{ fontSize: 24, color: 'white', mr: 1 }} />
                Vender
              </button>
            </div>
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