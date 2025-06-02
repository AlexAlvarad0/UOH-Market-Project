import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, 
  Chip, Button, Divider, Alert, CircularProgress, 
  Dialog, DialogTitle, DialogContent, DialogContentText, 
  DialogActions, Snackbar, Card, CardContent,
  IconButton, Avatar, Tabs, Tab
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShareIcon from '@mui/icons-material/Share';
import { useAuth } from '../hooks/useAuth.hooks';
import api from '../services/api';
import { getUserRatingForSeller, Rating } from '../api';
import EditButton from '../components/buttons/EditButton';
import DeleteButton from '../components/buttons/DeleteButton';
import EditProductModal from '../components/EditProductModal';
import BreadcrumbNav from '../components/BreadcrumbNav';
import StarRating from '../components/StarRating';
import RatingComponent from '../components/RatingComponent';
import RatingsList from '../components/RatingsList';
import { formatPrice } from '../utils/formatPrice';
import '../styles/ProductCard.css';

// Tipo para el producto
interface ProductType {
  id: number;
  title: string;
  description: string;
  price: number | string;
  category: {
    id: number;
    name: string;
  };
  condition: string;
  seller: {
    id: number;
    username: string;
    email: string;
    profile?: {
      average_rating: number;
      total_ratings: number;
    };
  };
  images: {
    id: number;
    image: string;
    is_primary: boolean;
  }[];
  created_at: string;
  views_count: number;
  location?: string;
  category_name?: string;
  status: string;
  is_favorite?: boolean;
}

