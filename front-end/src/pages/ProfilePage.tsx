import React, { useEffect, useState, ErrorInfo } from 'react';
import { Box, Typography, Avatar, Tab, Tabs, Container, Alert, CircularProgress, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { List } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import api from '../services/api';
import ProfileEditForm from './ProfileEditForm';

// Define interfaces para los tipos de datos
type UserWithProfile = {
  id: number;
  username?: string;
  email: string;
  name?: string;
  profile?: {
    location?: string;
  };
}

interface ProductImage {
  id: number;
  image: string;
  is_primary: boolean;
}

interface Product {
  id: number;
  title: string;
  description?: string;
  price: number | string;
  images?: ProductImage[];
  category?: {
    id: number | string;
    name: string;
  };
  status?: string;
  created_at?: string;
}

interface Favorite {
  id: number;
  product: number;
  product_detail: Product;
  user: number;
  created_at: string;
}

// Corrección de MyErrorBoundary para incluir children en props
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class MyErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}

const ProfilePage = () => {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  // Estado para datos de perfil
  const [profileData, setProfileData] = useState<any>(null);

  const handleOpenEditModal = () => setEditModalOpen(true);
  const handleCloseEditModal = () => setEditModalOpen(false);

  useEffect(() => {
    // Only redirect if auth is finished loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchUserData = async () => {
      // Fetch profile
      try {
        const profileRes = await api.getUserProfile();
        if (profileRes.success) setProfileData(profileRes.data);
      } catch {};

      setLoading(true);
      setError('');

      try {
        // Fetch user's products
        console.log('Fetching user products...');
        const productsResponse = await api.getUserProducts();
        
        // Añadir mejor manejo de la respuesta
        if (productsResponse.success) {
          // Manejar diferentes formatos de respuesta
          let productsList: Product[] = [];
          if (Array.isArray(productsResponse.data)) {
            productsList = productsResponse.data;
          } else if (productsResponse.data && Array.isArray(productsResponse.data.results)) {
            productsList = productsResponse.data.results;
          } else if (productsResponse.data) {
            // Si no es un array ni tiene .results, intentar extraer datos
            console.log('Formato de respuesta no estándar:', productsResponse.data);
            productsList = Object.values(productsResponse.data);
          }
          
          console.log('User products processed:', productsList);
          setUserProducts(productsList.filter(item => item)); // Filtrar null/undefined
        } else {
          console.error('Failed to fetch user products:', productsResponse);
          setUserProducts([]);
        }

        // Fetch user's favorites
        console.log('Fetching favorites...');
        try {
          const favoritesResponse = await api.favorites.getAll();
          console.log('Favorites response:', favoritesResponse);
          
          if (favoritesResponse.success) {
            // Procesar datos paginados - extrayendo el array 'results' si existe
            let favoritesData: Favorite[] = [];
            
            if (Array.isArray(favoritesResponse.data)) {
              // Si la respuesta ya es un array de favoritos
              favoritesData = favoritesResponse.data;
            } else if (favoritesResponse.data && favoritesResponse.data.results) {
              // Si la respuesta es una estructura paginada con 'results'
              console.log('Procesando datos paginados:', favoritesResponse.data);
              favoritesData = favoritesResponse.data.results;
            } else {
              // Si la respuesta tiene otro formato
              console.error('Formato de respuesta no reconocido:', favoritesResponse.data);
              favoritesData = [];
            }
            
            console.log('Favoritos procesados para mostrar:', favoritesData);
            setFavorites(favoritesData);
          } else {
            console.error('Error en respuesta de favoritos:', favoritesResponse.error);
            setFavorites([]);
          }
        } catch (favoriteErr) {
          console.error('Error in favorites fetch:', favoriteErr);
          setFavorites([]);
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Error al cargar los datos del usuario.');
      } finally {
        setLoading(false);
      }
    };

    // Only fetch data if authentication is complete and user is logged in
    if (!authLoading && isAuthenticated && user) {
      fetchUserData();
    }
  }, [isAuthenticated, user, navigate, authLoading]);

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  if (loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <MyErrorBoundary>
      <Container>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
          <Avatar src={profileData?.profile_picture} sx={{ width: 100, height: 100, mr: 3 }} />
          <Box>
            <Typography variant="h4">
              {profileData?.first_name || profileData?.last_name
                ? `${profileData.first_name || ''} ${profileData.last_name || ''}`
                : (user as UserWithProfile).username || user.email}
            </Typography>
            <Typography variant="body1" color="textSecondary">
              {profileData?.email || user.email}
            </Typography>
            {profileData?.bio && <Typography variant="body2" sx={{ mt: 1 }}>{profileData.bio}</Typography>}
            {profileData?.location && <Typography variant="body2" sx={{ mt: 0.5 }}>Ubicación: {profileData.location}</Typography>}
            {profileData?.birth_date && <Typography variant="body2" sx={{ mt: 0.5 }}>Nacimiento: {profileData.birth_date}</Typography>}
          </Box>
          <Button variant="outlined" sx={{ ml: 'auto' }} onClick={handleOpenEditModal}>
            Editar Perfil
          </Button>
        </Box>

        <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} fullWidth maxWidth="sm">
          <DialogTitle>Editar Perfil</DialogTitle>
          <DialogContent>
            <ProfileEditForm />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEditModal} color="primary">
              Cerrar
            </Button>
          </DialogActions>
        </Dialog>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Tabs value={tab} onChange={(_e, newValue) => setTab(newValue)}>
          <Tab label="Mis Productos" />
          <Tab label="Favoritos" />
        </Tabs>

        <Box sx={{ mt: 3 }}>
          {tab === 0 ? (
            userProducts.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={userProducts}
                renderItem={(item: Product) => (
                  <List.Item 
                    onClick={() => navigate(`/products/${item.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <List.Item.Meta
                      avatar={item.images && item.images.length > 0 ? 
                        <img src={item.images[0].image} alt={item.title || 'Producto'} style={{ width: 50, height: 50, objectFit: 'cover' }} /> : 
                        <div style={{ width: 50, height: 50, backgroundColor: '#eee' }} />
                      }
                      title={item.title || 'Sin título'}
                      description={`$${item.price}`}
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                No tienes productos publicados aún.
              </Typography>
            )
          ) : (
            favorites.length > 0 ? (
              <List
                dataSource={favorites}
                renderItem={(item: Favorite) => {
                  console.log('Renderizando favorito:', item);
                  
                  // Verificar si tenemos datos de producto válidos
                  if (!item) {
                    console.warn('Item de favorito no válido:', item);
                    return null;
                  }
                  
                  // Usar product_detail en lugar de product para los detalles
                  const productDetail = item.product_detail || {};
                  
                  return (
                    <List.Item
                      onClick={() => navigate(`/products/${item.product}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <List.Item.Meta
                        avatar={
                          productDetail.images && productDetail.images.length > 0 ? 
                            <img 
                              src={productDetail.images[0].image} 
                              alt={productDetail.title || 'Producto sin título'} 
                              style={{ width: 50, height: 50, objectFit: 'cover' }} 
                            /> : 
                            <div style={{ width: 50, height: 50, backgroundColor: '#eee' }} />
                        }
                        title={productDetail.title || 'Producto sin título'}
                        description={`$${productDetail.price || 0}`}
                      />
                    </List.Item>
                  );
                }}
              />
            ) : (
              <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                No tienes productos favoritos.
              </Typography>
            )
          )}
        </Box>
      </Container>
    </MyErrorBoundary>
  );
};

export default ProfilePage;
