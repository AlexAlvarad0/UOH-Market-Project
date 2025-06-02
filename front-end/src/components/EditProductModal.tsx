import React, { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, MenuItem, FormControl, InputLabel, 
  Select, CircularProgress, Alert, Typography, Box, Chip,
  Switch, FormControlLabel // <--- Añadir Switch y FormControlLabel
} from '@mui/material';
import api from '../services/api';

interface Category {
  id: number;
  name: string;
}

interface ProductToEdit {
  id: number;
  title: string;
  description: string;
  price: number | string;
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
  const [productStatus, setProductStatus] = useState(''); // Estado para la disponibilidad
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false); // Estado para el cambio de disponibilidad
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
        }
      } catch (err) {
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
      setProductStatus(product.status || ''); // Inicializar estado del producto
      
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
      
      const response = await api.updateProduct(product.id, formData);
      
      if (response.success) {
        onSuccess(); // Notificar al padre que hubo una actualización exitosa
        onClose(); // Cerrar el modal
      } else {
        setError(response.error || 'Error al actualizar el producto');
      }
    } catch (err: any) {
      console.error('Error actualizando producto:', err);
      setError(err.message || 'Error al actualizar el producto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!product) return;

    setStatusChanging(true);
    setError(null);
    try {
      const response = await api.toggleProductAvailability(product.id);
      if (response.success && response.data && response.data.product) {
        setProductStatus(response.data.product.status); // Actualizar el estado local
        onSuccess(); // Notificar al padre para que pueda refrescar
      } else {
        setError(response.error || 'Error al cambiar la disponibilidad');
      }
    } catch (err: any) {
      console.error('Error cambiando disponibilidad:', err);
      setError(err.message || 'Error al cambiar la disponibilidad');
    } finally {
      setStatusChanging(false);
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
              onChange={(e) => setPrice(e.target.value)}
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              required
            />
            
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Categoría</InputLabel>
              <Select
                value={categoryId}
                label="Categoría"
                onChange={(e) => setCategoryId(e.target.value as number)}
              >
                {categories.map((category) => (
                  <MenuItem key={category.id} value={category.id}>
                    {category.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Condición</InputLabel>
              <Select
                value={condition}
                label="Condición"
                onChange={(e) => setCondition(e.target.value)}
              >
                {conditions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Sección para cambiar disponibilidad */}
            {product && product.status !== 'pending' && (
              <Box sx={{ my: 2, p: 2, border: '1px dashed grey', borderRadius: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={productStatus === 'available'}
                      onChange={handleToggleAvailability}
                      disabled={statusChanging || submitting}
                      color={productStatus === 'available' ? 'success' : 'error'}
                    />
                  }
                  label={productStatus === 'available' ? 'Producto Disponible' : 'Producto No Disponible'}
                  disabled={statusChanging || submitting}
                />
                {statusChanging && <CircularProgress size={20} sx={{ ml: 1 }} />}
              </Box>
            )}
            
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
              Nota: Para cambiar las imágenes del producto, utiliza la función de editar completa.
            </Typography>
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
