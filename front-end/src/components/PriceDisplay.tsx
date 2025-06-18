import React from 'react';
import { Typography, Box } from '@mui/material';
import { formatPrice } from '../utils/formatPrice';

interface PriceDisplayProps {
  currentPrice: string | number;
  originalPrice?: number | null;
  variant?: 'h4' | 'h5' | 'h6' | 'body1' | 'body2';
  color?: string;
  showOriginalLabel?: boolean;
  orientation?: 'horizontal' | 'vertical';
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({
  currentPrice,
  originalPrice,
  variant = 'h6',
  color = 'primary.main',
  showOriginalLabel = false,
  orientation = 'vertical'
}) => {  // Convertir el precio actual a número para comparación
  const currentPriceNum = typeof currentPrice === 'string' ? 
    (currentPrice === 'Precio' ? NaN : parseFloat(currentPrice.replace(/[^0-9.-]+/g, ''))) : 
    currentPrice;
  
  // Verificar si hay un precio original válido y es diferente al precio actual
  // Usamos Math.abs para comparar con una pequeña tolerancia para evitar problemas de precisión decimal
  const hasOriginalPrice = originalPrice && 
                          originalPrice > 0 && 
                          !isNaN(currentPriceNum) && 
                          currentPriceNum > 0 &&
                          Math.abs(originalPrice - currentPriceNum) > 0.01;
  
  if (orientation === 'horizontal') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant={variant} sx={{ color, fontWeight: 'bold' }}>
          {formatPrice(currentPrice)}
        </Typography>
        {hasOriginalPrice && (
          <Typography 
            variant="body2" 
            sx={{ 
              color: 'text.secondary',
              textDecoration: 'line-through',
              fontSize: variant === 'h4' ? '1rem' : 
                       variant === 'h5' ? '0.875rem' : 
                       variant === 'h6' ? '0.75rem' : '0.75rem'
            }}          >
            {showOriginalLabel && 'Antes: '}{formatPrice(originalPrice)}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant={variant} sx={{ color, fontWeight: 'bold' }}>
        {formatPrice(currentPrice)}
      </Typography>
      {hasOriginalPrice && (
        <Typography 
          variant="body2" 
          sx={{ 
            color: 'text.secondary',
            textDecoration: 'line-through',
            fontSize: variant === 'h4' ? '1rem' : 
                     variant === 'h5' ? '0.875rem' : 
                     variant === 'h6' ? '0.75rem' : '0.75rem',
            mt: variant === 'h4' || variant === 'h5' ? 0.5 : 0.25
          }}        >
          {showOriginalLabel && 'Precio anterior: '}{formatPrice(originalPrice)}
        </Typography>
      )}
    </Box>
  );
};

export default PriceDisplay;
