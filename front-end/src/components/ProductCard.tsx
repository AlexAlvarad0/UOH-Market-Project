import React, { useState } from 'react';
import { Card, Typography, Box } from '@mui/material';
import { Product } from '../types/products';
import { Link } from 'react-router-dom';
import '../styles/ProductCard.css';
import { formatPrice } from '../utils/formatPrice';

interface ProductCardProps {
  product: Product;
  onFavoriteClick?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onFavoriteClick }) => {
  const [imageError, setImageError] = useState(false);
  
  // Encontrar la imagen primaria o la primera
  const image = product.images && product.images.length > 0
    ? product.images.find(img => img.is_primary) || product.images[0]
    : null;
  
  const imageUrl = image && !imageError ? image.image : null;
  
  // Determinar si el producto ya está marcado como favorito
  const isFavorite = !!product.is_favorite;

  const handleFavoriteChange = (e) => {
    // Prevenir la navegación cuando se hace clic en el botón de favoritos
    e.preventDefault();
    e.stopPropagation();
    
    if (onFavoriteClick) {
      onFavoriteClick();
    }
  };

  // Estilos inline que tendrán mayor especificidad
  const cardStyle = {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease',
    '&:hover': {
      transform: 'translateY(-5px)'
    }
  };
  
  const imageContainerStyle = {
    aspectRatio: '1/1', // Mantener relación cuadrada
    position: 'relative',
    width: '100%',
    overflow: 'hidden'
  };

  const imageStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  };

  const contentStyle = {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '16px',
    height: 'calc(100% - 220px)'
  };

  return (
    <Card className="product-card" sx={cardStyle}>
      <Link to={`/products/${product.id}`} style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        width: '100%'
      }}>
        <div style={imageContainerStyle}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={product.title} 
              style={imageStyle}
              onError={() => setImageError(true)}
            />
          ) : (
            <Box sx={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#ffffff',
              color: '#999'
            }}>
              <Typography variant="body2">Sin imagen</Typography>
            </Box>
          )}
          <div className="favorite-button" onClick={handleFavoriteChange}>
            <label className="ui-bookmark">
              <input type="checkbox" checked={isFavorite} onChange={() => {}} />
              <div className="bookmark">
                <svg viewBox="0 0 16 16" style={{marginTop: 4}} className="bi bi-heart-fill" height={25} width={25}>
                  <path d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314" fillRule="evenodd" />
                </svg>
              </div>
            </label>
          </div>
        </div>
      </Link>
      <Link to={`/products/${product.id}`} style={{ 
        textDecoration: 'none', 
        color: 'inherit', 
        display: 'flex', 
        flexDirection: 'column',
        flexGrow: 1,
        width: '100%'
      }}>
        <div style={contentStyle}>
          <Typography 
            variant="h6" 
            className="product-title" 
            sx={{ 
              color: '#333',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              mb: 1
            }}
          >
            {product.title}
          </Typography>
          
          <Typography 
            variant="body2" 
            className="product-category" 
            sx={{ mb: 1 }}
          >
            {product.category_name}
          </Typography>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              mb: 2,
              flexGrow: 1
            }}
          >
            {product.description}
          </Typography>
          
          <Typography 
            variant="h6" 
            className="product-price" 
            sx={{ 
              color: '#1976d2',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            {formatPrice(product.price)}
          </Typography>
        </div>
      </Link>
    </Card>
  );
};

export default ProductCard;