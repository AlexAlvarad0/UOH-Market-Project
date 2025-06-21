import React from 'react';
import { Box, Skeleton, Card } from '@mui/material';
import { Product } from '../types/products';
import ProductCard from './ProductCard';

interface ProductListProps {
  products: Product[];
  onFavoriteClick?: (productId: number) => void;
  isLoading?: boolean;
  itemsPerRow?: number;
  uniformSize?: boolean;
  cardHeight?: number;
  imageHeight?: number;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  onFavoriteClick,
  isLoading = false,
  itemsPerRow = 4,
  cardHeight = 380,
  imageHeight = 220,
}) => {  const getCardWidth = () => {
    // Usar itemsPerRow si está definido, sino usar responsive breakpoints
    if (itemsPerRow) {
      const percentage = 100 / itemsPerRow;
      const gap = 16; // gap de 16px
      return `calc(${percentage}% - ${gap * (itemsPerRow - 1) / itemsPerRow}px)`;
    }
    
    // Fallback a responsive breakpoints
    return {
      xs: 'calc(50% - 8px)', // 2 por fila en pantallas pequeñas
      sm: 'calc(50% - 8px)',
      md: 'calc(33.33% - 11px)',
      lg: 'calc(25% - 12px)',
      xl: 'calc(20% - 13px)' // 5 por fila en pantallas grandes
    };
  };

  if (isLoading) {
    return (      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: '16px',
        width: '100%',
        mx: 'auto',
      }}>
        {[...Array(itemsPerRow * 2)].map((_, index) => (
          <Box 
            key={`skeleton-${index}`}
            sx={{ 
              width: getCardWidth(),
              mb: 2
            }}
          >
            <Card sx={{ height: cardHeight }}>
              <Skeleton variant="rectangular" height={imageHeight} />
              <Box sx={{ p: 2 }}>
                <Skeleton height={32} width="80%" />
                <Skeleton height={20} width="50%" />
                <Skeleton height={20} width="70%" />
              </Box>
            </Card>
          </Box>
        ))}
      </Box>
    );
  }  return (
    <Box sx={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      gap: '16px',
      width: '100%',
      mt: 0, // Asegura que no haya margen superior adicional
      mx: 'auto', // Centra el contenedor
    }}>
      {products.map((product) => (
        <Box 
          key={product.id} 
          sx={{ 
            width: getCardWidth(),
            mb: 2
          }}
        >
          <ProductCard 
            product={product} 
            onFavoriteClick={onFavoriteClick ? () => onFavoriteClick(product.id) : undefined}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ProductList;
