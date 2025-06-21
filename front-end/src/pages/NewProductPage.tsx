import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Paper, Box, Alert, Grid, 
  Card, CardContent, Divider, TextField, MenuItem, 
  IconButton, Button, CircularProgress, Chip,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  GlobalStyles
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import api from '../services/api';
import { processImages } from '../utils/imageUtils';
import { useAuth } from '../hooks/useAuth.hooks';
import BreadcrumbNav from '../components/BreadcrumbNav';
import { formatPrice } from '../utils/formatPrice';
import CategoryIcon from '../components/CategoryIcon';
import Squares from '../../y/Squares/Squares';

const NewProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingCategories, setFetchingCategories] = useState(true);
  
  // Estado para el diálogo de error
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Verificación temprana: redireccionar si no está autenticado o no es vendedor verificado
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/product/new' } });
      return;
    }
    
    if (!user?.is_verified_seller) {
      setErrorMessage('Solo los usuarios con email institucional UOH (@pregrado.uoh.cl o @uoh.cl) pueden vender productos.');
      setErrorDialogOpen(true);
      return;
    }
  }, [isAuthenticated, user, navigate]);
  
  // Estado del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');  const [condition, setCondition] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  
  // Estado para la navegación de imágenes en vista previa
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  
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
      } catch (error: unknown) {
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

  // Nuevo manejador de cambio de precio: permitir solo dígitos con máximo un separador ',' o '.' y al menos un dígito antes
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Vacío o formato: dígitos+opcional(separador+dígitos)
    if (value === '' || /^\d+(?:[,]\d*)?$/.test(value)) {
      setPrice(value);
    }
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
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error creating product:', error);
        setError(error.message || 'Error al crear el producto');
      } else {
        console.error('Error creating product:', error);
        setError('Error al crear el producto');
      }
    } finally {
      setLoading(false);
    }
  };

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
          speed={0.5}
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
      
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
        {/* Formulario de producto */}
        <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 7' } }}>
          <Paper elevation={5} sx={{ p: 3, mb: 2 }}>
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
                  <Grid >
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
                    <Grid >
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
                  InputProps={{ startAdornment: '$' }}
                  value={price}
                  onChange={handlePriceChange}
                  inputProps={{ pattern: "[0-9.,]*" }}
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
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon name={cat.name} fontSize="small" sx={{ mr: 1 }} />
                          {cat.name}
                        </Box>
                      </MenuItem>
                    ))
                  )}
                </TextField>
                
                <TextField
                  select
                  label="Condición"
                  fullWidth
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  variant="outlined"
                  required
                  sx={{ mb: 3, '& .MuiSelect-select': { textAlign: 'left' } }}
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
                </Typography>
                
                <Typography variant="h5" color="primary.main" gutterBottom>
                  {price === ''
                    ? 'Precio'
                    : formatPrice(price)}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Publicado{' '}
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
                </Typography>
                
                <Grid container spacing={2}>
                  {category && (
                    <Grid container spacing={2}>
                      <Typography variant="body2" color="text.secondary">
                        Categoría:
                      </Typography>
                      <Typography variant="body2">
                        {getCategoryLabel()}
                      </Typography>
                    </Grid>
                  )}
                  
                  {condition && (
                    <Grid container spacing={2}>
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
        </Box>
      </Box>      {/* Diálogo de error */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => {
          setErrorDialogOpen(false);
          // Si el error es de verificación de vendedor, redirigir al inicio
          if (errorMessage.includes('Solo los usuarios con email institucional UOH')) {
            navigate('/');
          }
        }}
        aria-labelledby="error-dialog-title"
        aria-describedby="error-dialog-description"
      >
        <DialogTitle id="error-dialog-title">
          {errorMessage.includes('Solo los usuarios con email institucional UOH') 
            ? 'Acceso restringido' 
            : 'Error'
          }
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="error-dialog-description">
            {errorMessage}
          </DialogContentText>
          {errorMessage.includes('Solo los usuarios con email institucional UOH') && (
            <DialogContentText sx={{ mt: 2, color: 'text.secondary' }}>
              Para poder vender productos necesitas tener un email institucional de la Universidad de O'Higgins. 
              Contacta con el administrador si tienes un email institucional válido.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setErrorDialogOpen(false);
              if (errorMessage.includes('Solo los usuarios con email institucional UOH')) {
                navigate('/');
              }
            }} 
            autoFocus
            variant={errorMessage.includes('Solo los usuarios con email institucional UOH') ? 'contained' : 'text'}
          >
            {errorMessage.includes('Solo los usuarios con email institucional UOH') 
              ? 'Volver al inicio' 
              : 'Cerrar'
            }
          </Button>
        </DialogActions>      </Dialog>
    </Container>
    </>
  );
};

export default NewProductPage;
