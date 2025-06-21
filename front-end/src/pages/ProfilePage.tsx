import React, { useEffect, useState } from 'react';
import { Box, Typography, Avatar, Tab, Tabs, Container, Alert, CircularProgress, Button, Dialog, DialogActions, DialogContent, DialogTitle, Card, Rating as MuiRating, GlobalStyles } from '@mui/material';
import { List } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import api from '../services/api';
import { getUserRatings, Rating } from '../api';
import ProfileEditForm from './ProfileEditForm';
import EditButton from '../components/EditButton';
import ContactsIcon from '@mui/icons-material/Contacts';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CakeIcon from '@mui/icons-material/Cake';
import VerifiedIcon from '@mui/icons-material/Verified';
import InventoryIcon from '@mui/icons-material/Inventory';
import FavoriteIcon from '@mui/icons-material/Favorite';
import StarIcon from '@mui/icons-material/Star';
import Squares from '../../y/Squares/Squares';

// Define interfaces para los tipos de datos
type UserWithProfile = {
  id: number;
  username?: string;
  email: string;
  name?: string;
  is_verified_seller?: boolean;  // Agregar ? para hacerlo opcional
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
  }  componentDidCatch() {
    // Error boundary caught an error
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
      }    } catch {
      // Error refreshing profile
    }
  };  // Función para manejar cuando se guarda el perfil exitosamente
  const handleProfileSaved = async () => {
    setEditModalOpen(false); // Cerrar el modal    
    // Refrescar los datos del perfil local
    await refreshProfileData();
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
        if (profileRes.success) setProfileData(profileRes.data);      } catch {
        // Error fetching profile
      }

      setLoading(true);
      setError('');

      try {        // Fetch user's products
        const productsResponse = await api.getUserProducts();
        
        // Añadir mejor manejo de la respuesta
        if (productsResponse.success) {
          // Manejar diferentes formatos de respuesta
          let productsList: Product[] = [];
          if (Array.isArray(productsResponse.data)) {
            productsList = productsResponse.data;
          } else if (productsResponse.data && Array.isArray(productsResponse.data.results)) {
            productsList = productsResponse.data.results;          } else if (productsResponse.data) {
            // Si no es un array ni tiene .results, intentar extraer datos
            productsList = Object.values(productsResponse.data);
          }
          
          setUserProducts(productsList.filter(item => item)); // Filtrar null/undefined
        } else {
          setUserProducts([]);
        }        // Fetch user's favorites
        try {
          const favoritesResponse = await api.favorites.getAll();
          
          if (favoritesResponse.success) {
            // Procesar datos paginados - extrayendo el array 'results' si existe
            let favoritesData: Favorite[] = [];
            
            if (Array.isArray(favoritesResponse.data)) {
              // Si la respuesta ya es un array de favoritos
              favoritesData = favoritesResponse.data;            } else if (favoritesResponse.data && favoritesResponse.data.results) {
              // Si la respuesta es una estructura paginada con 'results'
              favoritesData = favoritesResponse.data.results;
            } else {
              // Si la respuesta tiene otro formato
              favoritesData = [];
            }
            
            setFavorites(favoritesData);
          } else {
            setFavorites([]);
          }
        } catch {
          setFavorites([]);
        }        // Fetch user's ratings
        try {
          if (user?.id) {
            const ratingsResponse = await getUserRatings(user.id);
            
            if (ratingsResponse && Array.isArray(ratingsResponse.results)) {
              setRatings(ratingsResponse.results);
            } else if (Array.isArray(ratingsResponse)) {
              setRatings(ratingsResponse);
            } else {
              setRatings([]);
            }
          }
        } catch {
          setRatings([]);
        }
      } catch {
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
  }  return (
    <MyErrorBoundary>
      <GlobalStyles
        styles={{
          'body': {
            backgroundColor: '#ffffff !important',
            margin: 0,
            padding: 0,
          },
          'html': {
            backgroundColor: '#ffffff !important',
          },
          '#root': {
            backgroundColor: 'transparent !important',
          }
        }}
      />
      {/* Fondo animado con Squares */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: '#ffffff !important',
        }}
      >
        <Squares
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(0, 79, 158, 0.2)"
          hoverFillColor="rgba(0, 79, 158, 0.05)"
        />
      </Box>
      
      <Container sx={{ 
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'transparent !important',
        minHeight: '100vh',
      }}>{/* Header */}
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
              <Box sx={{ flex: 1, width: '100%' }}>                {/* Nombre y botón de editar en la misma línea */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                      {profileData?.first_name || profileData?.last_name
                        ? `${profileData.first_name || ''} ${profileData.last_name || ''}`
                        : (user as UserWithProfile).username || user.email}
                    </Typography>                    {(user as UserWithProfile).is_verified_seller && (
                      <VerifiedIcon 
                        sx={{ 
                          color: '#1976d2',
                          fontSize: { xs: '1.5rem', md: '2rem' }
                        }} 
                        titleAccess="Vendedor verificado - Email institucional UOH"
                      />
                    )}
                  </Box>
                  <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                    <EditButton onClick={handleOpenEditModal} />
                  </Box>
                </Box><Typography variant="body1" color="textSecondary">
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
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>                  {/* Verification Status Card */}
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      border: '1px solid #e0e0e0', 
                      borderRadius: 2, 
                      backgroundColor: (user as UserWithProfile).is_verified_seller ? '#e8f5e8' : '#fff3e0',
                      borderLeft: `4px solid ${(user as UserWithProfile).is_verified_seller ? '#4caf50' : '#ff9800'}`
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <VerifiedIcon sx={{ 
                        mr: 1, 
                        fontSize: 16, 
                        color: (user as UserWithProfile).is_verified_seller ? '#4caf50' : '#ff9800' 
                      }} />
                      <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                        Estado de verificación
                      </Typography>
                    </Box>
                    <Typography variant="body2">
                      {(user as UserWithProfile).is_verified_seller 
                        ? 'Vendedor verificado - Email institucional UOH'
                        : 'No verificado - Solo email institucional UOH puede vender'
                      }
                    </Typography>
                  </Box>
                  
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <ContactsIcon sx={{ mr: 1, fontSize: 16, color: '#1976d2' }} />
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                          Biografía
                        </Typography>
                      </Box>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <LocationOnIcon sx={{ mr: 1, fontSize: 16, color: '#4caf50' }} />
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                          Ubicación
                        </Typography>
                      </Box>
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
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                        <CakeIcon sx={{ mr: 1, fontSize: 16, color: '#ff9800' }} />
                        <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                          Fecha de Nacimiento
                        </Typography>
                      </Box>
                      <Typography variant="body2">
                        {(() => {
                          const [year, month, day] = profileData.birth_date.split('-');
                          return `${day}/${month}/${year}`;
                        })()}
                      </Typography>
                    </Box>
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
          </Dialog>          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            mb: 3,
            backgroundColor: '#f8f9fa',
            borderRadius: '8px 8px 0 0',
            overflow: 'hidden'
          }}>
            <Tabs 
              value={tab} 
              onChange={(_e, newValue) => setTab(newValue)}
              variant="fullWidth"
              sx={{
                '& .MuiTab-root': {
                  minWidth: 'auto',
                  fontSize: { xs: '0.75rem', sm: '0.875rem', md: '1rem' },
                  fontWeight: 600,
                  textTransform: 'none',
                  color: '#6b7280',
                  py: { xs: 1.5, sm: 2 },
                  px: { xs: 0.5, sm: 1 },
                  minHeight: { xs: '56px', sm: '64px' },
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 0.5, sm: 1 },
                  '&.Mui-selected': {
                    color: '#004f9e',
                    backgroundColor: '#ffffff',
                    borderBottom: '3px solid #004f9e',
                  },                  '& .MuiTab-iconWrapper': {
                    marginBottom: { xs: '2px', sm: 0 },
                    marginRight: { xs: 0, sm: '6px' },
                    fontSize: { xs: '1.2rem', sm: '1.3rem' },
                    '& svg': {
                      fontSize: { xs: '1.2rem', sm: '1.3rem' },
                    }
                  }
                },
                '& .MuiTabs-indicator': {
                  display: 'none',
                },
                '& .MuiTabs-flexContainer': {
                  backgroundColor: '#f8f9fa',
                }
              }}
            >              <Tab 
                label="Productos" 
                icon={<InventoryIcon sx={{ color: '#AA7444' }} />}
                iconPosition="start"
              />
              <Tab 
                label="Favoritos" 
                icon={<FavoriteIcon sx={{ color: '#e53e3e' }} />}
                iconPosition="start"
              />
              <Tab 
                label="Calificaciones" 
                icon={<StarIcon sx={{ color: '#fbbf24' }} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

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
                  dataSource={favorites}                  renderItem={(item: Favorite) => {
                    // Verificar si tenemos datos de producto válidos
                    if (!item) {
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
