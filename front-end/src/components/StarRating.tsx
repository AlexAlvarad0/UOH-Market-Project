import React, { useState } from 'react';
import { Star, StarBorder, StarHalf } from '@mui/icons-material';
import '../styles/StarRating.css';

interface StarRatingProps {
  rating?: number;
  maxRating?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  totalRatings?: number;
}

const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  maxRating = 5,
  interactive = false,
  onRatingChange,
  size = 'medium',
  showText = true,
  totalRatings
}) => {
  const [hoverRating, setHoverRating] = useState<number>(0);

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { fontSize: '16px' };
      case 'large':
        return { fontSize: '28px' };
      default:
        return { fontSize: '20px' };
    }
  };

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleMouseEnter = (starRating: number) => {
    if (interactive) {
      setHoverRating(starRating);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0);
    }
  };
  const getStarIcon = (starIndex: number) => {
    const currentRating = interactive && hoverRating > 0 ? hoverRating : rating;
    const sizeStyle = getSizeStyle();
    
    if (currentRating >= starIndex) {
      return <Star style={{ ...sizeStyle, color: '#ffd700' }} />;
    } else if (currentRating >= starIndex - 0.5) {
      return <StarHalf style={{ ...sizeStyle, color: '#ffd700' }} />;
    } else {
      return <StarBorder style={{ ...sizeStyle, color: '#e0e0e0' }} />;
    }
  };

  const getStarClass = (starIndex: number) => {
    const currentRating = interactive && hoverRating > 0 ? hoverRating : rating;
    
    let className = 'star';
    
    if (interactive) {
      className += ' interactive';
    }
    
    if (currentRating >= starIndex) {
      className += ' filled';
    } else if (currentRating >= starIndex - 0.5) {
      className += ' half';
    } else {
      className += ' empty';
    }
    
    return className;
  };

  const formatRating = (value: number) => {
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };
  return (
    <div className="star-rating" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
      <div className="star-container">
        {Array.from({ length: maxRating }, (_, index) => {
          const starIndex = index + 1;
          return (
            <span
              key={starIndex}
              className={getStarClass(starIndex)}
              onClick={() => handleStarClick(starIndex)}
              onMouseEnter={() => handleMouseEnter(starIndex)}
              onMouseLeave={handleMouseLeave}
            >
              {getStarIcon(starIndex)}
            </span>
          );
        })}
      </div>
      {showText && (
        <span className="rating-text" style={{ marginTop: '4px', fontSize: '0.875rem' }}>
          {rating > 0 ? (
            <>
              {formatRating(rating)}
              {totalRatings !== undefined && (
                <span> ({totalRatings} {totalRatings === 1 ? 'calificación' : 'calificaciones'})</span>
              )}
            </>
          ) : (
            'Sin calificaciones'
          )}
        </span>
      )}
    </div>
  );
};

export default StarRating;
