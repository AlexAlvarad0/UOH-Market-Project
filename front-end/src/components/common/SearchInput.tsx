import React, { useState, KeyboardEvent, FormEvent } from 'react';
import '../../styles/search.css';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    if (onChange) {
      onChange(e);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(value !== undefined ? value : searchValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form className="search-group" onSubmit={handleSubmit}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
        <g>
          <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
        </g>
      </svg>
      <input 
        className="search-input" 
        type="search" 
        placeholder={placeholder} 
        value={value !== undefined ? value : searchValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
      />
    </form>
  );
};

export default SearchInput;
