import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi
} from "@/components/ui/carousel";
import { Box, Typography, Button } from '@mui/material';
import { WeeklyOffer } from '@/types/products';
import apiService from '@/services/api';
import { formatPrice } from '@/utils/formatPrice';

interface OffersCarouselProps {
  isVisible?: boolean;
}

const API_BASE_URL = 'http://localhost:8000';

const arrowButtonStyle = {
  minWidth: 0,
  width: { xs: '30px', sm: '35px', md: '45px' },
  height: { xs: '30px', sm: '35px', md: '45px' },
  borderRadius: '50%',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: 'none',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
  background: 'rgba(255, 255, 255, 0.1)',
  padding: { xs: 6, sm: 8, md: 10 },
  '&:hover': {
    background: 'rgba(255, 255, 255, 0.2)',
    color: '#fff'
  }
};

const arrowIconStyle: React.CSSProperties = {
  fontSize: 36,
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  lineHeight: 1
};

const OffersCarousel = ({ isVisible = true }: OffersCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [offers, setOffers] = useState<WeeklyOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();  useEffect(() => {
    const fetchOffers = async () => {      try {
        setLoading(true);
        
        // Debug: obtener información de productos
        await apiService.getDebugProducts();
        
        const response = await apiService.getWeeklyOffers();
        if (response.success && response.data) {
          setOffers(response.data);
        } else {
          // No offers found
        }
      } catch (error) {
        // Error fetching offers
      } finally {
        setLoading(false);
      }
    };

    if (isVisible) {
      fetchOffers();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!api || offers.length === 0) return;

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);

    // Autoplay: cada 10 segundos, avanza o vuelve al inicio
    const autoplayInterval = setInterval(() => {
      if (api.selectedScrollSnap() === offers.length - 1) {
        api.scrollTo(0);
      } else {
        api.scrollNext();
      }
    }, 10000);

    return () => {
      api.off("select", handleSelect);
      clearInterval(autoplayInterval);
    };
  }, [api, offers.length]);
  const getProductImage = (offer: WeeklyOffer) => {
    if (offer.images && offer.images.length > 0) {
      const primaryImage = offer.images.find(img => img.is_primary) || offer.images[0];
      return `${API_BASE_URL}${primaryImage.image}`;
    }
    return '/src/assets/placeholder-image.png'; // Imagen placeholder si no hay imagen
  };

  const handleViewOffer = (offerId: number) => {
    navigate(`/products/${offerId}`);
  };

  // No mostrar el carrusel si no es visible, está cargando, o no hay ofertas
  if (!isVisible || loading || offers.length === 0) {
    return null;
  }

  return (
    <Box sx={{ 
      width: '100vw',
      maxWidth: '100vw',
      position: 'relative',
      left: '50%',
      right: '50%',
      transform: 'translateX(-50%)',
      mt: 4, 
      mb: 6,
      overflow: 'hidden',
      bgcolor: '#102c54',
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      minHeight: { xs: 400, sm: 500, md: 500 }
    }}>
      <Typography 
        variant="h5" 
        component="div"        sx={{ 
          mb: 2, 
          pt: 2, 
          px: 3,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: '#fff'
        }}
      >
        <Box component="span" sx={{ color: '#ffd700', mr: 1 }}>★</Box>
        Ofertas de la Semana
        <Box component="span" sx={{ color: '#ffd700', ml: 1 }}>★</Box>
      </Typography>
      
      <Carousel setApi={setApi}>        <CarouselContent>
          {offers.map((offer) => (
            <CarouselItem key={offer.id}>
              <Box sx={{ 
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center',
                px: { xs: 2, sm: 4 },
                py: 3
              }}>
                <Box 
                  sx={{ 
                    width: { xs: '100%', md: '40%' },
                    aspectRatio: '16/9',
                    height: 'auto',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    bgcolor: '#fff',
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    maxWidth: { xs: '100%', md: '80%' },
                    mx: 'auto',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleViewOffer(offer.id)}
                >
                  <img 
                    src={getProductImage(offer)} 
                    alt={offer.title} 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain'
                    }}                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/src/assets/placeholder-image.png';
                    }}
                  />
                  {/* Badge de descuento */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      bgcolor: '#ff4444',
                      color: '#fff',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    -{Math.round(offer.discount_percentage)}%
                  </Box>
                </Box>
                
                <Box sx={{ 
                  width: { xs: '100%', md: '50%' },
                  p: { xs: 2, md: 4 },
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: { xs: 'center', md: 'flex-start' }
                }}>
                  <Typography 
                    variant="h4" 
                    component="h2" 
                    sx={{ 
                      mb: 2,
                      fontWeight: 600,
                      textAlign: { xs: 'center', md: 'left' },
                      color: '#fff',
                      fontSize: { xs: '1.5rem', md: '2rem' }
                    }}
                  >
                    {offer.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3, gap: 2 }}>
                    <Typography 
                      variant="h3" 
                      component="span"                      sx={{ 
                        color: '#fff', 
                        fontWeight: 700,
                        fontSize: { xs: '1.8rem', md: '2.5rem' }
                      }}
                    >
                      {formatPrice(parseFloat(offer.price))}
                    </Typography>
                    {offer.original_price && (
                      <Typography 
                        variant="body1" 
                        component="span" 
                        sx={{ 
                          textDecoration: 'line-through',
                          color: '#ff6666',
                          fontSize: { xs: '1rem', md: '1.2rem' }
                        }}
                      >
                        {formatPrice(offer.original_price)}
                      </Typography>
                    )}
                  </Box>
                  
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large" 
                    onClick={() => handleViewOffer(offer.id)}                    sx={{ 
                      px: 4,
                      py: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      bgcolor: '#fff',
                      color: '#333',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      border: '1px solid rgba(0,0,0,0.1)',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }
                    }}
                  >
                    Ver oferta
                  </Button>
                </Box>
              </Box>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious
          className="offers-carousel-arrow offers-carousel-arrow-left"
          style={{
            ...arrowButtonStyle,
            position: 'absolute',
            top: '50%',
            left: '2.1%',
            transform: 'translateY(-50%)',
            display: window.innerWidth < 768 ? 'none' : 'flex',
            width: window.innerWidth < 960 ? '35px' : '45px',
            height: window.innerWidth < 960 ? '35px' : '45px',
            padding: window.innerWidth < 960 ? 8 : 10,
          }}
        >
          <span style={{
            ...arrowIconStyle,
            fontSize: window.innerWidth < 960 ? 30 : 36,
          }}>‹</span>
        </CarouselPrevious>
        <CarouselNext
          className="offers-carousel-arrow offers-carousel-arrow-right"
          style={{
            ...arrowButtonStyle,
            position: 'absolute',
            top: '50%',
            right: '2.1%',
            transform: 'translateY(-50%)',
            display: window.innerWidth < 768 ? 'none' : 'flex',
            width: window.innerWidth < 960 ? '35px' : '45px',
            height: window.innerWidth < 960 ? '35px' : '45px',
            padding: window.innerWidth < 960 ? 8 : 10,
          }}
        >
          <span style={{
            ...arrowIconStyle,
            fontSize: window.innerWidth < 960 ? 30 : 36,
          }}>›</span>
        </CarouselNext>
      </Carousel>
      
      {/* Dots indicator */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: 1,
        py: 2
      }}>
        {offers.map((_, index) => (
          <Box
            key={index}
            onClick={() => api?.scrollTo(index)}
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: current === index ? '#004f9e' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s',
              border: current === index ? '2px solid #fff' : 'none',
              '&:hover': {
                bgcolor: current === index ? '#003366' : 'rgba(255,255,255,0.7)',
              }
            }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default OffersCarousel;
