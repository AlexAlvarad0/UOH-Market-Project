import { useRef, useEffect, useState } from 'react';

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
}

interface SwipeOptions {
  threshold?: number; // Distancia mínima para considerar un swipe
  preventDefaultTouchmoveEvent?: boolean;
  trackTouch?: boolean;
  trackMouse?: boolean;
  trackingDelay?: number; // Delay en ms antes de mostrar el tracking visual
  minDragDistance?: number; // Distancia mínima para activar el tracking visual
}

export const useSwipe = (
  handlers: SwipeHandlers,
  options: SwipeOptions = {}
) => {
  const {
    threshold = 100,
    preventDefaultTouchmoveEvent = false,
    trackTouch = true,
    trackMouse = true,
    trackingDelay = 150, // 150ms de delay antes de mostrar tracking
    minDragDistance = 10 // 10px mínimo de arrastre para activar tracking
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const [isVisualTracking, setIsVisualTracking] = useState(false); // Nuevo estado para tracking visual
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const elementRef = useRef<HTMLElement>(null);
  const trackingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reset = () => {
    setIsTracking(false);
    setIsVisualTracking(false);
    setStartX(0);
    setCurrentX(0);
    
    // Limpiar timeout si existe
    if (trackingTimeoutRef.current) {
      clearTimeout(trackingTimeoutRef.current);
      trackingTimeoutRef.current = null;
    }
  };
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;    const handleStart = (clientX: number) => {
      setIsTracking(true);
      setStartX(clientX);
      setCurrentX(clientX);
      handlers.onSwipeStart?.();
      
      // Iniciar timeout para activar tracking visual después del delay
      trackingTimeoutRef.current = setTimeout(() => {
        setIsVisualTracking(true);
      }, trackingDelay);
    };

    const handleMove = (clientX: number) => {
      if (!isTracking) return;
      setCurrentX(clientX);
      
      // Activar tracking visual inmediatamente si se arrastra más de la distancia mínima
      const deltaX = Math.abs(clientX - startX);
      if (deltaX >= minDragDistance && !isVisualTracking) {
        if (trackingTimeoutRef.current) {
          clearTimeout(trackingTimeoutRef.current);
          trackingTimeoutRef.current = null;
        }
        setIsVisualTracking(true);
      }
    };

    const handleEnd = () => {
      if (!isTracking) return;
      
      const deltaX = currentX - startX;
      const absDeltaX = Math.abs(deltaX);      if (absDeltaX >= threshold) {
        // Vibración suave en dispositivos móviles cuando se activa el swipe
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
        
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      }

      handlers.onSwipeEnd?.();
      reset();
    };    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      if (!trackTouch) return;
      // Prevenir eventos de mouse cuando se usa touch
      const touch = e.touches[0];
      handleStart(touch.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!trackTouch || !isTracking) return;
      e.preventDefault(); // Siempre prevenir el comportamiento por defecto en move
      const touch = e.touches[0];
      handleMove(touch.clientX);
    };

    const handleTouchEnd = () => {
      if (!trackTouch) return;
      handleEnd();
    };    // Mouse events
    const handleMouseDown = (e: MouseEvent) => {
      if (!trackMouse) return;
      // Solo permitir el botón izquierdo del mouse
      if (e.button !== 0) return;
      e.preventDefault();
      handleStart(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!trackMouse || !isTracking) return;
      e.preventDefault();
      handleMove(e.clientX);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!trackMouse) return;
      e.preventDefault();
      handleEnd();
    };    const handleMouseLeave = () => {
      if (!trackMouse) return;
      reset();
    };    // Add event listeners
    if (trackTouch) {
      element.addEventListener('touchstart', handleTouchStart, { passive: false });
      element.addEventListener('touchmove', handleTouchMove, { passive: false });
      element.addEventListener('touchend', handleTouchEnd, { passive: false });
    }

    if (trackMouse) {
      element.addEventListener('mousedown', handleMouseDown, { passive: false });
      element.addEventListener('mousemove', handleMouseMove, { passive: false });
      element.addEventListener('mouseup', handleMouseUp, { passive: false });
      element.addEventListener('mouseleave', handleMouseLeave);
      // Prevenir el comportamiento de arrastre por defecto
      element.addEventListener('dragstart', (e) => e.preventDefault());
    }    return () => {
      if (trackTouch) {
        element.removeEventListener('touchstart', handleTouchStart);
        element.removeEventListener('touchmove', handleTouchMove);
        element.removeEventListener('touchend', handleTouchEnd);
      }

      if (trackMouse) {
        element.removeEventListener('mousedown', handleMouseDown);
        element.removeEventListener('mousemove', handleMouseMove);
        element.removeEventListener('mouseup', handleMouseUp);
        element.removeEventListener('mouseleave', handleMouseLeave);
        element.removeEventListener('dragstart', (e) => e.preventDefault());
      }
    };
  }, [isTracking, isVisualTracking, startX, currentX, threshold, trackTouch, trackMouse, preventDefaultTouchmoveEvent, trackingDelay, minDragDistance, handlers]);
  const swipeOffset = isVisualTracking ? currentX - startX : 0; // Solo mostrar offset cuando está en tracking visual

  return {
    ref: elementRef,
    isTracking: isVisualTracking, // Retornar el tracking visual en lugar del tracking interno
    swipeOffset,
    reset
  };
};
