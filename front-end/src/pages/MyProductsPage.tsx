import { useState, useEffect } from 'react';
import { Typography, CircularProgress, Alert, Container, Card, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Snackbar, Chip, GlobalStyles } from '@mui/material';
import { Card as AntCard } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import BreadcrumbNav from '../components/BreadcrumbNav';
import EditProductModal from '../components/EditProductModal';
import api from '../services/api';
import { formatPrice } from '../utils/formatPrice';
import Squares from '../../y/Squares/Squares';

const MyProductsPage = () => {  interface ProductItem {
    id: number;
    title: string;
    description?: string;
    price: number;
    images?: { image: string }[];
    category?: {
      id: number;
      name: string;
    };
    condition?: string;
    status?: string;
    created_at?: string;
  }
    const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingProducts, setDeletingProducts] = useState<Set<number>>(new Set());
    // Estados para el modal de edición
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number;
    title: string;
    description: string;
    price: number | string;
    category: number | { id: number; name: string };
    condition: string;
    status: string;
  } | null>(null);
  
  // Estados para el diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  
  // Estado para notificaciones
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    // Redireccionar si el usuario no está autenticado
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!authLoading && isAuthenticated && user) {
      fetchMyProducts();
    }
  }, [isAuthenticated, user, navigate, authLoading]);  const handleEditProduct = (product: ProductItem) => {
    // Transformar ProductItem a ProductToEdit
    const productToEdit = {
      id: product.id,
      title: product.title,
      description: product.description || '',
      price: product.price,
      category: product.category || { id: 0, name: 'Sin categoría' },
      condition: product.condition || 'good',
      status: product.status || 'available'
    };
    setSelectedProduct(productToEdit);
    setEditModalOpen(true);
  };

  const handleDeleteProduct = (product: ProductItem) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    // Agregar el producto a la lista de "eliminando" para mostrar estado de carga
    setDeletingProducts(prev => new Set(prev).add(productToDelete.id));
    
    try {
      const response = await api.deleteProduct(productToDelete.id);
      
      if (response.success) {
        // Actualizar la lista de productos eliminando el producto
        setProducts(prevProducts => 
          prevProducts.filter(item => item.id !== productToDelete.id)
        );
        setNotification({
          message: 'Producto eliminado correctamente',
          type: 'success'
        });      } else {
        setNotification({
          message: 'Error al eliminar el producto: ' + response.error,
          type: 'error'
        });
      }
    } catch {
      setNotification({
        message: 'Error al eliminar el producto',
        type: 'error'
      });
    } finally {
      // Remover el producto de la lista de "eliminando"
      setDeletingProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productToDelete.id);
        return newSet;
      });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleEditSuccess = () => {
    // Recargar la lista de productos después de una edición exitosa
    fetchMyProducts();
    setNotification({
      message: 'Producto actualizado correctamente',
      type: 'success'
    });
  };

  const fetchMyProducts = async () => {
    setLoading(true);
    setError('');    try {
      const productsResponse = await api.getUserProducts();
      
      if (productsResponse.success) {
        // Procesar datos según el formato de respuesta
        let productsData;
        
        if (Array.isArray(productsResponse.data)) {
          // Si la respuesta ya es un array de productos
          productsData = productsResponse.data;        } else if (productsResponse.data && productsResponse.data.results) {
          // Si la respuesta es una estructura paginada con 'results'
          productsData = productsResponse.data.results;
        } else {
          // Si la respuesta tiene otro formato
          productsData = [];
        }
        
        setProducts(productsData);
      } else {
        setError('No se pudieron cargar tus productos');
        setProducts([]);
      }
    } catch {
      setError('Error al cargar tus productos');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };  // Función para generar chips de estado como en ProductDetailPage
  const getStatusChip = (status?: string) => {
    const statusMap: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
      pending: { label: 'En revisión', color: 'warning' },
      available: { label: 'Disponible', color: 'success' },
      unavailable: { label: 'No disponible', color: 'error' },
    };

    const statusInfo = statusMap[status || 'available'] || { label: 'Desconocido', color: 'default' };
    return <Chip label={statusInfo.label} color={statusInfo.color} size="small" />;
  };

  // Mostrar carga si estamos verificando autenticación o cargando productos
  if (authLoading || loading) {
    return (
      <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Container>
    );
  }
  return (
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
        position: 'relative',
        zIndex: 10,
        backgroundColor: 'transparent !important',
        minHeight: '100vh',
      }}>
      <BreadcrumbNav 
        items={[
          { name: 'Mis Productos', href: '/my-products', current: true }
        ]} 
      />
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
         
        </Typography>
      </Box>

      {/* Products Card */}
      <Card 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 3, 
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          background: 'linear-gradient(135deg, #fff 0%, #f8f9ff 100%)'
        }}
      >
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box 
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
          {products.map((product: ProductItem) => {
            const isDeleting = deletingProducts.has(product.id);
            
            return (
              <Box key={product.id}>
                <AntCard
                  hoverable
                  loading={isDeleting}
                  cover={
                    product.images && product.images.length > 0 ? 
                      <img 
                        alt={product.title || 'Producto'} 
                        src={product.images[0].image}
                        style={{ height: 200, objectFit: 'cover' }}
                      /> : 
                      <div style={{ height: 200, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography>Sin imagen</Typography>
                      </div>
                  }
                  actions={[                    <Box key="edit" sx={{ display: 'flex', justifyContent: 'center' }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProduct(product);
                        }}
                        disabled={isDeleting}
                        sx={{
                          color: '#1890ff',
                          '&:hover': {
                            transform: 'scale(1.2)',
                            transition: 'transform 0.2s ease-in-out'
                          }
                        }}
                      >
                        <EditOutlined style={{ fontSize: '18px' }} />
                      </IconButton>
                    </Box>,
                    <Box key="delete" sx={{ display: 'flex', justifyContent: 'center' }}>
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(product);
                        }}
                        disabled={isDeleting}
                        sx={{
                          color: '#ff4d4f',
                          '&:hover': {
                            transform: 'scale(1.2)',
                            transition: 'transform 0.2s ease-in-out'
                          }
                        }}
                      >
                        <DeleteOutlined style={{ fontSize: '18px' }} />
                      </IconButton>
                    </Box>
                  ]}
                  onClick={() => navigate(`/products/${product.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <AntCard.Meta
                    title={
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                          {product.title || 'Producto sin título'}
                        </Typography>                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatPrice(product.price || 0)}
                          </Typography>
                          {getStatusChip(product.status)}
                        </Box>
                      </Box>
                    }
                    description={
                      <Box>
                        {product.category && (
                          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                            {product.category.name}
                          </Typography>
                        )}
                        {product.created_at && (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Publicado: {new Date(product.created_at).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </AntCard>
              </Box>
            );
          })}
        </Box>
        
        {products.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', mb: 2 }}>
              No tienes productos publicados
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Comienza a vender tus productos en UOH Market
            </Typography>
            <Box>
              <button
                onClick={() => navigate('/product/new')}
                style={{
                  backgroundColor: '#004f9e',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#003d7a';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#004f9e';
                }}
              >
                Publicar Producto
              </button>
            </Box>
          </Box>        )}
      </Card>

      {/* Modal de edición de producto */}
      {selectedProduct && (
        <EditProductModal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          product={selectedProduct}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Diálogo de confirmación para eliminar */}      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            ¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmDeleteProduct} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificaciones */}
      <Snackbar 
        open={!!notification} 
        autoHideDuration={6000} 
        onClose={() => setNotification(null)}
        message={notification?.message}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{ 
          '& .MuiSnackbarContent-root': { 
            bgcolor: notification?.type === 'success' ? 'success.main' : 'error.main'          }
        }}
      />
    </Container>
    </>
  );
};

export default MyProductsPage;
