import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, MenuItem, Button, 
  Grid, Paper, CircularProgress, Alert, FormControl,
  InputLabel, Select, FormHelperText, Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
}

const EditProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [condition, setCondition] = useState('');
  const [product, setProduct] = useState<any>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [statusChanging, setStatusChanging] = useState(false);

  // Comprobar autenticación
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("Usuario no autenticado, redirigiendo a login");
      navigate('/login', { state: { from: `/product/edit/${productId}` } });
    }
  }, [isAuthenticated, navigate, productId]);

  // Cargar datos del producto y categorías
  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !productId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Cargar categorías
        console.log("Cargando categorías...");
        const categoriesResponse = await api.getCategories();
        if (categoriesResponse.success) {
          setCategories(categoriesResponse.data);
          console.log("Categorías cargadas:", categoriesResponse.data);
        } else {
          console.error("Error cargando categorías:", categoriesResponse.error);
        }
        
        // Cargar datos del producto
        console.log(`Cargando producto ${productId}...`);
        const numericId = parseInt(productId);
        if (isNaN(numericId)) {
          throw new Error('ID de producto no válido');
        }
        
        const productResponse = await api.getProductById(numericId);
        if (productResponse.success && productResponse.data) {
          const product = productResponse.data;
          setProduct(product);
          
          setTitle(product.title);
          setDescription(product.description);
          setPrice(typeof product.price === 'number' ? product.price.toString() : product.price);
          
          // Manejar categoría (puede ser objeto o ID)
          if (typeof product.category === 'object' && product.category?.id) {
            setCategoryId(product.category.id);
          } else if (typeof product.category === 'number') {
            setCategoryId(product.category);
          }
          
          setCondition(product.condition);
          console.log("Producto cargado correctamente");
        } else {
          throw new Error(productResponse.error || 'Error al cargar el producto');
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
        setError(err.message);
        } else {
          setError('Error al cargar datos del producto');
        }
        if (err instanceof Error) {
          setError(err.message || 'Error al cargar datos del producto');
        } else {
          setError('Error al cargar datos del producto');
        }
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [isAuthenticated, productId]);

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (!title.trim()) errors.title = 'El título es requerido';
    if (!description.trim()) errors.description = 'La descripción es requerida';
    
    if (!price) {
      errors.price = 'El precio es requerido';
    } else if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      errors.price = 'Ingrese un precio válido';
    }
    
    if (!categoryId) errors.category = 'La categoría es requerida';
    if (!condition) errors.condition = 'La condición es requerida';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log("Formulario con errores:", formErrors);
      return;
    }
    
    if (!productId) {
      setError('ID de producto no válido');
      return;
    }
    
    setSubmitting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', categoryId.toString());
      formData.append('condition', condition);
      
      const response = await api.updateProduct(parseInt(productId), formData);
      
      if (response.success) {
        console.log("Producto actualizado correctamente");
        navigate(`/products/${productId}`);
      } else {
        throw new Error(response.error || 'Error al actualizar el producto');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.error("Error al actualizar:", err.message);
        setError(err.message || 'Error al actualizar el producto');
      } else {
        console.error("Error desconocido al actualizar:", err);
        setError('Error desconocido al actualizar el producto');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!productId || !product) {
      setError('No se puede cambiar el estado de un producto no cargado.');
      return;
    }

    setStatusChanging(true);
    setError(null);

    try {
      const response = await api.toggleProductAvailability(parseInt(productId));
      if (response.success && response.data && response.data.product) {
        setProduct(response.data.product); // Actualizar el estado del producto con la respuesta
        // Opcionalmente, mostrar un mensaje de éxito
      } else {
        throw new Error(response.error || 'Error al cambiar el estado del producto');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error desconocido al cambiar el estado del producto');
      }
    } finally {
      setStatusChanging(false);
    }
  };

  if (!isAuthenticated) {
    return null; // No renderizar nada mientras redirige
  }

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography mt={2}>Cargando datos del producto...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={5} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Editar Producto
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {/* Mostrar el estado actual del producto */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Estado actual del producto:
          </Typography>
          {product && (
            <Chip 
              label={
                product.status === 'pending' ? 'En revisión' : 
                product.status === 'available' ? 'Disponible' : 'No disponible'
              }
              color={
                product.status === 'pending' ? 'warning' : 
                product.status === 'available' ? 'success' : 'error'
              }
            />
          )}
        </Box>

        {/* Botón para cambiar disponibilidad */}
        {product && product.status !== 'pending' && (
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="outlined"
              color={product.status === 'available' ? 'error' : 'success'}
              onClick={handleToggleAvailability}
              disabled={statusChanging || submitting}
              startIcon={statusChanging ? <CircularProgress size={20} /> : null}
            >
              {product.status === 'available' ? 'Marcar como No Disponible' : 'Marcar como Disponible'}
            </Button>
          </Box>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={3}>
            <Grid container spacing={2}>
              <TextField
                fullWidth
                label="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={!!formErrors.title}
                helperText={formErrors.title}
                disabled={submitting}
                required
              />
            </Grid>
            
            <Grid container spacing={2}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Descripción"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={!!formErrors.description}
                helperText={formErrors.description}
                disabled={submitting}
                required
              />
            </Grid>
            
            <Grid container spacing={2}>
              <TextField
                fullWidth
                label="Precio"
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                error={!!formErrors.price}
                helperText={formErrors.price}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                disabled={submitting}
                required
              />
            </Grid>
            
            <Grid container spacing={2}>
              <FormControl fullWidth error={!!formErrors.category} disabled={submitting} required>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={categoryId}
                  label="Categoría"
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.category && (
                  <FormHelperText>{formErrors.category}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid container spacing={2}>
              <FormControl fullWidth error={!!formErrors.condition} disabled={submitting} required>
                <InputLabel>Condición</InputLabel>
                <Select
                  value={condition}
                  label="Condición"
                  onChange={(e) => setCondition(e.target.value)}
                >
                  <MenuItem value="new">Nuevo</MenuItem>
                  <MenuItem value="like_new">Como nuevo</MenuItem>
                  <MenuItem value="good">Buen estado</MenuItem>
                  <MenuItem value="fair">Estado aceptable</MenuItem>
                  <MenuItem value="poor">Mal estado</MenuItem>
                </Select>
                {formErrors.condition && (
                  <FormHelperText>{formErrors.condition}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid container spacing={2}>
              <Button
                variant="outlined" 
                onClick={() => navigate(-1)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : null}
              >
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default EditProductPage;
