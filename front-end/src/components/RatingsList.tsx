import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  CircularProgress,
  Alert,
  Pagination
} from '@mui/material';
import StarRating from './StarRating';
import { API_URL } from '../config';
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
  } | string;
  rater_username?: string;
  created_at: string;
}

interface RatingsListProps {
  sellerId: number;
  averageRating: number;
  totalRatings: number;
}

const RatingsList: React.FC<RatingsListProps> = ({
  sellerId,
  averageRating,
  totalRatings
}) => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);  const [totalPages, setTotalPages] = useState(1);  const fetchRatings = useCallback(async (pageNumber: number = 1) => {
    try {      setLoading(true);
      const response = await fetch(
        `${API_URL}/api/auth/ratings/user/${sellerId}/?page=${pageNumber}`
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Datos de calificaciones recibidos:", data);
        setRatings(data.results || data);
        if (data.count) {
          setTotalPages(Math.ceil(data.count / 10)); // Asumiendo 10 items por página
        }
      } else {
        setError('Error al cargar las calificaciones');
      }
    } catch {
      setError('Error de conexión al cargar las calificaciones');
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

  useEffect(() => {
    fetchRatings(page);
  }, [fetchRatings, page]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };  const getDisplayName = (user: Rating['rater'] | undefined) => {
    // Verificar si el usuario existe
    if (!user) {
      return "Usuario desconocido";
    }
    
    // Si es una cadena (caso en que solo llega rater_username)
    if (typeof user === 'string') {
      return user;
    }
    
    // Verificar si tiene nombre o apellido
    if (user.first_name || user.last_name) {
      return `${String(user.first_name || '')} ${String(user.last_name || '')}`.trim();
    }
    
    // Devolver el nombre de usuario o un valor por defecto si no existe
    return user.username || "Usuario sin nombre";
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      

      {ratings.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">
            Este vendedor aún no tiene calificaciones
          </Typography>
        </Paper>
      ) : (        <Box className="ratings-list">          {ratings.map((rating, index) => {
            console.log("Renderizando calificación:", rating);
            return (
              <Paper key={rating.id || index} className="rating-item" elevation={1}>
                <Box className="rating-header">
                  <Box>
                    <Typography className="rating-user">
                      {rating.rater_username || getDisplayName(rating.rater)}
                    </Typography>
                    <StarRating
                      rating={rating.rating || 0}
                      showText={false}
                      size="small"
                    />
                  </Box>
                  <Typography className="rating-date">
                    {rating.created_at ? formatDate(rating.created_at) : 'Fecha desconocida'}
                  </Typography>
                </Box>
                
                {rating.comment && (
                  <Typography className="rating-comment-text">
                    {rating.comment}
                  </Typography>
                )}
                
                {index < ratings.length - 1 && <Divider sx={{ mt: 2 }} />}              </Paper>
            );
          })}

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default RatingsList;
