import React, { useRef } from 'react';
import { Box, IconButton, Typography, useMediaQuery, useTheme } from '@mui/material';
import { Reply as ReplyIcon } from '@mui/icons-material';
import { useSwipe } from '../hooks/useSwipe';

interface SwipeableMessageProps {
  children: React.ReactNode;
  onReply: () => void;
  isOwnMessage: boolean;
  disabled?: boolean;
}

const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  onReply,
  isOwnMessage,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));  const { ref: swipeRef, isTracking, swipeOffset } = useSwipe(
    {
      onSwipeRight: () => {
        if (!disabled && !isOwnMessage) {
          onReply();
        }
      },
      onSwipeLeft: () => {
        if (!disabled && isOwnMessage) {
          onReply();
        }
      }
    },
    {
      threshold: isMobile ? 40 : 50, // Umbral para ejecutar swipe
      trackTouch: !disabled,
      trackMouse: !disabled,
      trackingDelay: isMobile ? 300 : 150, // Más delay en móvil para distinguir taps
      minDragDistance: isMobile ? 15 : 8 // Mayor distancia mínima en móvil
    }
  );
  
  // Determinar la dirección del swipe basado en si es mensaje propio o no
  const swipeDirection = isOwnMessage ? 'left' : 'right';
  const shouldShowReplyIcon = isTracking && Math.abs(swipeOffset) > (isMobile ? 25 : 30);
  const replyIconOpacity = Math.min(Math.abs(swipeOffset) / (isMobile ? 50 : 60), 1);
  const replyIconScale = Math.min(0.7 + (Math.abs(swipeOffset) / (isMobile ? 50 : 60)) * 0.3, isMobile ? 0.9 : 1.0);

  // Limitar el offset para que no se mueva demasiado - más restrictivo en móvil
  const maxOffset = isMobile ? 80 : 120;
  const limitedOffset = Math.max(-maxOffset, Math.min(maxOffset, swipeOffset));  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        overflow: 'visible',
        minHeight: isMobile ? '40px' : '50px', // Menor altura mínima en móvil
        // Agregar padding lateral en móvil para evitar solapamiento
        px: isMobile ? 1 : 0
      }}
    >      {/* Icono de respuesta de fondo */}
      {shouldShowReplyIcon && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            transform: `translateY(-50%) scale(${replyIconScale})`,
            [swipeDirection]: isMobile ? '15px' : '20px', // Más cerca en móvil
            zIndex: 0,
            opacity: replyIconOpacity,
            transition: isTracking ? 'none' : 'opacity 0.2s ease, transform 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: isMobile ? 0.3 : 0.5,
            minHeight: isMobile ? '40px' : '60px', // Menor altura en móvil
            justifyContent: 'center'
          }}
        >
          <IconButton
            sx={{
              backgroundColor: 'primary.main',
              color: 'white',
              width: isMobile ? 32 : 40, // Más pequeño en móvil
              height: isMobile ? 32 : 40,
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            }}
            size="small"
          >
            <ReplyIcon sx={{ fontSize: isMobile ? 16 : 20 }} /> {/* Ícono más pequeño en móvil */}
          </IconButton>
          {Math.abs(swipeOffset) > (isMobile ? 40 : 50) && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'primary.main',
                fontWeight: 'bold',
                fontSize: isMobile ? '0.65rem' : '0.7rem', // Texto más pequeño en móvil
                whiteSpace: 'nowrap'
              }}
            >
              Responder
            </Typography>
          )}
        </Box>
      )}      {/* Contenido del mensaje */}
      <Box
        ref={swipeRef}        sx={{
          transform: isTracking ? `translateX(${limitedOffset}px)` : 'translateX(0px)',
          transition: isTracking ? 'none' : 'transform 0.3s ease',
          position: 'relative',
          zIndex: 1,
          backgroundColor: 'inherit',
          cursor: disabled ? 'default' : (isTracking ? 'grabbing' : 'grab'),
          userSelect: isTracking ? 'none' : 'auto',
          // Agregar una sombra sutil cuando se está arrastrando
          boxShadow: isTracking ? (isMobile ? '0 2px 8px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.15)') : 'none',
          borderRadius: isTracking ? '8px' : '0px',
          // Prevenir la selección de texto durante el swipe
          WebkitUserSelect: isTracking ? 'none' : 'auto',
          MozUserSelect: isTracking ? 'none' : 'auto',
          msUserSelect: isTracking ? 'none' : 'auto',
          // Prevenir el comportamiento de arrastre por defecto
          WebkitTouchCallout: 'none',
          WebkitTapHighlightColor: 'transparent',
          // Optimización de rendimiento para transformaciones
          willChange: isTracking ? 'transform' : 'auto',
          // Asegurar que el contenido no se solape con los bordes en móvil
          ...(isMobile && isTracking && {
            mx: 1 // Margen horizontal cuando se está arrastrando en móvil
          })
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SwipeableMessage;
