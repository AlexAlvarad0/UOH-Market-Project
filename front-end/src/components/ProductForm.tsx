import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Button, TextField, MenuItem, FormControl, 
  InputLabel, Select, Grid, Typography, CircularProgress,
  IconButton
} from '@mui/material';
import { Category } from '../types/categories';
import { Product } from '../types.products';
import api from '../services/api';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { createSquareImage } from '../utils/imageUtils';

interface ProductFormProps {
  product?: Product;
  onSubmit: (formData: FormData) => Promise<void>;
  isLoading?: boolean; // Nueva prop opcional
}

const ProductForm: React.FC<ProductFormProps> = ({ product, onSubmit, isLoading = false }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageProcessingLoading, setImageProcessingLoading] = useState(false);
  
  const [formValues, setFormValues] = useState({
    title: product?.title || '',
    description: product?.description || '',
    price: product?.price || '',
    category: product?.category || '',
    condition: product?.condition || '',
  });
  
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.getCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();
    
    // If we have a product and it has images, set the previews
    if (product?.images && product.images.length > 0) {
      const imageUrls = product.images.map(img => img.image);
      setImagePreviews(imageUrls);
    }
  }, [product]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormValues({
        ...formValues,
        [name]: value
      });
    }
  };
  
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        setImageProcessingLoading(true);
        const file = e.target.files[0];
        
        // Procesar la imagen para hacerla cuadrada automáticamente
        const squareImage = await createSquareImage(file);
        
        // Añadir a la lista de archivos
        setImageFiles(prev => [...prev, squareImage]);
        
        // Crear una URL para la vista previa
        const previewUrl = URL.createObjectURL(squareImage);
        setImagePreviews(prev => [...prev, previewUrl]);
        
        // Establecer índice actual para que muestre la imagen recién añadida
        setCurrentImageIndex(imagePreviews.length);
      } catch (error) {
        console.error("Error al procesar la imagen:", error);
        alert("Hubo un problema al procesar la imagen. Intenta con otra imagen.");
      } finally {
        setImageProcessingLoading(false);
        
        // Limpiar el input file para permitir cargar la misma imagen nuevamente si es necesario
        if (e.target) {
          e.target.value = '';
        }
      }
    }
  };
  
  const handleRemoveImage = (index: number) => {
    // Eliminar imagen de los arrays
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);
    
    const newPreviews = [...imagePreviews];
    
    // Liberar URL de objeto antes de eliminar
    URL.revokeObjectURL(newPreviews[index]);
    
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
    
    // Actualizar el índice actual si es necesario
    if (currentImageIndex >= newPreviews.length) {
      setCurrentImageIndex(Math.max(0, newPreviews.length - 1));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create FormData object to handle file upload
      const formData = new FormData();
      formData.append('title', formValues.title);
      formData.append('description', formValues.description);
      formData.append('price', formValues.price.toString());
      formData.append('category', formValues.category.toString());
      formData.append('condition', formValues.condition);
      
      // Append each image with a numbered key for the backend to process
      imageFiles.forEach((file, index) => {
        formData.append(`images[${index}]`, file);
        // Mark first image as primary if it's a new product
        if (index === 0 && !product) {
          formData.append('primary_image_index', '0');
        }
      });
      
      // Log form data for debugging
      for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value instanceof File ? `${value.name} (${value.type})` : value}`);
      }
      
      await onSubmit(formData);
    } catch (error) {
      console.error('Error al enviar formulario:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const conditions = [
    { value: 'new', label: 'Nuevo' },
    { value: 'like_new', label: 'Como nuevo' },
    { value: 'good', label: 'Buen estado' },
    { value: 'fair', label: 'Estado aceptable' },
    { value: 'poor', label: 'Mal estado' },
  ];
  
  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            label="Título"
            name="title"
            value={formValues.title}
            onChange={handleInputChange}
            variant="outlined"
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            required
            fullWidth
            multiline
            rows={4}
            label="Descripción"
            name="description"
            value={formValues.description}
            onChange={handleInputChange}
            variant="outlined"
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <TextField
            required
            fullWidth
            label="Precio"
            name="price"
            type="number"
            value={formValues.price}
            onChange={handleInputChange}
            variant="outlined"
            InputProps={{ inputProps: { min: 0, step: "0.01" } }}
          />
        </Grid>
        
        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Categoría</InputLabel>
            <Select
              name="category"
              value={formValues.category}
              label="Categoría"
              onChange={handleInputChange}
            >
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <FormControl fullWidth required>
            <InputLabel>Condición</InputLabel>
            <Select
              name="condition"
              value={formValues.condition}
              label="Condición"
              onChange={handleInputChange}
            >
              {conditions.map((condition) => (
                <MenuItem key={condition.value} value={condition.value}>
                  {condition.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Imágenes del producto
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Image Preview Container */}
            <Box
              sx={{
                width: '280px',
                height: '280px',
                border: '1px dashed #ccc',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 2,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#f5f5f5'
              }}
            >
              {imageProcessingLoading ? (
                <CircularProgress />
              ) : imagePreviews.length > 0 ? (
                <img 
                  src={imagePreviews[currentImageIndex]} 
                  alt="Vista previa"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }} 
                  onError={(e) => {
                    console.error('Error al cargar la imagen de vista previa');
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/280x280?text=Sin+Imagen';
                  }}
                />
              ) : (
                <PhotoCameraIcon sx={{ fontSize: 80, color: '#aaa' }} />
              )}
            </Box>
            
            {/* Miniaturas y navegación */}
            {imagePreviews.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 2 }}>
                {imagePreviews.map((preview, index) => (
                  <Box 
                    key={index}
                    sx={{
                      width: 60,
                      height: 60,
                      border: currentImageIndex === index ? '2px solid #1976d2' : '1px solid #ddd',
                      borderRadius: 1,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => setCurrentImageIndex(index)}
                  >
                    <img 
                      src={preview}
                      alt={`Miniatura ${index + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        backgroundColor: 'rgba(255,255,255,0.7)',
                        padding: '2px',
                        '&:hover': { backgroundColor: 'rgba(255,0,0,0.2)' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(index);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<AddPhotoAlternateIcon />}
                disabled={imageFiles.length >= 5 || imageProcessingLoading}
              >
                {imageFiles.length === 0 ? 'Añadir imagen' : 'Añadir otra imagen'}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageChange}
                />
              </Button>
              
              {imagePreviews.length > 0 && (
                <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
                  {currentImageIndex + 1} de {imagePreviews.length} {imagePreviews.length >= 5 ? '(máximo)' : ''}
                </Typography>
              )}
            </Box>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Las imágenes se recortarán automáticamente en formato cuadrado
            </Typography>
            
            {imageFiles.length === 0 && (
              <Typography variant="caption" color="error" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                Por favor, añade al menos una imagen para tu producto
              </Typography>
            )}
          </Box>
        </Grid>
        
        <Grid item xs={12} sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading || imageFiles.length === 0 || imageProcessingLoading || isLoading}
            sx={{ minWidth: 200 }}
          >
            {loading || isLoading ? <CircularProgress size={24} /> : (product ? 'Actualizar Producto' : 'Crear Producto')}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProductForm;
