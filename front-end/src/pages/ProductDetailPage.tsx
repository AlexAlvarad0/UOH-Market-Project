import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, 
  Chip, Button, Divider, Alert, CircularProgress, 
  Dialog, DialogTitle, DialogContent, DialogContentText, 
  DialogActions, Snackbar, Card, CardContent,
  IconButton, Avatar, Tabs, Tab, TextField, Modal, Backdrop, Fade,
  GlobalStyles
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import VerifiedIcon from '@mui/icons-material/Verified';
import { useAuth } from '../hooks/useAuth.hooks';
import api from '../services/api';
import { getUserRatingForSeller, Rating } from '../api';
import EditProductModal from '../components/EditProductModal';
import BreadcrumbNav from '../components/BreadcrumbNav';
import Squares from '../../y/Squares/Squares';
import StarRating from '../components/StarRating';
import RatingComponent from '../components/RatingComponent';
import RatingsList from '../components/RatingsList';
import UserProfileModal from '../components/UserProfileModal';
import PriceDisplay from '../components/PriceDisplay';
import EditButton from '../components/buttons/EditButton';
import DeleteButton from '../components/buttons/DeleteButton';
import '../styles/ProductCard.css';

// Tipo para el producto
interface ProductType {
  id: number;
  title: string;
  description: string;
  price: number | string;
  original_price?: number | null;
  category: {
    id: number;
    name: string;
  };
  condition: string;  seller: {
    id: number;
    username: string;
    email: string;
    is_verified_seller: boolean;
    profile_picture?: string;
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
  const [error, setError] = useState<string | null>(null);  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);  const [editModalOpen, setEditModalOpen] = useState(false);  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentUserRating, setCurrentUserRating] = useState<Rating | null>(null);
  const [sellerTabValue, setSellerTabValue] = useState(0);  const [ratingsRefreshKey, setRatingsRefreshKey] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false); // Nuevo estado para controlar eliminación
  
  // Estados para el modal de imagen ampliada
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
    // Estados para el diálogo de contacto
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactMessage, setContactMessage] = useState('¡Hola! ¿Aún está disponible?');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [existingConversationId, setExistingConversationId] = useState<number | null>(null);
  
  // Estados para el modal de perfil del vendedor
  const [sellerProfileModalOpen, setSellerProfileModalOpen] = useState(false);
  
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
        setError(null);        const response = await api.getProductById(numericId);
        if (response.success && response.data) {
          const fetched = response.data;
          setProduct(fetched);
          // Incrementar vista en backend y sincronizar conteo
          if (isAuthenticated && user && user.id !== fetched.seller.id) {
            const inc = await api.incrementView(fetched.id);
            if (inc.success) {
              setProduct(prev => prev ? { ...prev, views_count: inc.data.views_count } : prev);
            }
          }
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
  }, [productId, isAuthenticated, user]);
  // Sincronizar estado de favoritos cuando el producto se carga
  useEffect(() => {
    if (product) {
      setIsFavorite(!!product.is_favorite);
    }
  }, [product]);

  // Cargar la calificación actual del usuario para este vendedor
  useEffect(() => {
    const loadCurrentUserRating = async () => {      if (product && isAuthenticated && !isOwner) {
        try {
          const rating = await getUserRatingForSeller(product.seller.id);
          setCurrentUserRating(rating);
        } catch {
          // Error loading user rating
        }
      }
    };

    loadCurrentUserRating();
  }, [product, isAuthenticated, isOwner]);  // Verificar si existe una conversación activa con este vendedor para este producto
  useEffect(() => {
    const checkExistingConversation = async () => {
      if (product && isAuthenticated && !isOwner) {
        try {
          const response = await api.getExistingConversationForProduct(product.id);
          // Asegurar que data no sea null y contiene id antes de usar
          if (response.success && response.hasConversationWithMessages && response.data) {
            // Castear data a objeto con id
            const conv = response.data as { id: number };
            setExistingConversationId(conv.id);          } else {
            setExistingConversationId(null);
          }        } catch {
          setExistingConversationId(null);
        }
      }
    };    checkExistingConversation();
  }, [product, isAuthenticated, isOwner]);
  // Manejo de teclas para el modal de imagen
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!imageModalOpen || !product?.images) return;
      
      switch (e.key) {
        case 'Escape':
          setImageModalOpen(false);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setModalImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setModalImageIndex((prev) => (prev + 1) % product.images.length);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [imageModalOpen, product]);

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
        });      }    } catch {
      // Error reloading product data
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
      });    } catch {
      // Error updating favorites
      setNotification({
        message: 'Error al actualizar favoritos',
        type: 'error'
      });
    }
  };
  const handleContactSeller = async () => {
    if (!product || !isAuthenticated) return;
    
    // Si ya existe una conversación, ir directamente al chat
    if (existingConversationId) {
      navigate(`/chat/${existingConversationId}`);
      return;
    }
    
    // Abrir diálogo para escribir mensaje inicial
    setContactDialogOpen(true);
  };
  const handleSendContactMessage = async () => {
    if (!product || !contactMessage.trim()) return;
    
    try {
      setSendingMessage(true);
      
      // Crear la conversación
      const response = await api.createConversation(product.id, product.seller.id);
      if (response.success && response.data) {
        // Enviar el mensaje inicial
        const messageResponse = await api.sendMessage(response.data.id, contactMessage);
        
        if (messageResponse.success) {
          setContactDialogOpen(false);
          navigate(`/chat/${response.data.id}`);
        } else {
          setNotification({ message: messageResponse.error || 'Error al enviar mensaje inicial', type: 'error' });
        }
      } else {
        setNotification({ message: response.error || 'No se pudo iniciar la conversación', type: 'error' });
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setNotification({ message: err.message || 'Error al iniciar conversación', type: 'error' });
      } else {
        setNotification({ message: 'Error desconocido al iniciar conversación', type: 'error' });
      }
    } finally {
      setSendingMessage(false);
    }
  };  const handleCloseContactDialog = () => {
    setContactDialogOpen(false);
    setContactMessage('¡Hola! ¿Aún está disponible?'); // Resetear mensaje
  };

  // Funciones para el modal de perfil del vendedor
  const handleOpenSellerProfile = () => {
    setSellerProfileModalOpen(true);
  };

  const handleCloseSellerProfile = () => {
    setSellerProfileModalOpen(false);
  };

  // Funciones para el modal de imagen
  const handleOpenImageModal = (index: number) => {
    setModalImageIndex(index);
    setImageModalOpen(true);
  };  const handleCloseImageModal = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setImageModalOpen(false);
  };

  const handleModalClose = () => {
    setImageModalOpen(false);
  };
  const handlePrevImageModal = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (product && product.images) {
      setModalImageIndex((modalImageIndex - 1 + product.images.length) % product.images.length);
    }
  };

  const handleNextImageModal = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (product && product.images) {
      setModalImageIndex((modalImageIndex + 1) % product.images.length);
    }
  };  const handleDeleteProduct = async () => {
    if (!product || isDeleting) return; // Prevenir múltiples eliminaciones
    
    try {
      setIsDeleting(true);
      setLoading(true);
      setDeleteDialogOpen(false); // Cerrar el modal inmediatamente
      
      const response = await api.deleteProduct(product.id);
      
      if (response.success) {
        setNotification({
          message: 'Producto eliminado correctamente',
          type: 'success'
        });
        
        // Navegar inmediatamente después de mostrar la notificación
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      } else {
        setNotification({
          message: response.error || 'Error al eliminar el producto',
          type: 'error'
        });
        setLoading(false);
        setIsDeleting(false);
      }
    } catch (err: unknown) {
      console.error('Error al eliminar producto:', err);
      setNotification({
        message: 'Error al eliminar el producto',
        type: 'error'
      });
      setLoading(false);
      setIsDeleting(false);
    }
  };

  const handleShareProduct = () => {
    if (navigator.share) {      navigator.share({
        title: product?.title || 'Producto',
        text: `Mira este producto: ${product?.title}`,
        url: window.location.href,
      })
      .catch(() => {
        // Error sharing
      });
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
        <Typography variant="h6" mt={2}>
          {product ? 'Eliminando producto...' : 'Cargando detalles del producto...'}
        </Typography>
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
    <>
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
          speed={0.05}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(0, 79, 158, 0.2)"
          hoverFillColor="rgba(0, 79, 158, 0.05)"
        />
      </Box>
      
      <Container maxWidth="xl" sx={{ 
        py: { xs: 0, sm: 1 },
        px: { xs: 2, sm: 3, md: 4 },
        mt: { xs: 0, sm: 1 },
        width: '100%',
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'transparent !important',
        minHeight: '100vh',
      }}><Box sx={{ px: { xs: 1, sm: 1, md: 0 } }}>
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
          }}>            {/* Carrusel de imágenes manual */}
            {product.images && product.images.length > 0 && (
              <Box sx={{
                position: 'relative', 
                bgcolor: '#f8f9fa', 
                height: { xs: '400px', sm: '450px', md: '500px', lg: '700px', xl: '800px' },
                width: '100%',
                borderRadius: 1,
                overflow: 'hidden'
              }}>
                {/* Flecha anterior solo si hay más de una imagen */}
                {product.images.length > 1 && (
                  <IconButton
                    disableRipple
                    onClick={() => setActiveImageIndex((activeImageIndex - 1 + product.images.length) % product.images.length)}
                    sx={{
                      position: 'absolute', 
                      left: 8, 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      zIndex: 2,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                      '&:active, &:focus': { transform: 'translateY(-50%)' }
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                )}

                <Box 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '100%', 
                    width: '100%',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleOpenImageModal(activeImageIndex)}
                >
                  <img 
                    src={product.images[activeImageIndex].image} 
                    alt={`Imagen ${activeImageIndex + 1}`} 
                    style={{ 
                      maxHeight: '100%', 
                      maxWidth: '100%', 
                      objectFit: 'contain',
                      objectPosition: 'center',
                      transition: 'transform 0.2s ease-in-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                </Box>
                
                {/* Indicador de que se puede ampliar */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  <VisibilityIcon sx={{ fontSize: 16 }} />
                  Click para ampliar
                </Box>
                
                {/* Flecha siguiente solo si hay más de una imagen */}
                {product.images.length > 1 && (
                  <IconButton
                    disableRipple
                    onClick={() => setActiveImageIndex((activeImageIndex + 1) % product.images.length)}
                    sx={{
                      position: 'absolute', 
                      right: 8, 
                      top: '50%', 
                      transform: 'translateY(-50%)', 
                      zIndex: 2,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
                      '&:active, &:focus': { transform: 'translateY(-50%)' }
                    }}
                  >
                    <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />
                  </IconButton>
                )}
              </Box>
            )}            {/* Miniaturas de imágenes - solo mostrar si hay más de una imagen */}
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
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'scale(1.05)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                      }
                    }}
                    onClick={() => {
                      setActiveImageIndex(index);
                      handleOpenImageModal(index);
                    }}
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
              </Box>
            )}          </Card>          {/* Botones de edición y eliminación para el propietario - Solo en pantallas pequeñas */}
          {isAuthenticated && isOwner && (
            <Box sx={{ 
              mb: { xs: 2, md: 3 }, 
              width: '100%',
              display: { xs: 'flex', md: 'none' },
              justifyContent: 'space-between',
              gap: 2
            }}>
              <EditButton 
                onClick={() => setEditModalOpen(true)}
                buttonText="Editar Producto"
              />
              <DeleteButton 
                onClick={() => setDeleteDialogOpen(true)}
                buttonText="Eliminar Producto"
              />
            </Box>
          )}

          {/* Título y descripción del producto - Solo en pantallas pequeñas */}<Card elevation={5} sx={{ 
            mb: { xs: 2, md: 0 }, 
            width: '100%',
            display: { xs: 'block', md: 'none' }
          }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {product.title}
              </Typography>

              <PriceDisplay
                currentPrice={product.price}
                originalPrice={product.original_price}
                variant="h4"
                color="#004f9e"
                showOriginalLabel={true}
                orientation="vertical"
              />

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
                sx={{ 
                  py: 1.5, 
                  flex: 1,
                  backgroundColor: 'rgba(25, 118, 210, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 1)',
                  }
                }}
              >
                {existingConversationId ? 'Ir a la conversación' : 'Contactar Vendedor'}
              </Button>
              <Button
                variant="contained"
                onClick={handleAddToFavorites}
                sx={{
                  py: 1.5,
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'rgba(25, 118, 210, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 1)',
                  }
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
              </Button>              <Button 
                variant="contained" 
                onClick={handleShareProduct}
                startIcon={<ShareIcon />}
                sx={{ 
                  py: 1.5, 
                  flex: 1,
                  backgroundColor: 'rgba(25, 118, 210, 0.9)',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 1)',
                  }
                }}
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
              </Typography>              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>                <Avatar 
                  src={(() => {
                    const profilePic = product.seller.profile_picture;
                    return profilePic || undefined;
                  })()}
                  sx={{ 
                    width: 50, 
                    height: 50, 
                    mr: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      transition: 'transform 0.2s ease-in-out'
                    }
                  }}                  onClick={handleOpenSellerProfile}
                  onError={() => {
                    // Avatar error handled silently
                  }}
                >
                  {!product.seller.profile_picture && product.seller.username.charAt(0).toUpperCase()}
                </Avatar><Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography 
                      variant="subtitle1"
                      onClick={handleOpenSellerProfile}
                      sx={{
                        cursor: 'pointer',
                        color: 'primary.main',
                        '&:hover': {
                          textDecoration: 'underline',
                        }
                      }}
                    >
                      {product.seller.username}
                    </Typography>
                    {product.seller.is_verified_seller && (
                      <VerifiedIcon 
                        sx={{ 
                          color: '#1976d2',
                          fontSize: '1.2rem'
                        }} 
                        titleAccess="Vendedor verificado - Email institucional UOH"
                      />
                    )}
                  </Box>
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
                </Box>              </Box>              {/* Información básica del vendedor */}
              <Box sx={{ mb: 2 }}>
                {product.seller.is_verified_seller ? (
                  <Typography variant="body2" sx={{ mb: 1, color: 'success.main' }}>
                    • <strong>Vendedor verificado</strong> - Email institucional UOH
                  </Typography>
                ) : (
                  <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                    • Vendedor no verificado
                  </Typography>
                )}
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
                      const rating = await getUserRatingForSeller(product.seller.id);
                      setCurrentUserRating(rating);
                    } catch {
                      // Error handling for rating reload
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
          
          {/* Información básica del producto */}          <Card elevation={5} sx={{ mb: { xs: 2, md: 3 }, width: '100%' }}>
            <CardContent>
              <Typography variant="h4" gutterBottom>
                {product.title}
              </Typography>

              <PriceDisplay
                currentPrice={product.price}
                originalPrice={product.original_price}
                variant="h4"
                color="#004f9e"
                showOriginalLabel={true}
                orientation="vertical"
              />

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
              </Typography>            </CardContent>
          </Card>          {/* Botones de edición y eliminación para el propietario - Solo en pantallas grandes */}
          {isAuthenticated && isOwner && (
            <Box sx={{ 
              mb: 3, 
              width: '100%',
              display: { xs: 'none', md: 'flex' },
              justifyContent: 'space-between',
              gap: 2
            }}>
              <EditButton 
                onClick={() => setEditModalOpen(true)}
                buttonText="Editar Producto"
              />
              <DeleteButton 
                onClick={() => setDeleteDialogOpen(true)}
                buttonText="Eliminar Producto"
              />
            </Box>
          )}

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
        onClose={() => !isDeleting && setDeleteDialogOpen(false)}
        disableEscapeKeyDown={isDeleting}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title" sx={{ borderRadius: '25px 25px 0 0' }}>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            ¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent><DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteProduct} 
            color="error" 
            autoFocus
            disabled={isDeleting}
          >
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
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
      )}      {/* Diálogo de contacto con el vendedor */}
      <Dialog
        open={contactDialogOpen}
        onClose={handleCloseContactDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Contactar al vendedor</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Envía un mensaje al vendedor para preguntar sobre el producto.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Tu mensaje"
            type="text"
            fullWidth
            variant="outlined"
            value={contactMessage}
            onChange={(e) => setContactMessage(e.target.value)}
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseContactDialog} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleSendContactMessage} 
            color="primary"
            disabled={sendingMessage || !contactMessage.trim()}
          >
            {sendingMessage ? <CircularProgress size={24} /> : 'Enviar mensaje'}          </Button>
        </DialogActions>
      </Dialog>      {/* Modal de imagen ampliada */}
      <Modal
        open={imageModalOpen}
        onClose={handleModalClose}
        closeAfterTransition
        BackdropComponent={Backdrop}
        BackdropProps={{
          timeout: 500,
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
        }}
      >
        <Fade in={imageModalOpen}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '95vw',
              height: '95vh',
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Botón cerrar */}
              <IconButton
                onClick={(e) => handleCloseImageModal(e)}
                disableRipple
                sx={{
                  position: 'absolute',
                  top: 20,
                  right: 20,
                  zIndex: 3,
                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
                  '&:active, &:focus': { backgroundColor: 'rgba(0, 0, 0, 0.9)' }
                }}
              >
                <CloseIcon />
              </IconButton>

              {/* Imagen principal */}
              {product?.images && product.images[modalImageIndex] && (
                <img
                  src={product.images[modalImageIndex].image}
                  alt={`Imagen ampliada ${modalImageIndex + 1}`}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    objectPosition: 'center'
                  }}
                />
              )}

              {/* Controles de navegación - solo si hay más de una imagen */}
              {product?.images && product.images.length > 1 && (
                <>
                  {/* Flecha anterior */}
                  <IconButton
                    onClick={(e) => handlePrevImageModal(e)}
                    disableRipple
                    sx={{
                      position: 'absolute',
                      left: 20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 3,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
                      '&:active, &:focus': { transform: 'translateY(-50%)' }
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>

                  {/* Flecha siguiente */}
                  <IconButton
                    onClick={(e) => handleNextImageModal(e)}
                    disableRipple
                    sx={{
                      position: 'absolute',
                      right: 20,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 3,
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
                      '&:active, &:focus': { transform: 'translateY(-50%)' }
                    }}
                  >
                    <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />
                  </IconButton>
                </>
              )}

              {/* Indicador de imagen actual */}
              {product?.images && product.images.length > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: 2,
                    fontSize: '0.9rem'
                  }}
                >
                  {modalImageIndex + 1} de {product.images.length}
                </Box>
              )}

              {/* Miniaturas en el modal */}
              {product?.images && product.images.length > 1 && (
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 60,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: 1,
                    maxWidth: '80%',
                    overflowX: 'auto',
                    py: 1
                  }}
                >
                  {product.images.map((img, index) => (
                    <Box
                      key={img.id}
                      sx={{
                        width: 50,
                        height: 50,
                        flexShrink: 0,
                        border: index === modalImageIndex ? '2px solid #1976d2' : '1px solid rgba(255,255,255,0.3)',
                        borderRadius: 1,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'scale(1.1)',
                          border: '2px solid #1976d2'
                        }
                      }}
                      onClick={() => setModalImageIndex(index)}
                    >
                      <img
                        src={img.image}
                        alt={`Miniatura modal ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </Fade>
      </Modal>

      {/* Modal de perfil del vendedor */}
      {product && (
        <UserProfileModal
          open={sellerProfileModalOpen}
          onClose={handleCloseSellerProfile}
          userId={product.seller.id}
          username={product.seller.username}
        />
      )}
    </Container>
    </>
  );
};

export default ProductDetailPage;