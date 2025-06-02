import { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, Paper, Card, CardContent, 
  Button, Chip, IconButton, Dialog, DialogActions, 
  DialogContent, DialogContentText, DialogTitle, CircularProgress, 
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  DataGrid, 
  GridColDef, 
  GridRenderCellParams
} from '@mui/x-data-grid';

// Define our own interface for the value getter params
interface GridValueGetterParams {
  row: Record<string, unknown>;
  value?: unknown;
}
import { Add, Visibility } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth.hooks';
import EditButton from '../components/buttons/EditButton';
import DeleteButton from '../components/buttons/DeleteButton';
import { formatPrice } from '../utils/formatPrice';
import { Product } from '../types/product';

const SellerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  useEffect(() => {
    const fetchSellerProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Obteniendo productos del vendedor...');
        
        // Usar el endpoint específico para productos del usuario actual en lugar de filtrar
        const response = await api.getUserProducts();
        console.log('Respuesta de productos:', response);
        
        if (response.success) {
          // Procesar los productos para formato consistente
          let productsList = [];
          
          if (Array.isArray(response.data)) {
            productsList = response.data;
          } else if (response.data && Array.isArray(response.data.results)) {
            productsList = response.data.results;
          } else if (response.data) {
            // Si no es un array ni tiene .results, intentar extraer datos
            console.log('Formato de respuesta no estándar:', response.data);
            productsList = Object.values(response.data);
          }          // Procesar cada producto para asegurar que los datos estén en el formato correcto
          const processedProducts = productsList.map((product: Record<string, unknown>) => {
            // Determinar la URL de imagen si existe
            let imageUrl = null;
            if (product.images && Array.isArray(product.images) && product.images.length > 0) {
              // Buscar la imagen primaria primero
              interface ProductImage { is_primary: boolean; image: string; }
              const primaryImage = product.images.find((img: ProductImage) => img.is_primary);
              imageUrl = primaryImage ? primaryImage.image : (product.images[0] as ProductImage).image;
            }
              // Procesar la categoría
            let categoryName = '';
            if (typeof product.category === 'object' && product.category !== null) {
              const categoryObj = product.category as { name?: string };
              categoryName = categoryObj.name || '';
            } else if (typeof product.category_name === 'string') {
              categoryName = product.category_name;
            }
            
            return {
              ...product,
              image: imageUrl,
              category_name: categoryName
            } as Product;
          });
          
          console.log('Productos procesados:', processedProducts);
          setProducts(processedProducts);
        } else {
          console.error('Error al obtener productos:', response.error);
          setError('No se pudieron cargar los productos. ' + response.error);
        }      } catch (err) {
        console.error('Error fetching seller products:', err);
        const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
        setError('Error cargando tus productos: ' + errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSellerProducts();
    }
  }, [user]);

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      // Usar el método de API en lugar de fetch directo
      const response = await api.deleteProduct(productToDelete);
      
      if (response.success) {
        console.log(`Producto ${productToDelete} eliminado correctamente`);
        setProducts(products.filter(product => product.id !== productToDelete));
        setDeleteDialogOpen(false);
        setProductToDelete(null);
      } else {
        setError(response.error || 'Error al eliminar el producto');
      }    } catch (err) {
      console.error('Error deleting product:', err);
      const errorMessage = err instanceof Error ? err.message : 'Intenta de nuevo';
      setError('Error al eliminar el producto: ' + errorMessage);
    }
  };

  const openDeleteDialog = (id: number) => {
    setProductToDelete(id);
    setDeleteDialogOpen(true);
  };

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 70 
    },
    {
      field: 'image',
      headerName: 'Imagen',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Box 
          component="img"
          src={params.value || 'https://placehold.co/100x100?text=No+Image'}
          alt={params.row.title}
          sx={{ 
            width: 50, 
            height: 50, 
            objectFit: 'cover',
            borderRadius: 1
          }}
        />
      )
    },
    { 
      field: 'title', 
      headerName: 'Título', 
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <Typography noWrap title={params.value}>
          {params.value}
        </Typography>
      )
    },
    {
      field: 'price',
      headerName: 'Precio',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Typography>{formatPrice(params.value)}</Typography>
      )
    },    {
      field: 'category_name',
      headerName: 'Categoría',
      width: 150,
      valueGetter: (params: GridValueGetterParams) => params.row.category_name || params.row.category
    },
    {
      field: 'condition',
      headerName: 'Condición',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const conditionLabels: Record<string, string> = {
          new: 'Nuevo',
          like_new: 'Como nuevo',
          good: 'Buen estado',
          fair: 'Aceptable',
          poor: 'Usado'
        };
        
        return (
          <Chip 
            label={conditionLabels[params.value] || params.value} 
            size="small" 
          />
        );
      }
    },
    {
      field: 'views_count',
      headerName: 'Vistas',
      width: 90,
      type: 'number'
    },
    {
      field: 'created_at',
      headerName: 'Fecha',
      width: 110,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {new Date(params.value).toLocaleDateString()}
        </Typography>
      )
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 200,
      renderCell: (params: GridRenderCellParams) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <IconButton 
            size="small"
            onClick={() => navigate(`/products/${params.row.id}`)}
            title="Ver"
          >
            <Visibility fontSize="small" />
          </IconButton>
          
          <EditButton 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/product/edit/${params.row.id}`);
            }}
            buttonText="Editar"
          />
          
          <DeleteButton 
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(params.row.id);
            }}
            buttonText="Eliminar"
          />
        </div>
      )
    }
  ];  // Verificar si el usuario es vendedor
  const userWithType = user as { user_type?: 'customer' | 'seller' };
  if (!user || userWithType.user_type !== 'seller') {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={5} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h5" gutterBottom align="center">
            Acceso restringido
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            Esta área es solo para vendedores. No tienes los permisos necesarios para acceder.
          </Alert>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Panel de vendedor
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/product/new')}
        >
          Nuevo producto
        </Button>
      </Box>      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', md: 'calc(33.33% - 16px)' } }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total de productos
              </Typography>
              <Typography variant="h4">
                {products.length}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', md: 'calc(33.33% - 16px)' } }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Vistas totales
              </Typography>
              <Typography variant="h4">
                {products.reduce((sum, product) => sum + (product.views_count || 0), 0)}
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: { xs: '100%', md: 'calc(33.33% - 16px)' } }}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Mensajes pendientes
              </Typography>
              <Typography variant="h4">
                0
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Paper sx={{ height: 500, width: '100%', overflow: 'hidden' }}>
        <Typography variant="h6" sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          Mis productos
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : products.length > 0 ? (
          <DataGrid
            rows={products}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { page: 0, pageSize: 10 },
              },
              sorting: {
                sortModel: [{ field: 'created_at', sort: 'desc' }],
              },
            }}
            pageSizeOptions={[5, 10, 25]}
            disableRowSelectionOnClick
          />
        ) : (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" gutterBottom>
              No tienes productos publicados
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/product/new')}
              sx={{ mt: 2 }}
            >
              Publicar mi primer producto
            </Button>
          </Box>
        )}
      </Paper>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>
          Confirmar eliminación
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteProduct} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SellerDashboardPage;