const getStatusChip = (status: string) => {
  const statusMap: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
    pending: { label: 'En revisión', color: 'warning' },
    available: { label: 'Disponible', color: 'success' },
    unavailable: { label: 'No disponible', color: 'error' },
  };

  const statusInfo = statusMap[status] || { label: 'Desconocido', color: 'default' };
  return <Chip label={statusInfo.label} color={statusInfo.color as 'warning' | 'success' | 'error' | 'default'} />;
};

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);  const [editModalOpen, setEditModalOpen] = useState(false);  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUserRating, setCurrentUserRating] = useState<Rating | null>(null);
  const [sellerTabValue, setSellerTabValue] = useState(0);
  const [ratingsRefreshKey, setRatingsRefreshKey] = useState(0);
  
  // Determinar si el usuario actual es el propietario del producto
  const isOwner = user && product && user.id === product.seller.id;

  // Mapeo de condiciones de inglés a español
  const conditionMap: Record<string, string> = {
    'new': 'Nuevo',
    'like_new': 'Como nuevo',
    'good': 'Buen estado',
    'fair': 'Estado aceptable',
    'poor': 'Mal estado'
  };

  // Función auxiliar para obtener el nombre de la categoría
  const getCategoryName = (product: ProductType) => {
    if (product.category && typeof product.category === 'object' && product.category.name) {
      return product.category.name;
    }
    if (product.category_name) {
      return product.category_name;
    }
    if (typeof product.category === 'string') {
      return product.category;
    }
    return "Categoría no disponible";
  };

  // Función para obtener el nombre traducido de la condición
  const getConditionName = (condition: string) => {
    return conditionMap[condition] || condition;
  };

  // Función para formatear la fecha relativa
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'hace unos segundos';
    if (diffInSeconds < 3600) return `hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 2592000) return `hace ${Math.floor(diffInSeconds / 86400)} días`;
    if (diffInSeconds < 31536000) return `hace ${Math.floor(diffInSeconds / 2592000)} meses`;
    return `hace ${Math.floor(diffInSeconds / 31536000)} años`;
  };

  useEffect(() => {
    const getProductDetails = async () => {
      if (!productId) {
        setError('ID de producto no proporcionado');
        setLoading(false);
        return;
      }
      
      const numericId = parseInt(productId, 10);
      if (isNaN(numericId)) {
        setError(`ID de producto inválido: ${productId}`);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        const response = await api.getProductById(numericId);
        if (response.success && response.data) {
          setProduct(response.data);
        } else {
          setError(response.error || 'No se pudo cargar el producto');
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || 'Error desconocido al cargar el producto');
        } else {
          setError('Error desconocido al cargar el producto');
        }
      } finally {
        setLoading(false);
      }
    };    getProductDetails();
  }, [productId]);
  // Sincronizar estado de favoritos cuando el producto se carga
  useEffect(() => {
    if (product) {
      setIsFavorite(!!product.is_favorite);
    }
  }, [product]);

  // Cargar la calificación actual del usuario para este vendedor
  useEffect(() => {    const loadCurrentUserRating = async () => {
      if (product && isAuthenticated && !isOwner) {
        try {
          const token = localStorage.getItem('authToken');
          if (token) {
            const rating = await getUserRatingForSeller(product.seller.id, token);
            setCurrentUserRating(rating);
          }
        } catch (error) {
          console.error('Error al cargar la calificación del usuario:', error);
        }
      }
    };

    loadCurrentUserRating();
  }, [product, isAuthenticated, isOwner]);

  const reloadProductData = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const numericId = parseInt(productId, 10);
      const response = await api.getProductById(numericId);
      
      if (response.success && response.data) {
        setProduct(response.data);
        setNotification({ 
          message: 'Producto actualizado correctamente', 
          type: 'success' 
        });
      }
    } catch (err) {
      console.error('Error al recargar producto:', err);
    } finally {
      setLoading(false);
    }
  };  const handleAddToFavorites = async () => {
    if (!product || !isAuthenticated) return;
    
    try {
      if (isFavorite) {
        await api.removeFromFavorites(product.id);
        // Disparar evento personalizado para notificar que se eliminó un favorito
        window.dispatchEvent(new CustomEvent('favoriteRemoved', { detail: { productId: product.id } }));
      } else {
        await api.addToFavorites(product.id);
        // Disparar evento personalizado para notificar que se agregó un favorito
        window.dispatchEvent(new CustomEvent('favoriteAdded', { detail: { productId: product.id } }));
      }
      
      // Actualizar el estado local y el producto
      const newFavoriteState = !isFavorite;
      setIsFavorite(newFavoriteState);
      
      // También actualizar el objeto product para mantener consistencia
      if (product) {
        setProduct(prev => prev ? { ...prev, is_favorite: newFavoriteState } : null);
      }
      
      setNotification({
        message: newFavoriteState ? 'Producto añadido a favoritos' : 'Producto eliminado de favoritos',
        type: 'success'
      });
    } catch (err: unknown) {
      console.error('Error al actualizar favoritos:', err);
      setNotification({
        message: 'Error al actualizar favoritos',
        type: 'error'
      });
    }
  };

  const handleContactSeller = async () => {
    if (!product || !isAuthenticated) return;
    try {
      const response = await api.createConversation(product.id, product.seller.id);
      if (response.success && response.data) {
        navigate(`/chat/${response.data.id}`);
      } else {
        setNotification({ message: response.error || 'No se pudo iniciar la conversación', type: 'error' });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setNotification({ message: err.message || 'Error al iniciar conversación', type: 'error' });
      } else {
        setNotification({ message: 'Error desconocido al iniciar conversación', type: 'error' });
      }
    }
  };

  const handleDeleteProduct = async () => {
    if (!product) return;
    
    try {
      setLoading(true);
      const response = await api.deleteProduct(product.id);
      
      if (response.success) {
        setDeleteDialogOpen(false);
        setNotification({
          message: 'Producto eliminado correctamente',
          type: 'success'
        });
        
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } else {
        setError(response.error || 'Error al eliminar el producto');
        setDeleteDialogOpen(false);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Error desconocido al eliminar el producto');
      } else {
        setError('Error desconocido al eliminar el producto');
      }
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleShareProduct = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.title || 'Producto',
        text: `Mira este producto: ${product?.title}`,
        url: window.location.href,
      })
      .catch((error) => console.log('Error al compartir:', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      setNotification({
        message: 'Enlace copiado al portapapeles',
        type: 'success'
      });
    }
  };

  // Renderizamos diferentes estados de la UI
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, textAlign: 'center', py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" mt={2}>Cargando detalles del producto...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate(-1)}>
          Volver atrás
        </Button>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container maxWidth="xl" sx={{ mt: 4, py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
        <Alert severity="warning">
          No se encontró información del producto.
        </Alert>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate(-1)}>
          Volver atrás
        </Button>
      </Container>
    );
  }  return (
    <Container maxWidth="xl" sx={{ 
        py: { xs: 0, sm: 1 },
        px: { xs: 0, sm: 1, md: 3 },
        mt: { xs: 0, sm: 1 },
        width: '100%'
      }}>      <Box sx={{ px: { xs: 1, sm: 1, md: 0 } }}>
        <BreadcrumbNav 
          items={[
            { name: 'Productos', href: '/', current: false },
            { name: product?.title || 'Detalle del producto', href: '#', current: true }
          ]} 
        />
      </Box>
      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={() => setNotification(null)}
        message={notification?.message}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          '& .MuiSnackbarContent-root': { 
            bgcolor: notification?.type === 'success' ? 'success.main' : 'error.main'
          }
        }}
      />      
      {/* Encabezado con botón de volver atrás */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, px: { xs: 1, sm: 1, md: 0 } }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">
          Detalles del producto
        </Typography>      </Box>      {/* Contenido principal - Layout reorganizado */}
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ px: { xs: 1, sm: 1, md: 0 } }}>        {/* Columna izquierda: imágenes, botones de acción y información del vendedor */}
          <Grid size={{ xs: 12, md: 8 }}>

          <Card elevation={3} sx={{ 
            mb: { xs: 2, md: 3 }, 
            width: '100%'
          }}>{/* Carrusel de imágenes manual */}
            {product.images && product.images.length > 0 && (              <Box sx={{ 
                position: 'relative', 
                bgcolor: '#f5f5f5', 
                height: { xs: '400px', sm: '450px', md: '500px', lg: '700px', xl: '800px' },
                width: '100%'
              }}>                {/* Botones flotantes sobre las imágenes - solo para el propietario */}
                {isAuthenticated && isOwner && (
                  <>
                    {/* EditButton - esquina superior izquierda */}
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 12, 
                      left: 10, 
                      zIndex: 10
                    }}>
                      <EditButton onClick={() => setEditModalOpen(true)} />
                    </Box>
                    
                    {/* DeleteButton - esquina superior derecha */}
                    <Box sx={{ 
                      position: 'absolute', 
                      top: 8, 
                      right: 10, 
                      zIndex: 10
                    }}>
                      <DeleteButton onClick={() => setDeleteDialogOpen(true)} />
                    </Box>
                  </>
                )}
                <IconButton 
                  onClick={() => setActiveImageIndex((activeImageIndex - 1 + product.images.length) % product.images.length)}
                  sx={{ 
                    position: 'absolute', 
                    left: 8, 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    zIndex: 1,
                    '&:active': {
                      transform: 'translateY(-50%)',
                    },
                    '&:focus': {
                      transform: 'translateY(-50%)',
                    }
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  width: '100%'
                }}>
                  <img 
                    src={product.images[activeImageIndex].image} 
                    alt={`Imagen ${activeImageIndex + 1}`} 
                    style={{ 
                      height: '100%', 
                      width: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                </Box>
                <IconButton 
                  onClick={() => setActiveImageIndex((activeImageIndex + 1) % product.images.length)}
                  sx={{ 
                    position: 'absolute', 
                    right: 8, 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    zIndex: 1,
                    '&:active': {
                      transform: 'translateY(-50%)',
                    },
                    '&:focus': {
                      transform: 'translateY(-50%)',
                    }
                  }}
                >
                  <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />
                </IconButton>
              </Box>
            )}

            {/* Miniaturas de imágenes - solo mostrar si hay más de una imagen */}
            {product.images && product.images.length > 1 && (
              <Box sx={{ p: 2, display: 'flex', overflowX: 'auto', gap: 1 }}>
                {product.images.map((img, index) => (
                  <Box
                    key={img.id}
                    sx={{
                      width: 60,
                      height: 60,
                      flexShrink: 0,
                      border: index === activeImageIndex ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer'
                    }}
                    onClick={() => setActiveImageIndex(index)}
                  >
                    <img
                      src={img.image}
                      alt={`Miniatura ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </Box>
                ))}
              </Box>            )}
          </Card>

          {/* Título y descripción del producto - Solo en pantallas pequeñas */}
          <Card elevation={5} sx={{ 
            mb: { xs: 2, md: 0 }, 
            width: '100%',
            display: { xs: 'block', md: 'none' }
          }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {product.title}
              </Typography>

              <Typography variant="h4" color="primary" gutterBottom>
                {formatPrice(product.price)}
              </Typography>

              {/* Fecha relativa */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {getRelativeTime(product.created_at)}
                </Typography>
              </Box>

              {/* Estado del producto */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mr: 1 }}>
                  Estado:
                </Typography>
                {product && getStatusChip(product.status)}
              </Box>

              {/* Estadísticas */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {product.views_count} visualizaciones
                  </Typography>
                </Box>
              </Box>

              {/* Etiquetas */}
              <Box sx={{ mb: 3 }}>
                <Chip 
                  label={getCategoryName(product)} 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                  sx={{ mr: 1 }} 
                />
                <Chip 
                  label={getConditionName(product.condition)} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Descripción */}
              <Typography variant="h6" gutterBottom>
                Descripción
              </Typography>

              <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                {product.description}
              </Typography>
            </CardContent>
          </Card>

          {/* Botones de acción debajo de las fotos */}
          {isAuthenticated && !isOwner && (
            <Box sx={{ 
              mb: { xs: 2, md: 3 }, 
              width: '100%',
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2
            }}>
              <Button 
                variant="contained" 
                onClick={handleContactSeller}
                sx={{ py: 1.5, flex: 1 }}
              >
                Contactar Vendedor
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={handleAddToFavorites}
                sx={{
                  py: 1.5,
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <div className="ui-bookmark">
                  <input type="checkbox" checked={isFavorite} onChange={() => {}} />
                  <div className="bookmark">
                    <svg viewBox="0 0 16 16" style={{marginTop: 0}} className="bi bi-heart-fill" height={20} width={20}>
                      <path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314" fillRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <Typography variant="body2">
                  {isFavorite ? 'En Favoritos' : 'Favoritos'}
                </Typography>
              </Button>
              <Button 
                variant="outlined" 
                onClick={handleShareProduct}
                startIcon={<ShareIcon />}
                sx={{ py: 1.5, flex: 1 }}
              >
                Compartir
              </Button>
            </Box>
          )}

          {/* Información del vendedor debajo de los botones */}
          <Card elevation={5} sx={{ mb: { xs: 2, md: 3 }, width: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Información del vendedor
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar 
                  sx={{ width: 50, height: 50, mr: 2 }}
                >
                  {product.seller.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1">
                    {product.seller.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Miembro desde {new Date().getFullYear()}
                  </Typography>
                  {product.seller.profile && (
                    <Box sx={{ mt: 1 }}>
                      <StarRating
                        rating={product.seller.profile.average_rating || 0}
                        totalRatings={product.seller.profile.total_ratings || 0}
                        showText={true}
                        size="small"
                      />
                    </Box>
                  )}
                </Box>              </Box>

              {/* Información básica del vendedor */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • <strong>Verificado</strong> por nuestro equipo
                </Typography>
                <Typography variant="body2">
                  • <strong>{product.seller.profile?.total_ratings || 0}</strong> calificaciones
                </Typography>
              </Box>

              {/* Pestañas para alternar entre calificaciones y calificar */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs value={sellerTabValue} onChange={(_, newValue) => setSellerTabValue(newValue)}>
                  <Tab label="Calificaciones" />
                  {isAuthenticated && !isOwner && <Tab label="Calificar" />}
                </Tabs>
              </Box>

              {/* Contenido de las pestañas */}
              {sellerTabValue === 0 && (
                <RatingsList
                  sellerId={product.seller.id}
                  averageRating={product.seller.profile?.average_rating || 0}
                  totalRatings={product.seller.profile?.total_ratings || 0}
                  key={ratingsRefreshKey}
                />
              )}              {sellerTabValue === 1 && isAuthenticated && !isOwner && (
                <RatingComponent
                  sellerId={product.seller.id}
                  sellerName={product.seller.username}
                  currentUserRating={currentUserRating}                  onRatingSubmitted={async () => {
                    setRatingsRefreshKey(prev => prev + 1);
                    setSellerTabValue(0); // Cambiar a la pestaña de calificaciones
                    
                    // Recargar los datos del producto para obtener el promedio actualizado
                    await reloadProductData();
                    
                    // Recargar la calificación actual del usuario
                    try {
                      const token = localStorage.getItem('authToken');
                      if (token) {
                        const rating = await getUserRatingForSeller(product.seller.id, token);
                        setCurrentUserRating(rating);
                      }
                    } catch (error) {
                      console.error('Error al recargar la calificación del usuario:', error);
                    }
                  }}
                />              )}</CardContent>
          </Card>

          {/* Consejos de seguridad - Solo en pantallas pequeñas */}
          <Card elevation={5} sx={{ 
            bgcolor: '#f5f7fa', 
            mb: { xs: 2, md: 0 }, 
            width: '100%',
            display: { xs: 'block', md: 'none' }
          }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Consejos de seguridad
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Nunca pagues por adelantado sin verificar
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Revisa el producto antes de comprarlo
              </Typography>
              <Typography variant="body2">
                • Acuerda reunirte en un lugar público
              </Typography>
            </CardContent>
          </Card>

          {/* Botón de inicio de sesión para usuarios no autenticados */}
          {!isAuthenticated && (
            <Card elevation={5} sx={{ mb: { xs: 2, md: 3 }, width: '100%' }}>
              <CardContent>
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={() => navigate('/login')}
                  sx={{ py: 1.5 }}
                >
                  Inicia sesión para contactar
                </Button>
              </CardContent>
            </Card>
          )}        </Grid>{/* Columna derecha: información básica del producto únicamente - Solo en pantallas medianas y grandes */}
        <Grid size={{ xs: 12, md: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
          {/* Espaciado para alinear con los botones de edición en pantallas grandes - solo si es el propietario */}
          {isAuthenticated && isOwner && (
            <Box sx={{ 
              height: { xs: 0, md: '0px' }, // Altura aproximada de los botones de edición + margen
              display: { xs: 'none', md: 'block' }
            }} />
          )}
          
          {/* Información básica del producto */}
          <Card elevation={5} sx={{ mb: { xs: 2, md: 3 }, width: '100%' }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {product.title}
              </Typography>

              <Typography variant="h4" color="primary" gutterBottom>
                {formatPrice(product.price)}
              </Typography>

              {/* Fecha relativa */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {getRelativeTime(product.created_at)}
                </Typography>
              </Box>

              {/* Estado del producto */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ mr: 1 }}>
                  Estado:
                </Typography>
                {product && getStatusChip(product.status)}
              </Box>

              {/* Estadísticas */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VisibilityIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    {product.views_count} visualizaciones
                  </Typography>
                </Box>
              </Box>

              {/* Etiquetas */}
              <Box sx={{ mb: 3 }}>
                <Chip 
                  label={getCategoryName(product)} 
                  color="primary" 
                  variant="outlined" 
                  size="small"
                  sx={{ mr: 1 }} 
                />
                <Chip 
                  label={getConditionName(product.condition)} 
                  color="secondary" 
                  variant="outlined"
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Descripción */}
              <Typography variant="h6" gutterBottom>
                Descripción
              </Typography>

              <Typography variant="body1" sx={{ mb: 3, whiteSpace: 'pre-line' }}>
                {product.description}
              </Typography>
            </CardContent>
          </Card>

          {/* Consejos de seguridad */}
          <Card elevation={5} sx={{ bgcolor: '#f5f7fa' }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Consejos de seguridad
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Nunca pagues por adelantado sin verificar
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                • Revisa el producto antes de comprarlo
              </Typography>
              <Typography variant="body2">
                • Acuerda reunirte en un lugar público
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Diálogo de confirmación para eliminar */}      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle sx={{ borderRadius: '25px 25px 0 0' }}>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteProduct} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de edición rápida */}
      {product && (
        <EditProductModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          product={product}
          onSuccess={reloadProductData}
        />
      )}
    </Container>
  );
};

export default ProductDetailPage;