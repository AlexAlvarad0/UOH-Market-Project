import React, { useState, useEffect, useRef, KeyboardEvent, FormEvent } from 'react';
import '../../styles/search.css';
import { SearchService } from '../../services/searchService';

// Iconos para el historial y sugerencias
import { 
  History as HistoryIcon, 
  Search as SearchIcon, 
  Close as CloseIcon,
  DeleteForever as DeleteForeverIcon 
} from '@mui/icons-material';

interface SearchInputProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ 
  placeholder = "Buscar productos...", 
  onSearch, 
  value = "", 
  onChange 
}) => {
  const [searchValue, setSearchValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  // Estilos para quitar la X del navegador y redondear esquinas
  const searchInputStyles = {
    borderRadius: '20px', // Consistente con CSS
    WebkitAppearance: 'none' as const,
    MozAppearance: 'none' as const,
    appearance: 'none' as const
  };

  // Añadir estilos globales para quitar completamente la X del navegador
  useEffect(() => {
    const globalSearchStyles = `
      .search-input::-webkit-search-cancel-button,
      .search-input::-webkit-search-decoration {
        -webkit-appearance: none;
        appearance: none;
      }
      .search-input::-moz-search-cancel-button {
        -moz-appearance: none;
        appearance: none;
      }
      .search-group {
        border-radius: 20px;
      }
    `;

    const style = document.createElement('style');
    style.textContent = globalSearchStyles;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Cargar historial al montar
  useEffect(() => {
    const history = SearchService.getSearchHistory();
    setSearchHistory(history);
  }, []);

  // Función para obtener sugerencias cuando el usuario escribe
  useEffect(() => {
    const currentValue = value !== undefined ? value : searchValue;
    if (!currentValue || currentValue.length < 2) {
      setSuggestions([]);
      return;
    }

    const debounce = setTimeout(async () => {
      const newSuggestions = await SearchService.getSuggestions(currentValue);
      setSuggestions(newSuggestions);
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchValue, value]);

  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Determinar si se debe mostrar el dropdown
  useEffect(() => {
    const shouldOpen = isFocused && (searchHistory.length > 0 || suggestions.length > 0);
    setIsOpen(shouldOpen);
  }, [isFocused, searchHistory, suggestions, searchValue, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (onChange) {
      onChange(e);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const currentValue = value !== undefined ? value : searchValue;
    
    if (currentValue.trim() && onSearch) {
      // Añadir al historial
      const updatedHistory = SearchService.addToSearchHistory(currentValue);
      setSearchHistory(updatedHistory);
      
      // Ejecutar búsqueda
      onSearch(currentValue);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleItemClick = (item: string) => {
    // Actualizar valor de búsqueda
    setSearchValue(item);
    if (onChange) {
      const event = { target: { value: item } } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    } else if (value !== undefined) {
      // Si hay un value controlado pero no hay onChange, actualizar el valor local
      setSearchValue(item);
    }
    
    // Añadir al historial y ejecutar búsqueda
    const updatedHistory = SearchService.addToSearchHistory(item);
    setSearchHistory(updatedHistory);
    
    if (onSearch) {
      onSearch(item);
    }
    setIsOpen(false);
  };

  const handleClearInput = () => {
    setSearchValue('');
    if (onChange) {
      const event = { target: { value: '' } } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    SearchService.clearSearchHistory();
    setSearchHistory([]);
  };

  const handleRemoveHistoryItem = (e: React.MouseEvent, item: string) => {
    e.stopPropagation();
    const updatedHistory = SearchService.removeFromSearchHistory(item);
    setSearchHistory(updatedHistory);
  };

  return (
    <div className="search-group" ref={searchRef}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
        <g>
          <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
        </g>
      </svg>
      
      <form onSubmit={handleSubmit} style={{ width: '100%', borderRadius: '10px' }}>
        <input 
          className="search-input" 
          type="search" 
          placeholder={placeholder} 
          value={value !== undefined ? value : searchValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          style={searchInputStyles}
        />
        {/* Botón para limpiar el texto de búsqueda */}
        {(value !== undefined ? value : searchValue).trim() && (
          <button 
            type="button"
            className="search-clear-button"
            onClick={handleClearInput}
            title="Limpiar búsqueda"
          >
            <CloseIcon fontSize="small" />
          </button>
        )}
      </form>

      {/* Dropdown de historial y sugerencias */}
      {isOpen && (
        <div className="search-dropdown">
          {/* Sección de historial */}
          {searchHistory.length > 0 && (
            <div className="search-dropdown-section">
              <div className="search-dropdown-header">
                <span>Búsquedas recientes</span>
                <button 
                  className="search-dropdown-clear"
                  onClick={handleClearHistory}
                  title="Borrar todo"
                >
                  <DeleteForeverIcon fontSize="small" />
                </button>
              </div>
              {searchHistory.map((item, index) => (
                <div 
                  key={`history-${index}`} 
                  className="search-dropdown-item"
                  onClick={() => handleItemClick(item)}
                >
                  <HistoryIcon fontSize="small" className="search-dropdown-item-icon" />
                  <span className="search-dropdown-item-text">{item}</span>
                  <CloseIcon 
                    fontSize="small" 
                    onClick={(e) => handleRemoveHistoryItem(e, item)}
                    style={{ cursor: 'pointer', fontSize: '16px', color: '#777', marginLeft: '8px' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Separador entre secciones si ambas existen */}
          {searchHistory.length > 0 && suggestions.length > 0 && (
            <div className="search-dropdown-divider" />
          )}

          {/* Sección de sugerencias */}
          {suggestions.length > 0 && (
            <div className="search-dropdown-section">
              <div className="search-dropdown-header">
                <span>Sugerencias</span>
              </div>
              {suggestions.map((item, index) => (
                <div 
                  key={`suggestion-${index}`} 
                  className="search-dropdown-item"
                  onClick={() => handleItemClick(item)}
                >
                  <SearchIcon fontSize="small" className="search-dropdown-item-icon" />
                  <span className="search-dropdown-item-text">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchInput;