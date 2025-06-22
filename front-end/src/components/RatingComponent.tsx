import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import StarRating from './StarRating';
import { createRating } from '../api';
import '../styles/StarRating.css';

interface Rating {
  id: number;
  rating: number;
  comment: string;
  rater: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  created_at: string;
}

interface RatingComponentProps {
  sellerId: number;
  sellerName: string;
  currentUserRating?: Rating | null;
  onRatingSubmitted?: () => void;
}

const RatingComponent: React.FC<RatingComponentProps> = ({
  sellerId,
  sellerName,
  currentUserRating,
  onRatingSubmitted
}) => {
  // Determinar si realmente hay una calificación existente
  const hasExistingRating = currentUserRating && currentUserRating.id && currentUserRating.rating > 0;
  
  const [rating, setRating] = useState<number>(hasExistingRating ? currentUserRating.rating : 0);
  const [comment, setComment] = useState<string>(hasExistingRating && currentUserRating.comment ? currentUserRating.comment : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    if (hasExistingRating) {
      setRating(currentUserRating.rating);
      setComment(currentUserRating.comment || '');
    }
  }, [currentUserRating, hasExistingRating]);
  
  const handleSubmitRating = async () => {
    if (rating === 0) {
      setError('Por favor selecciona una calificación');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {        setError('Debes estar autenticado para calificar');
        return;
      }      
      
      // Siempre usamos createRating para evitar problemas de updateRating
      // El backend está configurado para manejar esto, actualizando si ya existe una calificación
      await createRating({
        rated_user: sellerId,
        rating: rating,
        comment: comment.trim()
      }, token);

      setSuccess(hasExistingRating ? 'Calificación actualizada exitosamente' : 'Vendedor calificado exitosamente');
      if (onRatingSubmitted) {
        onRatingSubmitted();
      }
    } catch (error) {
      console.error('Error al enviar la calificación:', error);
      // Comprobamos si el error es de axios
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Error al enviar la calificación');
      } else {
        setError('Error de conexión. Intenta nuevamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Paper elevation={5} className="rating-input">
      <Typography variant="h6" component="h4">
        {hasExistingRating ? 'Actualizar tu calificación' : `Calificar al vendedor ${sellerName}`}
      </Typography>
      <Box sx={{ my: 2 }}>
        <StarRating 
          rating={rating} 
          onRatingChange={newRating => {
            setRating(newRating);
            setError('');
          }} 
          size="large"
          interactive={true}
        />
      </Box>
      <TextField
        fullWidth
        multiline
        minRows={2}
        maxRows={4}
        variant="outlined"
        label="Comentario (opcional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        sx={{ my: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ my: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ my: 2 }}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button 
          onClick={handleSubmitRating}
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={16} /> : null}
          className="rating-submit-btn"
        >
          {isSubmitting 
            ? 'Enviando...' 
            : hasExistingRating 
              ? 'Actualizar Calificación' 
              : 'Calificar Vendedor'
          }
        </Button>
      </Box>
    </Paper>
  );
};

export default RatingComponent;
