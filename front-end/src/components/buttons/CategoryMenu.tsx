import React, { useState, useEffect, useRef, MouseEventHandler, UIEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/burguer.css';
import api from '../../services/api';
import { Box, Typography, Popover } from '@mui/material';
import Checkbox from './Checkbox';
import { motion, useInView } from "framer-motion";
import '../../styles/scroll.css';

interface Category {
  id: number;
  name: string;
}

// Componente para cada item animado
const AnimatedCategoryItem = ({ 
  children, 
  index,
  onMouseEnter,
  onClick 
}: { 
  children: React.ReactNode; 
  index: number;
  onMouseEnter?: MouseEventHandler<HTMLDivElement>;
  onClick?: MouseEventHandler<HTMLDivElement>;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.2, delay: 0.1 }}
      style={{ marginBottom: "1rem", cursor: "pointer" }}
    >
      {children}
    </motion.div>
  );
};

const CategoryMenu = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);
  
  // Estados para la animación de la lista
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);
  
  useEffect(() => {
    const getCategories = async () => {
      try {
        setLoading(true);
        const response = await api.getCategories();
        
        let categoryData = [];
        // Handle different response formats
        if (Array.isArray(response.data)) {
          categoryData = response.data;
        } else if (response.data && Array.isArray(response.data.results)) {
          categoryData = response.data.results;
        } else {
          console.error("Categories data is not an array:", response.data);
          categoryData = []; 
        }
        
        // Ordenar categorías alfabéticamente
        const sortedCategories = [...categoryData].sort((a, b) => 
          a.name.localeCompare(b.name, 'es', {sensitivity: 'base'})
        );
        
        setCategories(sortedCategories);
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    getCategories();
  }, []);

  useEffect(() => {
    // Navegación con teclado
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, categories.length));
      } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        if (selectedIndex >= 0) {
          e.preventDefault();
          if (selectedIndex === 0) {
            handleAllCategories();
          } else if (selectedIndex <= categories.length) {
            handleCategoryClick(categories[selectedIndex - 1].id);
          }
        }
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, categories]);

  // Scroll automático al elemento seleccionado
  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const selectedItem = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    
    if (selectedItem) {
      const extraMargin = 50;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      const itemTop = selectedItem.offsetTop;
      const itemBottom = itemTop + selectedItem.offsetHeight;
      
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: "smooth" });
      } else if (
        itemBottom >
        containerScrollTop + containerHeight - extraMargin
      ) {
        container.scrollTo({
          top: itemBottom - containerHeight + extraMargin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(e.target.checked);
    if (e.target.checked && menuRef.current) {
      setAnchorEl(menuRef.current);
      setSelectedIndex(-1); // Reset selection when opening
    } else {
      setAnchorEl(null);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (checkboxRef.current) {
      checkboxRef.current.checked = false;
    }
    setAnchorEl(null);
  };

  const handleCategoryClick = (categoryId: number) => {
    navigate(`/?category=${categoryId}`);
    handleClose();
  };

  const handleAllCategories = () => {
    navigate('/');
    handleClose();
  };

  return (
    <Box ref={menuRef} sx={{ 
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      height: '100%',
    }}>
      <label className="hamburger" htmlFor="category-hamburger">
        <input 
          type="checkbox" 
          id="category-hamburger" 
          ref={checkboxRef}
          onChange={handleCheckboxChange} 
        />
        <svg viewBox="0 0 32 32">
          <path className="line line-top-bottom" d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22" />
          <path className="line" d="M7 16 27 16" />
        </svg>
      </label>
      
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 250,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            mt: 1,
            overflow: 'hidden',
            bgcolor: 'white',
            border: 'none' // Asegurarse de que no haya bordes
          },
          '& .MuiPopover-paper': {
            borderTop: 'none' // Específicamente quitar el borde superior
          }
        }}
      >
        <Typography sx={{ p: 2, fontWeight: 'bold', borderBottom: '1px solid #eee', color: 'black' }}>
          Categorías
        </Typography>
        
        <div className="scroll-list-container">
          {loading ? (
            <Typography sx={{ p: 2, color: 'black' }}>Cargando...</Typography>
          ) : (
            <div className="relative">
              <div
                ref={listRef}
                className="scroll-list no-scrollbar"
                onScroll={handleScroll}
              >
                {/* Elemento "Todas las categorías" */}
                <AnimatedCategoryItem
                  index={0}
                  onMouseEnter={() => setSelectedIndex(0)}
                  onClick={handleAllCategories}
                >
                  <div className={`item ${selectedIndex === 0 ? "selected" : ""}`}>
                    <p className="item-text">Todas las categorías</p>
                  </div>
                </AnimatedCategoryItem>
                
                {/* Lista de categorías */}
                {categories.map((category, idx) => (
                  <AnimatedCategoryItem
                    key={category.id}
                    index={idx + 1}
                    onMouseEnter={() => setSelectedIndex(idx + 1)}
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className={`item ${selectedIndex === idx + 1 ? "selected" : ""}`}>
                      <p className="item-text">{category.name}</p>
                    </div>
                  </AnimatedCategoryItem>
                ))}
              </div>
              
              {/* Gradientes superior e inferior */}
              <div className="top-gradient" style={{ opacity: topGradientOpacity }}></div>
              <div className="bottom-gradient" style={{ opacity: bottomGradientOpacity }}></div>
            </div>
          )}
        </div>
      </Popover>
    </Box>
  );
};

export default CategoryMenu;
