import React from 'react';
import { Container, Typography, Box, Paper, Alert, Snackbar } from '@mui/material';
import ProductForm from '../components/ProductForm';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import api from '../services/api';

const CreateProductPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    try {
      console.log("Enviando formulario de creación de producto:");
      
      const response = await api.createProduct(formData);
      
      if (response.success) {
        console.log('Producto creado correctamente:', response.data);
        setSuccess(true);
        
        // Redirigir al detalle del producto después de 2 segundos
        setTimeout(() => {
          navigate(`/products/${response.data.id}`);
        }, 2000);
      } else {
        console.error('Error al crear producto:', response.error);
        setError('Error al crear el producto. Por favor, inténtelo de nuevo.');
      }
    } catch (error) {
      console.error('Error al crear producto:', error);
      setError('Error al crear el producto. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ mb: 4 }}>
          Crear un nuevo producto
        </Typography>
        
        <Paper elevation={3} sx={{ p: 4 }}>
          <ProductForm onSubmit={handleSubmit} />
        </Paper>
      </Box>
      
      <Snackbar open={Boolean(error)} autoHideDuration={6000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      
      <Snackbar open={success} autoHideDuration={4000} onClose={() => setSuccess(false)}>
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Producto creado exitosamente
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateProductPage;
