import { useState, useEffect } from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselApi
} from "@/components/ui/carousel";
import { Box, Typography, Button } from '@mui/material';

const images = [
  { src: "/imagenoferta1.png", alt: "Oferta 1", title: "Oferta Especial 1", price: "$249.990", normalPrice: "$399.990" },
  { src: "/imagenoferta2.png", alt: "Oferta 2", title: "Oferta Especial 2", price: "$479.990", normalPrice: "$549.990" },
  { src: "/imagenoferta3.png", alt: "Oferta 3", title: "Oferta Especial 3", price: "$829.990", normalPrice: "$999.990" },
  { src: "/imagenoferta4.png", alt: "Oferta 4", title: "Oferta Especial 4", price: "$329.990", normalPrice: "$459.990" },
  { src: "/imagenoferta5.png", alt: "Oferta 5", title: "Oferta Especial 5", price: "$599.990", normalPrice: "$749.990" },
];

const arrowButtonStyle = {
  minWidth: 0,
  width: { xs: '30px', sm: '35px', md: '45px' },
  height: { xs: '30px', sm: '35px', md: '45px' },
  borderRadius: '50%',
  border: '1px solid #fff',
  boxShadow: 'none',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2,
  background: 'rgba(80, 80, 80, 0.6)',
  padding: { xs: 6, sm: 8, md: 10 },
  '&:hover': {
    background: 'rgba(100, 100, 100, 0.8)',
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

const OffersCarousel = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);

    // Autoplay: cada 10 segundos, avanza o vuelve al inicio
    const autoplayInterval = setInterval(() => {
      if (api.selectedScrollSnap() === images.length - 1) {
        api.scrollTo(0);
      } else {
        api.scrollNext();
      }
    }, 10000);

    return () => {
      api.off("select", handleSelect);
      clearInterval(autoplayInterval);
    };
  }, [api]);

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
      bgcolor: '#222',
      borderRadius: 2,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      minHeight: { xs: 400, sm: 500, md: 500 }
    }}>
      <Typography 
        variant="h5" 
        component="div" 
        sx={{ 
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
        <Box component="span" sx={{ color: '#fff', mr: 1 }}>★</Box>
        Ofertas de la Semana
        <Box component="span" sx={{ color: '#fff', ml: 1 }}>★</Box>
      </Typography>
      
      <Carousel setApi={setApi}>
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
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
                    mx: 'auto'
                  }}
                >
                  <img 
                    src={image.src} 
                    alt={image.alt} 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '100%', 
                      objectFit: 'contain'
                    }} 
                  />
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
                      color: '#fff'
                    }}
                  >
                    {image.title}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 3 }}>
                    <Typography 
                      variant="h3" 
                      component="span" 
                      sx={{ 
                        color: '#fff', 
                        fontWeight: 700 
                      }}
                    >
                      {image.price}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      component="span" 
                      sx={{ 
                        ml: 2, 
                        textDecoration: 'line-through',
                        color: 'red'
                      }}
                    >
                      {image.normalPrice}
                    </Typography>
                  </Box>
                  
                  <Button 
                    variant="contained" 
                    color="primary" 
                    size="large" 
                    sx={{ 
                      px: 4,
                      py: 1,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '1rem',
                      fontWeight: 600,
                      bgcolor: '#004f9e',
                      color: '#fff',
                      boxShadow: 'none',
                      '&:hover': {
                        bgcolor: '#003366'
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
        {images.map((_, index) => (
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
