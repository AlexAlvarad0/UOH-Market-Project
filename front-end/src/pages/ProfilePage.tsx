import React, { useEffect, useState, ErrorInfo } from 'react';
import { Box, Typography, Avatar, Tab, Tabs, Container, Alert, CircularProgress, Button, Dialog, DialogActions, DialogContent, DialogTitle, Card, Rating as MuiRating } from '@mui/material';
import { List } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import api from '../services/api';
import { getUserRatings, Rating } from '../api';
import ProfileEditForm from './ProfileEditForm';
import EditButton from '../components/EditButton';

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

interface ProfileData {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  location?: string;
  birth_date?: string;
  profile_picture?: string;
  average_rating?: number;
  total_ratings?: number;
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
  const { isAuthenticated, user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [userProducts, setUserProducts] = useState<Product[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);  // Estado para datos de perfil
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const handleOpenEditModal = () => setEditModalOpen(true);
  const handleCloseEditModal = () => setEditModalOpen(false);

  // Función para refrescar los datos del perfil
  const refreshProfileData = async () => {
    try {
      const profileRes = await api.getUserProfile();
      if (profileRes.success) {
        setProfileData(profileRes.data);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };
  // Función para manejar cuando se guarda el perfil exitosamente
  const handleProfileSaved = async () => {
    setEditModalOpen(false); // Cerrar el modal
    
    // Refrescar los datos del perfil local
    await refreshProfileData();
    
    // También actualizar el contexto global del usuario para que el header se actualice
    try {
      const profileRes = await api.getUserProfile();
      if (profileRes.success && user) {
        // Crear el objeto de usuario actualizado manteniendo la estructura actual
        const updatedUser = {
          ...user,
          profile_picture: profileRes.data.profile_picture,
          profile: {
            ...user.profile,
            first_name: profileRes.data.first_name,
            last_name: profileRes.data.last_name,
            bio: profileRes.data.bio,
            location: profileRes.data.location,
          }
        };
        
        // Actualizar el contexto global
        updateUser(updatedUser);
      }
    } catch (error) {
      console.error('Error updating global user context:', error);
    }
  };

  useEffect(() => {
    // Only redirect if auth is finished loading and user is not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchUserData = async () => {      // Fetch profile
      try {
        const profileRes = await api.getUserProfile();
        if (profileRes.success) setProfileData(profileRes.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }

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
        }        // Fetch user's favorites
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

        // Fetch user's ratings
        console.log('Fetching user ratings...');
        try {
          if (user?.id) {
            const ratingsResponse = await getUserRatings(user.id);
            console.log('Ratings response:', ratingsResponse);
            
            if (ratingsResponse && Array.isArray(ratingsResponse.results)) {
              setRatings(ratingsResponse.results);
            } else if (Array.isArray(ratingsResponse)) {
              setRatings(ratingsResponse);
            } else {
              setRatings([]);
            }
          }
        } catch (ratingsErr) {
          console.error('Error in ratings fetch:', ratingsErr);
          setRatings([]);
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
      <Container>        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            
          </Typography>
        </Box>

        {/* Profile Card */}
        <Card 
          sx={{ 
            p: 4, 
            mb: 4, 
            borderRadius: 3, 
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 4 }}>
            {/* Layout responsivo */}
            <Box 
              sx={{ 
                display: 'flex', 
                width: '100%',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'stretch', md: 'flex-start' },
                gap: { xs: 2, md: 3 }
              }}
            >
              {/* Header con foto y botón en mobile */}
              <Box 
                sx={{ 
                  display: { xs: 'flex', md: 'block' },
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  width: { xs: '100%', md: 'auto' },
                  mb: { xs: 2, md: 0 }
                }}
              >
                <Avatar 
                  src={profileData?.profile_picture} 
                  sx={{ 
                    width: { xs: 80, md: 100 }, 
                    height: { xs: 80, md: 100 }
                  }} 
                />
                <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                  <EditButton onClick={handleOpenEditModal} />
                </Box>
              </Box>              {/* Información del usuario */}
              <Box sx={{ flex: 1, width: '100%' }}>
                {/* Nombre y botón de editar en la misma línea */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    {profileData?.first_name || profileData?.last_name
                      ? `${profileData.first_name || ''} ${profileData.last_name || ''}`
                      : (user as UserWithProfile).username || user.email}
                  </Typography>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <EditButton onClick={handleOpenEditModal} />
                  </Box>
                </Box>                <Typography variant="body1" color="textSecondary">
                  {profileData?.email || user.email}
                </Typography>
                  {/* Rating info */}
                <Box sx={{ mt: 2, mb: 2 }}>
                  {profileData?.average_rating && profileData?.total_ratings && profileData.total_ratings > 0 ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <MuiRating value={profileData.average_rating} readOnly precision={0.5} size="small" />
                      <Typography variant="body2" sx={{ ml: 1 }}>
                        ({profileData.total_ratings} {profileData.total_ratings === 1 ? 'calificación' : 'calificaciones'})
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      Sin calificaciones aún
                    </Typography>
                  )}
                </Box>
                
                {/* Information Cards */}
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {profileData?.bio && (
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 2, 
                        backgroundColor: '#f9f9f9',
                        borderLeft: '4px solid #1976d2'
                      }}
                    >
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                        Biografía
                      </Typography>
                      <Typography variant="body2">{profileData.bio}</Typography>
                    </Box>
                  )}
                  
                  {profileData?.location && (
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 2, 
                        backgroundColor: '#f9f9f9',
                        borderLeft: '4px solid #4caf50'
                      }}
                    >
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                        Ubicación
                      </Typography>
                      <Typography variant="body2">{profileData.location}</Typography>
                    </Box>
                  )}
                  
                  {profileData?.birth_date && (
                    <Box 
                      sx={{ 
                        p: 1.5, 
                        border: '1px solid #e0e0e0', 
                        borderRadius: 2, 
                        backgroundColor: '#f9f9f9',
                        borderLeft: '4px solid #ff9800'
                      }}
                    >
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold', mb: 0.5, display: 'block' }}>
                        Fecha de Nacimiento
                      </Typography>
                      <Typography variant="body2">{new Date(profileData.birth_date).toLocaleDateString('es-ES')}</Typography>                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>          <Dialog open={isEditModalOpen} onClose={handleCloseEditModal} fullWidth maxWidth="sm">
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogContent>
              <ProfileEditForm onProfileSaved={handleProfileSaved} />
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
            <Tab label="Calificaciones" />
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
            ) : tab === 1 ? (
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
            ) : (
              // Tab de Calificaciones
              ratings.length > 0 ? (
                <List
                  dataSource={ratings}
                  renderItem={(rating: Rating) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Avatar>
                            {rating.rater.first_name ? rating.rater.first_name[0] : rating.rater.username[0]}
                          </Avatar>
                        }
                        title={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1">
                              {rating.rater.first_name && rating.rater.last_name 
                                ? `${rating.rater.first_name} ${rating.rater.last_name}`
                                : rating.rater.username}
                            </Typography>
                            <MuiRating value={rating.rating} readOnly size="small" />
                          </Box>
                        }
                        description={
                          <Box>
                            {rating.comment && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                {rating.comment}
                              </Typography>
                            )}
                            <Typography variant="caption" color="textSecondary">
                              {new Date(rating.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </List.Item>
                  )}
                />
              ) : (
                <Typography variant="body1" color="textSecondary" sx={{ mt: 2 }}>
                  Aún no has recibido calificaciones.
                </Typography>
              )
            )}
          </Box>
        </Card>
      </Container>
    </MyErrorBoundary>
  );
};

export default ProfilePage;
