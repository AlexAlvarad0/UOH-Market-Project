import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

interface ScrollToTopButtonProps {
  showAfter?: number; // Píxeles después de los cuales mostrar el botón
}

const ScrollToTopButton: React.FC<ScrollToTopButtonProps> = ({ showAfter = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Función para hacer scroll hacia arriba con animación suave
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Detectar cuando mostrar/ocultar el botón
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > showAfter) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, [showAfter]);

  return (
    <StyledWrapper isVisible={isVisible}>
      <button className="button" onClick={scrollToTop} aria-label="Arriba">
        <svg className="svg" xmlns="http://www.w3.org/2000/svg" height="25px" viewBox="0 -960 960 960" width="25px" fill="#000000">
          <path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z" />
        </svg>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div<{ isVisible: boolean }>`
  position: fixed;
  bottom: 10px;
  right: 30px;
  z-index: 1000;
  opacity: ${props => props.isVisible ? 1 : 0};
  visibility: ${props => props.isVisible ? 'visible' : 'hidden'};
  transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;

  .button {
    height: 50px;
    width: 50px;
    cursor: pointer;
    padding: 10px;
    border-radius: 50%;
    background-color: white;
    border: 2px solid #004f9e;
    box-shadow: 0 4px 12px rgba(0, 79, 158, 0.3);
    display: flex;
    position: relative;
    transition: all 0.3s ease;
    justify-content: center;
    align-items: center;
  }
    .button::after {
    content: "Arriba";
    position: absolute;
    width: auto;
    background-color: #004f9e;
    color: white;
    font-size: 0.8em;
    font-weight: 500;
    box-sizing: border-box;
    padding: 6px 12px;
    border-radius: 20px;
    bottom: 60px;
    left: 50%;
    transform: translateX(-50%) scale(0);
    box-shadow: 0 2px 8px rgba(0, 79, 158, 0.3);
    transition: all 0.3s ease;
    white-space: nowrap;
  }
  
  .svg {
    transition: all 0.3s ease;
  }
  
  .button:hover {
    transform: translateY(-3px);
    background-color: #004f9e;
    box-shadow: 0 6px 20px rgba(0, 79, 158, 0.4);
  }
  
  .button:hover .svg {
    fill: white;
    transform: scale(1.2);
  }
  
  .button:hover::after {
    transform: translateX(-50%) scale(1);
  }
  
  .button:active {
    transform: translateY(-1px);
  }
  /* Responsive adjustments */
  @media (max-width: 768px) {
    bottom: 80px; /* Más espacio en móvil para evitar conflictos con navegación */
    right: 15px;
    
    .button {
      height: 45px;
      width: 45px;
    }
    
    .button::after {
      font-size: 0.7em;
      padding: 5px 10px;
    }
  }
`;

export default ScrollToTopButton;
