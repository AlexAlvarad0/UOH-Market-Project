import React, { useState } from 'react';
import { Box, IconButton, Paper } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { ProductImage } from '../types/products';

interface ImageCarouselProps {
  images: ProductImage[];
  height?: string | number;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  height = '400px' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Si no hay imágenes, mostrar un placeholder
  if (!images || images.length === 0) {
    return (
      <Box
        sx={{
          height,
          width: '100%',
          backgroundColor: '#111111 !important', // Forzar color con !important
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 1,
          color: '#fff',
        }}
      >
        <span style={{ color: '#fff' }}>No hay imágenes disponibles</span>
      </Box>
    );
  }

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <Box sx={{ width: '100%', position: 'relative', color: '#fff' }}>
      {/* Imagen principal - Contenedor externo con fondo forzado */}
      <Box
        className="image-carousel-container"
        sx={{
          height,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 1,
          position: 'relative',
          backgroundColor: '#111111 !important', // Forzar color con !important
          padding: '20px', // Reducir el padding
        }}
        style={{ backgroundColor: '#111111' }} // Método alternativo para aplicar el fondo
      >
        {/* Contenedor de imagen */}
        <Box
          sx={{
            width: '90%',
            height: '90%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1, // Asegurar que esté por encima del fondo
          }}
        >
          <img
            src={images[currentIndex].image}
            alt={`Imagen ${currentIndex + 1}`}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x400?text=Imagen+no+disponible';
            }}
          />
        </Box>
        
        {/* Botones de navegación */}
        {images.length > 1 && (
          <>
            <IconButton
              onClick={handlePrev}
              sx={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0,79,158,0.9)', // Más opaco para mejor visibilidad
                color: '#fff',
                '&:hover': { backgroundColor: 'rgba(0,79,158,1)' },
                zIndex: 10,
              }}
            >
              <ArrowBackIosNewIcon sx={{ color: '#fff' }} />
            </IconButton>
            <IconButton
              onClick={handleNext}
              sx={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                backgroundColor: 'rgba(0,79,158,0.9)', // Más opaco para mejor visibilidad
                color: '#fff',
                '&:hover': { backgroundColor: 'rgba(0,79,158,1)' },
                zIndex: 10,
              }}
            >
              <ArrowForwardIosIcon sx={{ color: '#fff' }} />
            </IconButton>
          </>
        )}
      </Box>
      
      {/* Miniaturas */}
      {images.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 2,
            gap: 1,
            overflowX: 'auto',
            pb: 1,
          }}
        >
          {images.map((image, index) => (
            <Paper
              key={image.id}
              elevation={currentIndex === index ? 4 : 1}
              onClick={() => handleThumbnailClick(index)}
              sx={{
                width: 80,
                height: 80,
                cursor: 'pointer',
                border: currentIndex === index ? '2px solid #004f9e' : '1px solid #ddd', // Azul activo
                overflow: 'hidden',
                flexShrink: 0,
                transition: 'all 0.2s',
                backgroundColor: '#222', // Fondo oscuro para contraste
                '&:hover': {
                  transform: 'scale(1.05)',
                  border: '2px solid #004f9e',
                },
              }}
            >
              <img
                src={image.image}
                alt={`Miniatura ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </Paper>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default ImageCarousel;
