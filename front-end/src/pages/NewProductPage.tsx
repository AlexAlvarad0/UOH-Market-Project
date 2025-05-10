import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Paper, Box, Alert, Grid, 
  Card, CardContent, Divider, TextField, MenuItem, 
  IconButton, Button, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import api from '../services/api';
import { processImages } from '../utils/imageUtils';
import { useAuth } from '../hooks/useAuth';
import BreadcrumbNav from '../components/BreadcrumbNav';

const NewProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  
  // Estado para el diálogo de error
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estado del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [status, setStatus] = useState('pending'); // Añadir un estado inicial para el producto
  
  // Estado para almacenar categorías y condiciones desde el backend
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  
  // Opciones para los selectores de condición
  const conditions = [
    { value: 'new', label: 'Nuevo' },
    { value: 'like_new', label: 'Como nuevo' },
    { value: 'good', label: 'Buen estado' },
    { value: 'fair', label: 'Estado aceptable' },
    { value: 'poor', label: 'Mal estado' }
  ];

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
      } catch (error) {
        console.error('Error al obtener categorías:', error);
      } finally {
        setFetchingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  // Manejar la carga de imágenes
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
      
      if (validFiles.length > 0) {
        setImages(prev => [...prev, ...validFiles].slice(0, 10)); // Máximo 10 imágenes
      }
    }
  };
  
  // Generar vistas previas de imágenes cuando cambia el array de imágenes
  useEffect(() => {
    const previews = images.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
    
    // Limpiar URLs al desmontar
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [images]);
  
  // Eliminar una imagen
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Crear producto
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setErrorDialogOpen(false);

    try {
      // Validaciones básicas
      if (!title || !description || !price || !category || !condition) {
        throw new Error('Por favor completa todos los campos obligatorios');
      }
      
      if (images.length === 0) {
        throw new Error('Por favor añade al menos una imagen');
      }

      console.log("Procesando imágenes del producto...");
      
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('condition', condition);
      
      // Procesar las imágenes para hacerlas cuadradas
      const processedImages = await processImages(images);
      
      // Agregar las imágenes procesadas con el formato correcto
      processedImages.forEach((image, index) => {
        formData.append(`images[${index}]`, image);
      });
      
      // Establecer la imagen primaria (primera imagen)
      formData.append('primary_image_index', '0');

      console.log("Enviando datos del producto con imágenes procesadas");
      
      const response = await api.createProduct(formData);

      if (response.success && response.data) {
        navigate(`/products/${response.data.id}`);
      } else {
        let errorMessage = 'Error al crear el producto';
        if (response.error) {
          errorMessage = typeof response.error === 'string'
            ? response.error
            : JSON.stringify(response.error);
        }
        
        // Verificar si el error está relacionado con contenido inapropiado
        if (errorMessage.includes("No podemos publicar tu producto") || 
            errorMessage.includes("contenido inapropiado") ||
            errorMessage.includes("inapropiado")) {
          setErrorMessage(errorMessage);
          setErrorDialogOpen(true);
        } else {
          // Para otros errores, mostrar en el formulario
          setError(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      setError(error.message || 'Error al crear el producto');
    } finally {
      setLoading(false);
    }
  };

  // Obtener la fecha actual
  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Encontrar etiqueta de categoría para la vista previa
  const getCategoryLabel = () => {
    const found = categories.find(cat => cat.id === category);
    return found ? found.name : '';
  };
  
  // Encontrar etiqueta de condición para la vista previa
  const getConditionLabel = () => {
    const found = conditions.find(cond => cond.value === condition);
    return found ? found.label : '';
  };

  return (
    <Container maxWidth="xl" sx={{ mt: { xs: 2, sm: 3 }, mb: 4, py: { xs: 2, sm: 3 }, px: { xs: 1, sm: 2, md: 3 } }}>
      <BreadcrumbNav 
        items={[
          { name: 'Vender producto', href: '/product/new', current: true }
        ]} 
      />
      
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" component="h1">
          Artículo en venta
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {/* Formulario de producto */}
        <Grid item xs={12} md={7}>
          <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
            <form onSubmit={handleCreateProduct}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                Obligatorio
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Proporciona una descripción que sea lo más detallada posible.
              </Typography>
              
              {/* Subida de imágenes */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Fotos: {images.length}/10 - Puedes agregar un máximo de 10 fotos
                </Typography>
                
                <Grid container spacing={1}>
                  {/* Botón para agregar fotos */}
                  <Grid item xs={6} sm={4} md={3}>
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
                  </Grid>
                  
                  {/* Vistas previas de imágenes */}
                  {imagePreviews.map((preview, index) => (
                    <Grid item xs={6} sm={4} md={3} key={`${preview}-${index}`}>
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
                    </Grid>
                  ))}
                </Grid>
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
                  required
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  label="Precio"
                  fullWidth
                  variant="outlined"
                  type="number"
                  InputProps={{ startAdornment: '$' }}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                />
                
                <TextField
                  select
                  label="Categoría"
                  fullWidth
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  variant="outlined"
                  required
                  disabled={fetchingCategories}
                  sx={{ mb: 3 }}
                >
                  {fetchingCategories ? (
                    <MenuItem value="">Cargando categorías...</MenuItem>
                  ) : (
                    categories.map((cat) => (
                      <MenuItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </MenuItem>
                    ))
                  )}
                </TextField>
                
                <TextField
                  select
                  label="Estado"
                  fullWidth
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  variant="outlined"
                  required
                  sx={{ mb: 3 }}
                >
                  {conditions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                
                <TextField
                  label="Descripción"
                  fullWidth
                  multiline
                  rows={6}
                  variant="outlined"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe tu artículo con el mayor detalle posible"
                />
              </Box>
              
              <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate(-1)}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={loading || fetchingCategories}
                  sx={{ minWidth: 120 }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Publicar'}
                </Button>
              </Box>
            </form>
          </Paper>
        </Grid>
        
        {/* Vista previa del producto */}
        <Grid item xs={12} md={5}>
          <Paper elevation={1} sx={{ p: 3, position: 'sticky', top: 20 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              Vista previa
            </Typography>
            
            <Card elevation={0} sx={{ border: '1px solid #e0e0e0' }}>
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
                    src={imagePreviews[0]}
                    alt="Vista previa principal"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      objectFit: 'contain'
                    }}
                  />
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
                </Typography>
                
                <Typography variant="h5" color="primary.main" gutterBottom>
                  {price ? `$${price}` : 'Precio'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Publicado{' '}
                  <Box component="span" sx={{ fontWeight: 'medium' }}>
                    hace unos segundos
                  </Box>{' '}
                  en{' '}
                  <Box component="span" sx={{ fontWeight: 'medium' }}>
                    {user?.city || 'Tu ubicación'}
                  </Box>
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  Detalles
                </Typography>
                
                <Typography variant="body2" paragraph sx={{ mb: 2 }}>
                  {description || 'La descripción aparecerá aquí.'}
                </Typography>
                
                <Grid container spacing={2}>
                  {category && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Categoría:
                      </Typography>
                      <Typography variant="body2">
                        {getCategoryLabel()}
                      </Typography>
                    </Grid>
                  )}
                  
                  {condition && (
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Estado:
                      </Typography>
                      <Typography variant="body2">
                        {getConditionLabel()}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
                
                <Divider sx={{ my: 2 }} />
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Estado inicial del producto:
                  </Typography>
                  <Chip label="En revisión" color="warning" />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      bgcolor: 'grey.300',
                      mr: 2
                    }}
                  />
                  <Box>
                    <Typography variant="subtitle2">
                      {user?.username || 'Tu nombre'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Vendedor
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Paper>
        </Grid>
      </Grid>

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

export default NewProductPage;
