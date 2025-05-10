import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Typography, Box, Grid, Paper, 
  Chip, Button, Divider, Alert, CircularProgress, 
  Dialog, DialogTitle, DialogContent, DialogContentText, 
  DialogActions, Snackbar, Card, CardContent,
  IconButton, Avatar
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShareIcon from '@mui/icons-material/Share';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import EditButton from '../components/buttons/EditButton';
import DeleteButton from '../components/buttons/DeleteButton';
import EditProductModal from '../components/EditProductModal';
import BreadcrumbNav from '../components/BreadcrumbNav';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { formatPrice } from '../utils/formatPrice';

// Estilos para los botones de carrusel
const arrowButtonStyle = {
  minWidth: 0,
  width: { xs: '32px', sm: '36px', md: '40px' },
  height: { xs: '32px', sm: '36px', md: '40px' }, // Igualado al width para crear círculos perfectos
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.5)',
  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10,
  background: 'rgba(0, 0, 0, 0.5)',
  padding: 0, // Eliminando padding para evitar estiramiento
  margin: 0,
  '&:hover': {
    background: 'rgba(0, 0, 0, 0.7)',
    color: '#fff'
  }
};

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
  };
  images: {
    id: number;
    image: string;
    is_primary: boolean;
  }[];
  created_at: string;
  views_count: number;
  location?: string;
  category_name?: string; // Para compatibilidad
  status: string; // Nuevo campo para el estado del producto
}

const getStatusChip = (status: string) => {
  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: 'En revisión', color: 'warning' },
    available: { label: 'Disponible', color: 'success' },
    unavailable: { label: 'No disponible', color: 'error' },
  };

  const statusInfo = statusMap[status] || { label: 'Desconocido', color: 'default' };
  return <Chip label={statusInfo.label} color={statusInfo.color} />;
};

const ProductDetailPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  
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
      } catch (err: any) {
        setError(err.message || 'Error desconocido al cargar el producto');
      } finally {
        setLoading(false);
      }
    };

    getProductDetails();
  }, [productId]);

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
  };

  const handleAddToFavorites = async () => {
    if (!product || !isAuthenticated) return;
    
    try {
      const response = await api.addToFavorites(product.id);
      if (response.success) {
        setNotification({
          message: 'Producto añadido a favoritos',
          type: 'success'
        });
      } else {
        setNotification({
          message: response.error || 'Error al añadir a favoritos',
          type: 'error'
        });
      }
    } catch (err: any) {
      setNotification({
        message: 'Error al añadir a favoritos',
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
    } catch (err: any) {
      setNotification({ message: err.message || 'Error al iniciar conversación', type: 'error' });
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
    } catch (err: any) {
      setError(err.message || 'Error desconocido al eliminar el producto');
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
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 }, mt: { xs: 2, sm: 3 }, mb: 8 }}>
      <BreadcrumbNav 
        items={[
          { name: 'Productos', href: '/', current: false },
          { name: product?.title || 'Detalle del producto', href: '#', current: true }
        ]} 
      />
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
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6">
          Detalles del producto
        </Typography>
      </Box>
      
      {/* Contenido principal */}
      <Grid container spacing={3}>
        {/* Columna izquierda: imágenes y detalles */}
        <Grid item xs={12} md={8}>
          <Card elevation={1} sx={{ mb: 3, overflow: 'hidden' }}>
            {/* Carrusel de imágenes */}
            {product.images && product.images.length > 0 ? (
              <Box sx={{ position: 'relative', bgcolor: '#f5f5f5' }}>
                <Carousel 
                  onSelect={(index) => setActiveImageIndex(index)}
                  opts={{ loop: true }}
                >
                  <CarouselContent>
                    {product.images.map((img) => (
                      <CarouselItem key={img.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: {xs: '300px', sm: '400px', md: '500px'},
                            width: '100%',
                            bgcolor: '#f5f5f5'
                          }}
                        >
                          <img
                            src={img.image}
                            alt={`Imagen ${img.id}`}
                            style={{
                              height: '100%',
                              maxWidth: '100%',
                              objectFit: 'contain'
                            }}
                          />
                        </Box>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  
                  {/* Mostrar botones de navegación solo si hay más de una imagen */}
                  {product.images.length > 1 && (
                    <>
                      <CarouselPrevious
                        style={{
                          ...arrowButtonStyle,
                          position: 'absolute',
                          top: '50%',
                          left: '10px',
                          transform: 'translateY(-50%)',
                        }}
                      />
                      <CarouselNext
                        style={{
                          ...arrowButtonStyle,
                          position: 'absolute',
                          top: '50%',
                          right: '10px',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    </>
                  )}
                </Carousel>
                
                {/* Contador de imágenes - solo mostrar si hay más de una imagen */}
                {product.images.length > 1 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 8,
                      fontSize: 14
                    }}
                  >
                    {activeImageIndex + 1} / {product.images.length}
                  </Box>
                )}
              </Box>
            ) : (
              <Box 
                sx={{ 
                  height: {xs: '300px', sm: '400px', md: '500px'}, 
                  bgcolor: '#f5f5f5', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <Typography variant="subtitle1" color="text.secondary">
                  No hay imagen disponible
                </Typography>
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
              </Box>
            )}
          </Card>
          
          {/* Detalles del producto */}
          <Card elevation={1} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h5" gutterBottom>
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
              
              {/* Botones de acción móviles (solo en pantallas pequeñas) */}
              <Box sx={{ mt: 3, display: { xs: 'flex', md: 'none' }, gap: 2, flexDirection: 'row' }}>
                {isAuthenticated ? (
                  !isOwner ? (
                    <>
                      <Button 
                        variant="contained" 
                        fullWidth 
                        onClick={handleContactSeller}
                        sx={{ py: 1.5 }}
                      >
                        Contactar Vendedor
                      </Button>
                      <Button 
                        variant="outlined" 
                        color="secondary" 
                        fullWidth 
                        onClick={handleAddToFavorites}
                        startIcon={<FavoriteBorderIcon />}
                        sx={{ py: 1.5 }}
                      >
                        Añadir a Favoritos
                      </Button>
                      <Button 
                        variant="outlined" 
                        fullWidth 
                        onClick={handleShareProduct}
                        startIcon={<ShareIcon />}
                        sx={{ py: 1.5 }}
                      >
                        Compartir
                      </Button>
                    </>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <EditButton onClick={() => setEditModalOpen(true)} />
                      <DeleteButton onClick={() => setDeleteDialogOpen(true)} />
                    </Box>
                  )
                ) : (
                  <Button 
                    variant="contained" 
                    fullWidth 
                    onClick={() => navigate('/login')}
                    sx={{ py: 1.5 }}
                  >
                    Inicia sesión para contactar
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Columna derecha: información del vendedor y botones de acción */}
        <Grid item xs={12} md={4}>
          {/* Información del vendedor */}
          <Card elevation={1} sx={{ mb: 3 }}>
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
                </Box>
              </Box>
              
              {/* Estadísticas del vendedor */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  • <strong>100%</strong> de valoraciones positivas
                </Typography>
                <Typography variant="body2">
                  • <strong>Verificado</strong> por nuestro equipo
                </Typography>
              </Box>
            </CardContent>
          </Card>
          
          {/* Botones de acción (solo en pantallas medianas y grandes) */}
          <Card elevation={1} sx={{ display: { xs: 'none', md: 'block' } }}>
            <CardContent>
              {isAuthenticated ? (
                !isOwner ? (
                  <>
                    <Button 
                      variant="contained" 
                      fullWidth 
                      onClick={handleContactSeller}
                      sx={{ py: 1.5, mb: 2 }}
                    >
                      Contactar Vendedor
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="secondary" 
                      fullWidth 
                      onClick={handleAddToFavorites}
                      startIcon={<FavoriteBorderIcon />}
                      sx={{ py: 1.5, mb: 2 }}
                    >
                      Añadir a Favoritos
                    </Button>
                    <Button 
                      variant="outlined" 
                      fullWidth 
                      onClick={handleShareProduct}
                      startIcon={<ShareIcon />}
                      sx={{ py: 1.5 }}
                    >
                      Compartir
                    </Button>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <EditButton onClick={() => setEditModalOpen(true)} />
                    <DeleteButton onClick={() => setDeleteDialogOpen(true)} />
                  </Box>
                )
              ) : (
                <Button 
                  variant="contained" 
                  fullWidth 
                  onClick={() => navigate('/login')}
                  sx={{ py: 1.5 }}
                >
                  Inicia sesión para contactar
                </Button>
              )}
            </CardContent>
          </Card>
          
          {/* Consejos de seguridad */}
          <Card elevation={1} sx={{ mt: 3, bgcolor: '#f5f7fa' }}>
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
      
      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
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
