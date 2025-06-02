import { useState, useEffect } from 'react';
import { Typography, CircularProgress, Alert, Container, Card, Box, IconButton } from '@mui/material';
import { Card as AntCard } from 'antd';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import BreadcrumbNav from '../components/BreadcrumbNav';
import api from '../services/api';
import { formatPrice } from '../utils/formatPrice';

const FavoritesPage = () => {
  interface FavoriteItem {
    id: string;
    product: string;
    product_detail?: {
      id?: number;
      title?: string;
      price?: number;
      images?: { image: string }[];
    };
  }
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingFavorites, setRemovingFavorites] = useState<Set<string>>(new Set());
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redireccionar si el usuario no está autenticado
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      setError('');

      try {
        console.log('Obteniendo favoritos...');
        const favoritesResponse = await api.favorites.getAll();
        console.log('Respuesta de favoritos:', favoritesResponse);
        
        if (favoritesResponse.success) {
          // Procesar datos según el formato de respuesta
          let favoritesData;
          
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
          setError('No se pudieron cargar los favoritos');
          setFavorites([]);
        }
      } catch (err) {
        console.error('Error al obtener favoritos:', err);
        setError('Error al cargar los favoritos');
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && isAuthenticated && user) {
      fetchFavorites();
    }
  }, [isAuthenticated, user, navigate, authLoading]);  const handleRemoveFavorite = async (productId: string) => {
    const numericProductId = Number(productId);
    
    console.log('Eliminando favorito con ID:', numericProductId);
    
    // Agregar el producto a la lista de "removiendo" para mostrar estado de carga
    setRemovingFavorites(prev => new Set(prev).add(productId));
    
    try {
      // Usar la misma lógica simple que HomePage
      await api.removeFromFavorites(numericProductId);
      
      // Disparar evento personalizado para notificar que se eliminó un favorito
      window.dispatchEvent(new CustomEvent('favoriteRemoved', { detail: { productId: numericProductId } }));
      
      // Actualizar la lista de favoritos eliminando el producto
      setFavorites(prevFavorites => 
        prevFavorites.filter(item => item.product !== productId)
      );
    } catch (err) {
      console.error('Error al eliminar favorito:', err);
      setError('Error al eliminar de favoritos');
    } finally {
      // Remover el producto de la lista de "removiendo"
      setRemovingFavorites(prev => {
        const newSet = new Set(prev);
        newSet.delete(productId);
        return newSet;
      });
    }
  };

  // Mostrar carga si estamos verificando autenticación o cargando favoritos
  if (authLoading || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }  return (
    <Container maxWidth="xl" sx={{ 
        py: { xs: 0, sm: 1 },
        px: { xs: 0, sm: 1, md: 3 },
        mt: { xs: 0, sm: 1 },
      }}>
      <BreadcrumbNav 
        items={[
          { name: 'Favoritos', href: '/favorites', current: true }
        ]} 
      />
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        
        </Typography>
      </Box>

      {/* Favorites Card */}
      <Card 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)'
        }}
      >
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}        <Box 
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(1, 1fr)',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)'
            },
            gap: 3
          }}
        >
          {favorites.map((item: FavoriteItem) => {
            // Extraer los detalles del producto del objeto favorito
            const productDetail = item.product_detail || {};
            const isRemoving = removingFavorites.has(item.product);
            
            return (
              <Box key={item.id}>
                <AntCard
                  hoverable
                  loading={isRemoving}
                  cover={
                    productDetail.images && productDetail.images.length > 0 ? 
                      <img 
                        alt={productDetail.title || 'Producto'} 
                        src={productDetail.images[0].image}
                        style={{ height: 200, objectFit: 'cover' }}
                      /> : 
                      <div style={{ height: 200, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography>Sin imagen</Typography>
                      </div>
                  }
                  actions={[
                    <Box key="heart" sx={{ display: 'flex', justifyContent: 'center' }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFavorite(item.product);
                        }}
                        disabled={isRemoving}
                        sx={{
                          color: '#ff4d4f',
                          '&:hover': {
                            transform: 'scale(1.2)',
                            transition: 'transform 0.2s ease-in-out'
                          },
                          '&:active': {
                            transform: 'scale(0.9)',
                            transition: 'transform 0.1s ease-in-out'
                          }
                        }}
                      >
                        <HeartFilled style={{ fontSize: '18px' }} />
                      </IconButton>
                    </Box>
                  ]}
                  onClick={() => navigate(`/products/${item.product}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <AntCard.Meta
                    title={productDetail.title || 'Producto sin título'}
                    description={formatPrice(productDetail.price || 0)}
                  />                </AntCard>
              </Box>
            );
          })}
        </Box>
        
        {favorites.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <HeartOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
              No tienes productos favoritos
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Explora nuestros productos y agrega algunos a tus favoritos
            </Typography>
          </Box>
        )}
      </Card>
    </Container>
  );
};

export default FavoritesPage;
