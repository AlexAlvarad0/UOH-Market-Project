import { useState, useEffect } from 'react';
import { Typography, Grid, CircularProgress, Alert, Container } from '@mui/material';
import { Card } from 'antd';
import { HeartFilled } from '@ant-design/icons';
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
      title?: string;
      price?: number;
      images?: { image: string }[];
    };
  }
  
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
  }, [isAuthenticated, user, navigate, authLoading]);

  const handleRemoveFavorite = async (productId: string) => {
    try {
      const response = await api.removeFromFavorites(Number(productId));
      if (response.success) {
        // Actualizar la lista de favoritos eliminando el producto
        setFavorites(prevFavorites => 
          prevFavorites.filter(item => item.product !== productId)
        );
      } else {
        setError(response.error || 'Error al eliminar de favoritos');
      }
    } catch (err) {
      console.error('Error al eliminar favorito:', err);
      setError('Error al eliminar de favoritos');
    }
  };

  // Mostrar carga si estamos verificando autenticación o cargando favoritos
  if (authLoading || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 }, mt: { xs: 2, sm: 3 }, mb: 4 }}>
      <BreadcrumbNav 
        items={[
          { name: 'Favoritos', href: '/favorites', current: true }
        ]} 
      />
      <Typography variant="h4" gutterBottom>
        Mis Favoritos
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Grid container spacing={3}>
        {favorites.map((item: FavoriteItem) => {
          // Extraer los detalles del producto del objeto favorito
          const productDetail = item.product_detail || {};
          
          return (
            <Grid container spacing={2}>
              <Card
                hoverable
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
                  <HeartFilled 
                    key="heart" 
                    style={{ color: '#ff4d4f' }} 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(item.product);
                    }}
                  />
                ]}
                onClick={() => navigate(`/products/${item.product}`)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Meta
                  title={productDetail.title || 'Producto sin título'}
                  description={formatPrice(productDetail.price || 0)}
                />
              </Card>
            </Grid>
          );
        })}
      </Grid>
      {favorites.length === 0 && (
        <Typography variant="body1" sx={{ mt: 3 }}>
          No tienes productos favoritos
        </Typography>
      )}
    </Container>
  );
};

export default FavoritesPage;
