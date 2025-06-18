import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, MenuItem, FormControl, InputLabel, 
  Select, CircularProgress, Alert, Typography // Removido Switch y FormControlLabel
} from '@mui/material';
import api from '../services/api';
import { formatPrice } from '../utils/formatPrice';
import Box from '@mui/material/Box';
import CategoryIcon from './CategoryIcon';
import CustomSwitch from './CustomSwitch'; // Importar el switch personalizado

interface Category {
  id: number;
  name: string;
}

interface ProductToEdit {
  id: number;
  title: string;
  description: string;
  price: number | string;
  original_price?: number | null;
  category: number | { id: number; name: string };
  condition: string;
  status: string; // Añadir status
}

interface EditProductModalProps {
  open: boolean;
  onClose: () => void;
  product: ProductToEdit | null;
  onSuccess: () => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ open, onClose, product, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [condition, setCondition] = useState('');
  const [productStatus, setProductStatus] = useState(''); // Estado local para la edición
  const [originalStatus, setOriginalStatus] = useState(''); // Estado original del producto
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Cargar categorías al abrir el modal
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const response = await api.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        } else {
          setError('No se pudieron cargar las categorías');
        }    } catch {
      setError('Error al cargar las categorías');
    } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchCategories();
    }
  }, [open]);
  // Actualizar form con datos del producto cuando cambie
  useEffect(() => {
    if (product) {
      setTitle(product.title || '');
      setDescription(product.description || '');
      setPrice(typeof product.price === 'number' ? product.price.toString() : product.price?.toString() || '');
      setProductStatus(product.status || ''); // Inicializar estado local del producto
      setOriginalStatus(product.status || ''); // Guardar estado original
      
      if (typeof product.category === 'object' && product.category?.id) {
        setCategoryId(product.category.id);
      } else if (typeof product.category === 'number') {
        setCategoryId(product.category);
      } else {
        setCategoryId('');
      }
      
      setCondition(product.condition || '');
    }
  }, [product]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    
    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', categoryId.toString());
      formData.append('condition', condition);
      
      // Actualizar producto básico primero
      const updateResponse = await api.updateProduct(product.id, formData);
      
      if (!updateResponse.success) {
        setError(updateResponse.error || 'Error al actualizar el producto');
        return;
      }

      // Si el estado cambió, actualizarlo por separado
      if (productStatus !== originalStatus && product.status !== 'pending') {
        const statusResponse = await api.toggleProductAvailability(product.id);
        if (!statusResponse.success) {
          setError(statusResponse.error || 'Error al cambiar la disponibilidad');
          return;
        }
      }
      
      onSuccess(); // Notificar al padre que hubo una actualización exitosa
      onClose(); // Cerrar el modal
    } catch (err: unknown) {
      console.error('Error actualizando producto:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar el producto');
    } finally {
      setSubmitting(false);
    }
  };  // Función para cambiar el estado local (sin actualizar el servidor)
  const handleToggleAvailability = () => {
    if (productStatus === 'available') {
      setProductStatus('unavailable');
    } else {
      setProductStatus('available');
    }
  };

  const conditions = [
    { value: 'new', label: 'Nuevo' },
    { value: 'like_new', label: 'Como nuevo' },
    { value: 'good', label: 'Buen estado' },
    { value: 'fair', label: 'Estado aceptable' },
    { value: 'poor', label: 'Mal estado' }
  ];

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Editar Producto</DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              margin="dense"
              label="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            
            <TextField
              fullWidth
              margin="dense"
              label="Descripción"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
              required
            />
              <TextField
                fullWidth
                margin="dense"
                label="Precio"
                type="number"
                value={price}
                rows={3}
                onChange={(e) => setPrice(e.target.value)}
                InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                required
              />              {product?.original_price && Math.abs(product.original_price - Number(price)) > 0.01 && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    mt: 0.5, 
                    color: 'text.secondary',
                    fontSize: '0.75rem'
                  }}
                >
                  Precio original: <span style={{ textDecoration: 'line-through' }}>{formatPrice(product.original_price)}</span>
                </Typography>
              )}
            
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={categoryId}
                label="Categoría"
                onChange={(e) => setCategoryId(e.target.value as number)}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <CategoryIcon name={typeof category.name === 'string' ? category.name : ''} fontSize="small" sx={{ mr: 1 }} />
                      {typeof category.name === 'string' ? category.name : ''}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Condición</InputLabel>
              <Select
                value={condition}
                label="Condición"
                sx={{ mb: 3, '& .MuiSelect-select': { textAlign: 'left' } }}
                onChange={(e) => setCondition(e.target.value)}
              >
                {conditions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>            {/* Sección para cambiar disponibilidad */}
            {product && product.status !== 'pending' && (
              <Box sx={{ 
                my: 2, 
                p: 2, 
                border: '1px dashed grey', 
                borderRadius: 1, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                gap: 2 
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {productStatus === 'available' ? 'Producto Disponible' : 'Producto No Disponible'}
                  </Typography>
                  <CustomSwitch
                    checked={productStatus === 'available'}
                    onChange={handleToggleAvailability}
                    disabled={submitting}
                  />
                </Box>
                {productStatus !== originalStatus && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'warning.main',
                      fontStyle: 'italic',
                      textAlign: 'center'
                    }}
                  >
                    (Cambio pendiente)
                  </Typography>
                )}
              </Box>
            )}
              <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  onClose();
                  window.location.href = `/product/edit/${product?.id}`;
                }}
                sx={{ 
                  fontSize: '0.75rem',
                  py: 0.5,
                  px: 1.5
                }}
              >
                Edición completa (con imágenes)
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          disabled={submitting || loading}
          startIcon={submitting && <CircularProgress size={20} />}
        >
          {submitting ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProductModal;
