import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Box, TextField, MenuItem, Button, 
  Paper, CircularProgress, Alert, FormControl,
  InputLabel, Select, FormHelperText, Chip, IconButton,
  Card, CardContent, Divider,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import api from '../services/api';
import { processImages } from '../utils/imageUtils';
import { formatPrice } from '../utils/formatPrice';
import BreadcrumbNav from '../components/BreadcrumbNav';
import PriceDisplay from '../components/PriceDisplay';
import CategoryIcon from '../components/CategoryIcon';

// Configuración de la URL base
const API_BASE_URL = 'http://localhost:8000';

interface Category {
  id: number;
  name: string;
}

const EditProductPage: React.FC = () => {
  const { id: productId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  
  // Log inicial del componente
  console.log('🎯 EditProductPage renderizado:', {
    productId,
    isAuthenticated,
    authLoading,
    hasUser: !!user,
    username: user?.username
  });
  
  // Estado del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState<number | string>('');
  const [condition, setCondition] = useState('');  const [product, setProduct] = useState<{
    id: number;
    title: string;
    description: string;
    price: number | string;
    original_price?: number | null;
    category: number | { id: number; name: string };
    condition: string;
    status: string;
    images?: Array<{ id: number; image: string; is_primary: boolean }>;  } | null>(null);
  
  // Estado de las imágenes
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<Array<{ id: number; image: string; is_primary: boolean }>>([]);
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([]); // IDs de imágenes a eliminar
  
  // Estado para la navegación de imágenes en vista previa
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  
  // Estados del componente
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [statusChanging, setStatusChanging] = useState(false);
  
  // Estado para el diálogo de error
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Opciones para los selectores de condición
  const conditions = [
    { value: 'new', label: 'Nuevo' },
    { value: 'like_new', label: 'Como nuevo' },
    { value: 'good', label: 'Buen estado' },
    { value: 'fair', label: 'Estado aceptable' },
    { value: 'poor', label: 'Mal estado' }
  ];

  // Comprobar autenticación
  useEffect(() => {
    if (!isAuthenticated) {
      console.log("Usuario no autenticado, redirigiendo a login");
      navigate('/login', { state: { from: `/product/edit/${productId}` } });
    }
  }, [isAuthenticated, navigate, productId]);

  // Obtener categorías desde el backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setFetchingCategories(true);
        const response = await api.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        } else {
          console.error('Error al obtener categorías:', response.error);
        }
      } catch (error: unknown) {
        console.error('Error al obtener categorías:', error);
      } finally {
        setFetchingCategories(false);
      }
    };

    fetchCategories();
  }, []);  // Cargar datos del producto
  useEffect(() => {
    console.log('🚀 useEffect loadData ejecutándose...');
    
    const loadData = async () => {
      console.log('🔍 LoadData useEffect ejecutado:', { 
        isAuthenticated, 
        productId, 
        authLoading,
        user: user?.username || 'sin usuario'
      });
      
      // Esperar a que la autenticación termine de cargar
      if (authLoading) {
        console.log('⏳ Esperando a que la autenticación termine de cargar...');
        return;
      }
      
      if (!isAuthenticated) {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        setLoading(false);
        return;
      }
      
      if (!productId) {
        console.log('❌ No hay productId');
        setLoading(false);
        return;
      }
      
      console.log('✅ Condiciones cumplidas, cargando producto...');
      setLoading(true);
      setError(null);
      
      try {
        // Cargar datos del producto
        console.log(`📦 Cargando producto ${productId}...`);
        const numericId = parseInt(productId);
        if (isNaN(numericId)) {
          throw new Error('ID de producto no válido');
        }
          const productResponse = await api.getProductById(numericId);
        console.log('Respuesta completa de getProductById:', productResponse);
        
        if (productResponse.success && productResponse.data) {
          const product = productResponse.data;
          console.log('Datos del producto recibidos:', product);
          setProduct(product);          // Establecer los valores del formulario
          console.log('📝 Estableciendo valores del formulario...');
          const titleValue = product.title || '';
          const descriptionValue = product.description || '';
          const priceValue = typeof product.price === 'number' ? product.price.toString() : (product.price?.toString() || '');
          
          console.log('🔧 Valores a establecer:', { titleValue, descriptionValue, priceValue });
          setTitle(titleValue);
          setDescription(descriptionValue);
          setPrice(priceValue);
          
          // Manejar categoría (puede ser objeto o ID)
          if (typeof product.category === 'object' && product.category?.id) {
            console.log('Categoría es objeto:', product.category);
            setCategoryId(product.category.id);
          } else if (typeof product.category === 'number') {
            console.log('Categoría es número:', product.category);
            setCategoryId(product.category);
          } else {
            console.log('Categoría no reconocida:', product.category);
            setCategoryId('');          }
          
          setCondition(product.condition || '');
          
          // Resetear las imágenes nuevas al cargar datos del producto
          setImages([]);
          
          // Cargar imágenes existentes
          console.log('Imágenes del producto:', product.images);
          if (product.images && product.images.length > 0) {
            console.log('Configurando imágenes existentes:', product.images);
            setExistingImages(product.images);
            setRemovedImageIds([]); // Resetear imágenes marcadas para eliminación
            // Crear previews de las imágenes existentes con URLs completas
            const previews = product.images.map((img: { id: number; image: string; is_primary: boolean }) => {
              const imageUrl = img.image.startsWith('http') ? img.image : `${API_BASE_URL}${img.image}`;
              console.log(`Imagen ${img.id}: ${img.image} -> ${imageUrl}`);
              return imageUrl;
            });
            console.log('Previews de imágenes generados:', previews);
            setImagePreviews(previews);
          } else {
            console.log('No hay imágenes o array vacío');
            setExistingImages([]);
            setRemovedImageIds([]);
            setImagePreviews([]);
          }
          
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
      } finally {
        setLoading(false);
      }
    };    
    loadData();
  }, [isAuthenticated, productId, authLoading, user]);  // Manejar la carga de imágenes
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
      
      if (validFiles.length > 0) {
        const totalImages = images.length + existingImages.length + validFiles.length;
        if (totalImages > 10) {
          setError(`No puedes tener más de 10 imágenes en total. Actualmente tienes ${existingImages.length + images.length} imágenes.`);
          return;
        }
        
        // Agregar las nuevas imágenes a las existentes
        setImages(prev => [...prev, ...validFiles]);
      }
    }
  };
  // Generar vistas previas de imágenes cuando cambia el array de imágenes
  useEffect(() => {
    const newPreviews = images.map(file => URL.createObjectURL(file));
    const existingPreviews = existingImages.map((img) => {
      // Si la imagen ya tiene una URL completa, la usamos tal como está
      // Si no, le agregamos el prefijo del API_BASE_URL
      return img.image.startsWith('http') ? img.image : `${API_BASE_URL}${img.image}`;
    });
    setImagePreviews([...existingPreviews, ...newPreviews]);
    
    // Limpiar URLs al desmontar
    return () => {
      newPreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images, existingImages]);
  
  // Eliminar una imagen nueva
  const removeNewImage = (index: number) => {
    const newImageIndex = index - existingImages.length;
    if (newImageIndex >= 0) {
      setImages(prev => prev.filter((_, i) => i !== newImageIndex));
    }
  };
  // Eliminar una imagen existente (marcarla para eliminación)
  const removeExistingImage = (index: number) => {
    if (index < existingImages.length) {
      const imageToRemove = existingImages[index];
      setRemovedImageIds(prev => [...prev, imageToRemove.id]);
      setExistingImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Eliminar imagen (detecta si es nueva o existente)
  const removeImage = (index: number) => {
    if (index < existingImages.length) {
      removeExistingImage(index);
    } else {
      removeNewImage(index);
    }
  };
  // Nuevo manejador de cambio de precio - más flexible para permitir edición
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Permitir solo números, punto y coma como separadores decimales
    // Permitir cadena vacía para poder borrar y escribir de nuevo
    if (value === '' || /^\d+([,.]\d*)?$/.test(value)) {
      setPrice(value);
    }
  };

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
    
    const totalImages = images.length + existingImages.length;
    if (totalImages === 0) errors.images = 'Por favor añade al menos una imagen';
    
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
    setErrorDialogOpen(false);    try {
      console.log("Procesando datos del producto...");
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', categoryId.toString());
      formData.append('condition', condition);
      
      // Agregar IDs de imágenes a eliminar
      removedImageIds.forEach(id => {
        formData.append('remove_images[]', id.toString());
      });
        // Procesar y agregar nuevas imágenes
      if (images.length > 0) {
        console.log(`Procesando ${images.length} nuevas imágenes...`);
        const processedImages = await processImages(images);
        
        processedImages.forEach((image, index) => {
          const fieldName = `new_images[${index}]`;
          formData.append(fieldName, image);
          console.log(`✅ Agregada imagen: ${fieldName} - ${image.name} (${image.size} bytes)`);
        });
        
        console.log(`${processedImages.length} nuevas imágenes agregadas al FormData`);
      }

      // Log del contenido completo del FormData para debugging
      console.log("🔍 Contenido completo del FormData:");
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: archivo - ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      console.log("Enviando datos del producto actualizado");
      
      const response = await api.updateProduct(parseInt(productId), formData);
      
      if (response.success) {
        console.log("Producto actualizado correctamente");
        navigate(`/products/${productId}`);
      } else {
        let errorMessage = 'Error al actualizar el producto';
        if (response.error) {
          errorMessage = typeof response.error === 'string'
            ? response.error
            : JSON.stringify(response.error);
        }
        
        // Verificar si el error está relacionado con contenido inapropiado
        if (errorMessage.includes("No podemos actualizar tu producto") || 
            errorMessage.includes("contenido inapropiado") ||
            errorMessage.includes("inapropiado")) {
          setErrorMessage(errorMessage);
          setErrorDialogOpen(true);
        } else {
          setError(errorMessage);
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error al actualizar:', error);
        setError(error.message || 'Error al actualizar el producto');
      } else {
        console.error('Error desconocido al actualizar:', error);
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
        setProduct(response.data.product);
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

  // Encontrar etiqueta de categoría para la vista previa
  const getCategoryLabel = () => {
    const found = categories.find(cat => cat.id.toString() === categoryId.toString());
    return found ? found.name : '';
  };
    // Encontrar etiqueta de condición para la vista previa
  const getConditionLabel = () => {
    const found = conditions.find(cond => cond.value === condition);
    return found ? found.label : '';
  };
  // Funciones para navegación de imágenes en vista previa
  const handlePreviousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPreviewIndex(prev => 
      prev === 0 ? imagePreviews.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPreviewIndex(prev => 
      prev === imagePreviews.length - 1 ? 0 : prev + 1
    );
  };

  // Resetear índice cuando cambian las imágenes
  useEffect(() => {
    if (currentPreviewIndex >= imagePreviews.length) {
      setCurrentPreviewIndex(0);
    }
  }, [imagePreviews.length, currentPreviewIndex]);
  if (!isAuthenticated && !authLoading) {
    return null;
  }

  if (loading || authLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography mt={2}>Cargando datos del producto...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ 
      py: { xs: 0, sm: 1 },
      px: { xs: 0, sm: 1, md: 3 },
      mt: { xs: 0, sm: 1 },
    }}>
      <BreadcrumbNav 
        items={[
          { name: 'Editar producto', href: `/product/edit/${productId}`, current: true }
        ]} 
      />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Editar artículo
        </Typography>
      </Box>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
        {/* Formulario de producto */}
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
          <Paper elevation={5} sx={{ p: 3, mb: 2 }}>
            <form onSubmit={handleSubmit}>
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
              
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                Información del producto
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Actualiza la información y las imágenes de tu producto.
              </Typography>
              
              {/* Subida de imágenes */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Fotos: {imagePreviews.length}/10 - Puedes tener un máximo de 10 fotos
                </Typography>                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1 }}>
                  {/* Botón para agregar fotos */}
                  <Box 
                    component="label"
                    sx={{
                      width: '100%',
                      height: 150,
                      border: '2px dashed #ccc',
                      borderRadius: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(25, 118, 210, 0.04)'
                      }
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />
                    <AddPhotoAlternateIcon fontSize="large" color="primary" />
                    <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                      Agregar fotos
                    </Typography>
                    <Typography variant="caption" align="center">
                      o arrastra y suelta
                    </Typography>
                  </Box>
                    {/* Vistas previas de imágenes */}
                  {imagePreviews.map((preview, index) => (
                    <Box key={index}>
                      <Box
                        sx={{
                          position: 'relative',
                          width: '100%',
                          height: 150,
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <img 
                          src={preview} 
                          alt={`Preview ${index}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <IconButton
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: 5,
                            right: 5,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'rgba(0,0,0,0.7)'
                            }
                          }}
                          onClick={() => removeImage(index)}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                        {index === 0 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              bottom: 0,
                              left: 0,
                              right: 0,
                              bgcolor: 'rgba(0,0,0,0.5)',
                              color: 'white',
                              padding: '2px 8px',
                              fontSize: '12px',
                              textAlign: 'center'
                            }}
                          >
                            Principal
                          </Box>
                        )}
                      </Box>
                    </Box>                  ))}
                </Box>
                
                {formErrors.images && (
                  <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                    {formErrors.images}
                  </Typography>
                )}
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              {/* Campos del formulario */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  label="Título"
                  fullWidth
                  variant="outlined"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  error={!!formErrors.title}
                  helperText={formErrors.title}
                  required
                  sx={{ mb: 3 }}
                />
                  <Box>
                  <TextField
                    label="Precio"
                    fullWidth
                    variant="outlined"
                    InputProps={{ startAdornment: '$' }}
                    value={price}
                    onChange={handlePriceChange}
                    error={!!formErrors.price}
                    helperText={formErrors.price}
                    inputProps={{ pattern: "[0-9.,]*" }}
                    required
                    sx={{ mb: 3 }}
                  />                  {product?.original_price && Math.abs(product.original_price - Number(price)) > 0.01 && (
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        mt: -2.5, 
                        mb: 2,
                        color: 'text.secondary',
                        fontSize: '0.875rem'
                      }}
                    >
                      Precio original: <span style={{ textDecoration: 'line-through' }}>{formatPrice(product.original_price)}</span>
                    </Typography>
                  )}
                </Box>
                
                <FormControl 
                  fullWidth 
                  error={!!formErrors.category}
                  disabled={fetchingCategories}
                  required
                  sx={{ mb: 3 }}
                >
                  <InputLabel>Categoría</InputLabel>
                  <Select
                    value={categoryId}
                    label="Categoría"
                    onChange={(e) => setCategoryId(e.target.value)}
                  >
                    {fetchingCategories ? (
                      <MenuItem disabled>Cargando...</MenuItem>
                    ) : (
                      categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CategoryIcon name={cat.name} fontSize="small" sx={{ mr: 1 }} />
                            {cat.name}
                          </Box>
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {formErrors.category && (
                    <FormHelperText>{formErrors.category}</FormHelperText>
                  )}
                </FormControl>
                
                <FormControl 
                  fullWidth 
                  error={!!formErrors.condition}
                  required
                  sx={{ mb: 3 }}
                >
                  <InputLabel>Condición</InputLabel>
                  <Select
                    value={condition}
                    label="Estado"
                    onChange={(e) => setCondition(e.target.value)}
                    sx={{ '& .MuiSelect-select': { textAlign: 'left' } }}
                  >
                    {conditions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {formErrors.condition && (
                    <FormHelperText>{formErrors.condition}</FormHelperText>
                  )}
                </FormControl>
                
                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  error={!!formErrors.description}
                  helperText={formErrors.description}
                  required
                  placeholder="Describe tu artículo con el mayor detalle posible"
                />
              </Box>
              
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
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
                  disabled={submitting || fetchingCategories}
                  sx={{ minWidth: 120 }}
                >
                  {submitting ? <CircularProgress size={24} /> : 'Guardar Cambios'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Box>
        
        {/* Vista previa del producto */}
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 5' } }}>
          <Paper elevation={5} sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Vista previa
            </Typography>
              <Card elevation={5} sx={{ border: '1px solid #e0e0e0' }}>
              {imagePreviews.length > 0 ? (
                <Box 
                  sx={{ 
                    height: 300, 
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    bgcolor: '#f5f5f5'
                  }}
                >
                  <img
                    src={imagePreviews[currentPreviewIndex]}
                    alt="Vista previa principal"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
                  
                  {/* Flechas de navegación solo si hay más de una imagen */}
                  {imagePreviews.length > 1 && (
                    <>                      <IconButton
                        onMouseDown={handlePreviousImage}
                        sx={{
                          position: 'absolute',
                          left: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          },
                          '&:active': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            transform: 'translateY(-50%)', // Mantener posición al hacer clic
                          },
                          zIndex: 1,
                          userSelect: 'none',
                          outline: 'none',
                          border: 'none'
                        }}
                        size="small"
                        disableRipple
                      >
                        <ChevronLeftIcon />
                      </IconButton>
                      
                      <IconButton
                        onMouseDown={handleNextImage}
                        sx={{
                          position: 'absolute',
                          right: 8,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          bgcolor: 'rgba(255, 255, 255, 0.8)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                          },
                          '&:active': {
                            bgcolor: 'rgba(255, 255, 255, 0.9)',
                            transform: 'translateY(-50%)', // Mantener posición al hacer clic
                          },
                          zIndex: 1,
                          userSelect: 'none',
                          outline: 'none',
                          border: 'none'
                        }}
                        size="small"
                        disableRipple
                      >
                        <ChevronRightIcon />
                      </IconButton>
                      
                      {/* Indicador de imagen actual */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          bgcolor: 'rgba(0, 0, 0, 0.6)',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem'
                        }}
                      >
                        {currentPreviewIndex + 1} / {imagePreviews.length}
                      </Box>
                    </>
                  )}
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    height: 300, 
                    bgcolor: '#f5f5f5', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'text.secondary'
                  }}
                >
                  <Typography>Vista previa de tu publicación</Typography>
                </Box>
              )}
                <CardContent>
                <Typography variant="h6" gutterBottom>
                  {title || 'Título'}
                </Typography>                <PriceDisplay
                  currentPrice={price === '' ? 'Precio' : price}
                  originalPrice={product?.original_price}
                  variant="h5"
                  color="primary.main"
                  showOriginalLabel={true}
                  orientation="vertical"
                />
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Actualizado{' '}
                  <Box component="span" sx={{ fontWeight: 'medium' }}>
                    hace unos segundos
                  </Box>
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Detalles
                </Typography>
                
                <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                  {description || 'La descripción aparecerá aquí.'}
                </Typography>                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {categoryId && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Categoría:
                      </Typography>
                      <Typography variant="body2">
                        {getCategoryLabel()}
                      </Typography>
                    </Box>
                  )}
                  
                  {condition && (
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Estado:
                      </Typography>
                      <Typography variant="body2">
                        {getConditionLabel()}
                      </Typography>
                    </Box>
                  )}
                </Box>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'grey.300',
                      mr: 2
                    }}
                  />                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      {user?.username || 'Usuario'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Vendedor
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Box>
      </Box>

      {/* Diálogo de error */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
      >
        <DialogTitle id="error-dialog-title">Error</DialogTitle>
        <DialogContent>
          <DialogContentText id="error-dialog-description">
            {errorMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} autoFocus>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EditProductPage;
