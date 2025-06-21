import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Container, Typography, Box, CircularProgress, Alert, 
  Pagination, FormControl, InputLabel, Select, MenuItem,
  Dialog, DialogTitle, DialogContent,
  DialogActions, Button as MuiButton, Chip, IconButton,
  GlobalStyles,
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import { useAuth } from '../hooks/useAuth.hooks';
import ProductList from '../components/ProductList';
import OffersCarousel from '../components/OffersCarousel';
import BreadcrumbNav from '../components/BreadcrumbNav';
import api from '../services/api';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { styled } from '@mui/material/styles';
import { formatPrice } from '../utils/formatPrice';
import { Product } from '../types/products';
import CategoryIcon from '../components/CategoryIcon';
import ScrollToTopButton from '../components/buttons/ScrollToTopButton';
import Squares from '../../y/Squares/Squares';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

const SliderRoot = styled(SliderPrimitive.Root)(() => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  userSelect: 'none',
  touchAction: 'none',
  width: '100%',
  height: 20,
}));

const SliderTrack = styled(SliderPrimitive.Track)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'light' ? theme.palette.grey[200] : theme.palette.grey[800],
  position: 'relative',
  flexGrow: 1,
  borderRadius: '9999px',
  height: 4,
}));

const SliderRange = styled(SliderPrimitive.Range)(() => ({
  position: 'absolute',
  backgroundColor: '#004f9e',
  borderRadius: '9999px',
  height: '100%',
}));

const SliderThumb = styled(SliderPrimitive.Thumb)(() => ({
  display: 'block',
  width: 16,
  height: 16,
  backgroundColor: 'white',
  boxShadow: `0 2px 4px rgba(0,0,0,0.2)`,
  borderRadius: '9999px',
  border: `2px solid #004f9e`,
  transition: 'background-color 120ms, box-shadow 120ms',
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 4px rgba(0, 79, 158, 0.2)`,
  },
}));

interface ShadcnSliderProps {
  value: number[];
  onChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  onValueCommit: (value: number[]) => void;
}

const ShadcnSlider = ({ value, onChange, min, max, step, onValueCommit }: ShadcnSliderProps) => (
  <SliderRoot
    value={value}
    onValueChange={onChange}
    onValueCommit={onValueCommit}
    min={min}
    max={max}
    step={step}
  >
    <SliderTrack>
      <SliderRange />
    </SliderTrack>
    <SliderThumb />
    <SliderThumb />
  </SliderRoot>
);

const HomePage = () => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [page, setPage] = useState(1);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    search: new URLSearchParams(location.search).get('search') || '',
    category: new URLSearchParams(location.search).get('category') || '',
    min_price: 0,
    max_price: 1000000,
    condition: '',
    ordering: '-created_at'
  });
  const [tempFilters, setTempFilters] = useState({
    category: '',
    condition: '',
    ordering: '-created_at',
    min_price: 0,
    max_price: 1000000
  });
  const [tempPriceRange, setTempPriceRange] = useState([0, 1000000]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [categories, setCategories] = useState<Array<{id: number, name: string}>>([]);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [maxPriceInitialized, setMaxPriceInitialized] = useState(false);

  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const isSm = useMediaQuery(theme.breakpoints.up('sm'));
  useEffect(() => {
    const getItemsPerRow = () => {
      if (isXl) return 5;
      if (isLg) return 4;
      if (isMd) return 3;
      if (isSm) return 2;
      return 2; // xs
    };
    const itemsPerRow = getItemsPerRow();
    setPageSize(itemsPerRow * 4);
  }, [isXl, isLg, isMd, isSm]);

  // Función para obtener el número de elementos por fila
  const getItemsPerRow = () => {
    if (isXl) return 5;
    if (isLg) return 4;
    if (isMd) return 3;
    if (isSm) return 2;
    return 2; // xs
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchParam = searchParams.get('search');
    const categoryParam = searchParams.get('category');
    
    const updatedFilters = { ...filters };
    let filtersChanged = false;
    
    if (searchParam !== null) {
      updatedFilters.search = searchParam;
      filtersChanged = true;
    } else if (filters.search) {
      updatedFilters.search = '';
      filtersChanged = true;
    }
    
    if (categoryParam !== null) {
      updatedFilters.category = categoryParam;
      filtersChanged = true;
    } else if (filters.category) {
      updatedFilters.category = '';
      filtersChanged = true;
    }
    
    if (filtersChanged) {
      setFilters(updatedFilters);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  useEffect(() => {
    const fetchCategories = async () => {      try {
        const response = await api.getCategories();
        if (Array.isArray(response.data)) {
          setCategories(response.data);
        } else if (response.data && Array.isArray(response.data.results)) {
          setCategories(response.data.results);        } else {
          setCategories([]);
        }
      } catch {
        setCategories([]);
      }
    };

    const initializeMaxPrice = async () => {
      if (!maxPriceInitialized) {
        try {
          // Obtener TODOS los productos sin filtros para establecer el precio máximo
          const response = await api.getProducts({
            page: 1,
            search: '',
            category: '',
            min_price: 0,
            max_price: 999999999,
            condition: '',
            ordering: '-created_at'
          });
          
          if (response.success && response.data) {
            const productData = response.data.results || response.data;
            if (Array.isArray(productData) && productData.length > 0) {
              const foundMaxPrice = productData.reduce((acc, prod) => Math.max(acc, prod.price), 0);
              setMaxPrice(foundMaxPrice);
              setTempPriceRange([0, foundMaxPrice]);
              setFilters(prev => ({ ...prev, max_price: foundMaxPrice }));            }          }
        } catch {
          // Error initializing max price
        } finally {
          setMaxPriceInitialized(true);
        }
      }
    };

    fetchCategories();
    initializeMaxPrice();
  }, [maxPriceInitialized]);
  useEffect(() => {
    const getProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.getProducts({
          page,
          page_size: pageSize,
          search: filters.search,
          category: filters.category,
          min_price: filters.min_price,
          max_price: filters.max_price,
          condition: filters.condition,
          ordering: filters.ordering        });
        
        if (response.success && response.data) {
          const productData = response.data.results || response.data;
          const totalCount = response.data.count || productData.length;
          
          setProducts(Array.isArray(productData) ? productData : []);
          setTotalPages(Math.ceil(totalCount / pageSize));
          // Removed: const foundMaxPrice = productData.reduce((acc, prod) => Math.max(acc, prod.price), 0);
          // Removed: setMaxPrice(foundMaxPrice);
        } else {
          setError("No se pudieron cargar los productos.");          setProducts([]);
          setTotalPages(1);
        }      } catch {
        setError("No se pudieron cargar los productos. Por favor, inténtelo de nuevo más tarde.");
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    if (pageSize > 0) {
      getProducts();
    }
  }, [page, filters, pageSize]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo(0, 0);
  };
  const handleFavoriteClick = async (productId: number) => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      const productIndex = products.findIndex(p => p.id === productId);
      const isFavorite = products[productIndex]?.is_favorite;
      
      if (isFavorite) {
        await api.removeFromFavorites(productId);
        // Disparar evento personalizado para notificar que se eliminó un favorito
        window.dispatchEvent(new CustomEvent('favoriteRemoved', { detail: { productId } }));
      } else {
        await api.addToFavorites(productId);
        // Disparar evento personalizado para notificar que se agregó un favorito
        window.dispatchEvent(new CustomEvent('favoriteAdded', { detail: { productId } }));
      }
      
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, is_favorite: !product.is_favorite } 
            : product
        )
      );    } catch {
      // Error handling for favorite toggle
    }
  };
  const handleOpenFilterDialog = () => {
    setTempFilters({
      category: filters.category,
      condition: filters.condition,
      ordering: filters.ordering,
      min_price: filters.min_price,
      max_price: filters.max_price
    });
    setTempPriceRange([filters.min_price, filters.max_price]);
    setFilterDialogOpen(true);
  };

  const handleCloseFilterDialog = () => {
    setFilterDialogOpen(false);
  };

  const handleTempFilterChange = (name: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleTempPriceRangeChange = (newValue: number[]) => {
    setTempPriceRange(newValue);
  };
  const applyFiltersAndClose = () => {
    setFilters({
      ...filters,
      ...tempFilters,
      min_price: tempPriceRange[0],
      max_price: tempPriceRange[1]
    });
    setPage(1);
    setFilterDialogOpen(false);
  };  const clearFilters = () => {
    const clearedFilters = {
      search: '', // Ahora también limpiamos la búsqueda
      category: '',
      min_price: 0,
      max_price: maxPrice,
      condition: '',
      ordering: '-created_at'
    };
    
    setFilters(clearedFilters);
    setTempFilters({
      category: '',
      condition: '',
      ordering: '-created_at',
      min_price: 0,
      max_price: maxPrice
    });
    setTempPriceRange([0, maxPrice]);
    setPage(1);
    setFilterDialogOpen(false);
  };
  const removeFilter = (filterType: string) => {
    const updatedFilters = { ...filters };
    
    switch (filterType) {
      case 'search':
        updatedFilters.search = '';
        break;
      case 'category':
        updatedFilters.category = '';
        break;
      case 'condition':
        updatedFilters.condition = '';
        break;
      case 'price':
        updatedFilters.min_price = 0;
        updatedFilters.max_price = maxPrice;
        break;
      case 'ordering':
        updatedFilters.ordering = '-created_at';
        break;
    }
    
    setFilters(updatedFilters);
    setPage(1);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(cat => cat.id.toString() === categoryId);
    return category ? category.name : '';
  };
  
  const getConditionName = (condition: string) => {
    const conditionMap: { [key: string]: string } = {
      'new': 'Nuevo',
      'like_new': 'Como nuevo',
      'good': 'Buen estado',
      'fair': 'Estado aceptable',
      'poor': 'Deteriorado'
    };
    return conditionMap[condition] || condition;
  };

  const getOrderingName = (ordering: string) => {
    const orderingMap: { [key: string]: string } = {
      '-created_at': 'Más recientes',
      'price': 'Precio: menor a mayor',
      '-price': 'Precio: mayor a menor',
      '-views_count': 'Más vistos'
    };
    return orderingMap[ordering] || ordering;
  };  return (
    <>
      <GlobalStyles        styles={{
          'body': {
            backgroundColor: '#ffffff !important',
            margin: 0,
            padding: 0,
          },
          'html': {
            backgroundColor: '#ffffff !important',
          },
          '#root': {
            backgroundColor: 'transparent !important',
          }
        }}
      />
      {/* Fondo animado con Squares */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 0,
          pointerEvents: 'none',
          backgroundColor: '#ffffff !important', // Fondo blanco base
        }}
      >        <Squares
          speed={0.5}
          squareSize={40}
          direction="diagonal"
          borderColor="rgba(0, 79, 158, 0.2)"
          hoverFillColor="rgba(0, 79, 158, 0.05)"
        />
      </Box>
        <Container 
        maxWidth="xl" 
        sx={{ 
          py: { xs: 0, sm: 1 },
          px: { xs: 2, sm: 3, md: 4 },
          mt: { xs: 0, sm: 1 },          
          position: 'relative',
          zIndex: 10,
          backgroundColor: 'transparent !important',
          minHeight: '100vh',
          borderRadius: '8px',
          boxShadow: 'none',
        }}
      >
      <BreadcrumbNav items={[]} />      <Box sx={{ 
        width: '100%',
        mt: 0,
        mb: 4
      }}>
        <OffersCarousel 
          isVisible={(() => {
            // El carrusel se muestra solo cuando no hay filtros activos
            const hasActiveFilters = 
              filters.search !== '' || 
              filters.category !== '' || 
              filters.condition !== '' ||
              filters.min_price > 0 ||
              filters.ordering !== '-created_at';            
            const isCarouselVisible = !hasActiveFilters;
            
            return isCarouselVisible;
          })()} 
        />
      </Box>

      <Typography 
        variant="h4" 
        component="h1" 
        gutterBottom
        sx={{ 
          mt: 4, 
          mb: 4, 
          fontWeight: 600 
        }}
      >
        Productos disponibles
      </Typography>      <Box sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexDirection: 'row',
        my: 1,
        mb: 3,
        flexWrap: 'nowrap',
        overflow: 'hidden'
      }}>
        <MuiButton 
          startIcon={<FilterAltIcon />} 
          variant="contained"
          onClick={handleOpenFilterDialog}
          sx={{ 
            mr: 1,
            bgcolor: '#004f9e',
            '&:hover': {
              bgcolor: '#003b7a'
            },
            minWidth: { xs: 'auto', md: '120px' },
            flexShrink: 0
          }}
        >
          Filtros
        </MuiButton>
          {(filters.search || filters.category || filters.condition || filters.min_price > 0 || filters.max_price < maxPrice || filters.ordering !== '-created_at') && (
          <IconButton 
            onClick={clearFilters}
            sx={{ 
              mr: 1,
              color: '#ff6b6b',
              '&:hover': {
                backgroundColor: 'rgba(255, 107, 107, 0.04)',
              },
              flexShrink: 0
            }}
            title="Limpiar todos los filtros"
          >
            <CleaningServicesIcon />
          </IconButton>
        )}
      </Box>      {/* Pills de filtros activos */}
      {(filters.search || filters.category || filters.condition || filters.min_price > 0 || filters.max_price < maxPrice || filters.ordering !== '-created_at') && (
        <Box sx={{ 
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2
        }}>
          {filters.search && (
            <Chip
              label={`Búsqueda: "${filters.search}"`}
              onDelete={() => removeFilter('search')}
              color="primary"
              variant="outlined"
              size="medium"
              sx={{
                transform: { xs: 'scale(1)', md: 'scale(1.25)' },
                transformOrigin: 'left center'
              }}
            />
          )}
          
          {filters.category && (
            <Chip
              label={`Categoría: ${getCategoryName(filters.category)}`}
              onDelete={() => removeFilter('category')}
              color="primary"
              variant="outlined"
              size="medium"
              sx={{
                transform: { xs: 'scale(1)', md: 'scale(1.2)' },
                transformOrigin: 'left center'
              }}
            />
          )}
          
          {filters.condition && (
            <Chip
              label={`Condición: ${getConditionName(filters.condition)}`}
              onDelete={() => removeFilter('condition')}
              color="primary"
              variant="outlined"
              size="medium"
              sx={{
                transform: { xs: 'scale(1)', md: 'scale(1.2)' },
                transformOrigin: 'left center'
              }}
            />
          )}
          
          {(filters.min_price > 0 || filters.max_price < maxPrice) && (
            <Chip
              label={`Precio: ${formatPrice(filters.min_price)} - ${formatPrice(filters.max_price)}`}
              onDelete={() => removeFilter('price')}
              color="primary"
              variant="outlined"
              size="medium"
              sx={{
                transform: { xs: 'scale(1)', md: 'scale(1.2)' },
                transformOrigin: 'left center'
              }}
            />
          )}
          
          {filters.ordering !== '-created_at' && (
            <Chip
              label={`Orden: ${getOrderingName(filters.ordering)}`}
              onDelete={() => removeFilter('ordering')}
              color="primary"
              variant="outlined"
              size="medium"
              sx={{
                transform: { xs: 'scale(1)', md: 'scale(1.2)' },
                transformOrigin: 'left center'
              }}
            />
          )}
        </Box>
      )}

      <Dialog 
        open={filterDialogOpen} 
        onClose={handleCloseFilterDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle 
          sx={{ 
            bgcolor: '#004f9e', 
            color: 'white',
            fontWeight: 'bold',
            py: 1
          }}
        >
          Filtros
        </DialogTitle>        <DialogContent 
          dividers={false} 
          sx={{ 
            p: 2,
            pt: 3, // Agregar padding top para separar del borde azul
            borderTop: 'none',
            '& .MuiDialogContent-dividers': {
              borderTop: 'none',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
            }
          }}
        >          <Box sx={{ gridColumn: 'span 12' }}>
            <FormControl 
              fullWidth 
              size="small"
              sx={{ 
                mb: 1.5,
                mt: 1, // Agregar margen superior para separar del borde
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#004f9e',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#004f9e',
                }
              }}
            >
              <InputLabel>Categoría</InputLabel>
              <Select
                value={tempFilters.category}
                label="Categoría"
                onChange={(e) => handleTempFilterChange('category', e.target.value)}
                MenuProps={{ 
                  PaperProps: { 
                    sx: { 
                      maxHeight: 300,
                      width: 'auto',
                    } 
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                }}
                sx={{
                  '& .MuiSelect-select': {
                    width: '100%',
                  }
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                {Array.isArray(categories) ? (
                  categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <CategoryIcon name={cat.name} fontSize="small" sx={{ mr: 1 }} />
                        {cat.name}
                      </Box>
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="">Error cargando categorías</MenuItem>
                )}
              </Select>
            </FormControl>
          
            <FormControl 
              fullWidth 
              size="small"
              sx={{ 
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#004f9e',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#004f9e',
                }
              }}
            >
              <InputLabel>Condición</InputLabel>
              <Select
                value={tempFilters.condition}
                label="Condición"
                onChange={(e) => handleTempFilterChange('condition', e.target.value)}
                MenuProps={{ 
                  PaperProps: { 
                    sx: { 
                      maxHeight: 300,
                      width: 'auto'
                    } 
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                }}
                sx={{
                  '& .MuiSelect-select': {
                    width: '100%',
                  }
                }}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="new">Nuevo</MenuItem>
                <MenuItem value="like_new">Como nuevo</MenuItem>
                <MenuItem value="good">Buen estado</MenuItem>
                <MenuItem value="fair">Estado aceptable</MenuItem>
                <MenuItem value="poor">Deteriorado</MenuItem>
              </Select>
            </FormControl>
          
            <FormControl 
              fullWidth 
              size="small"
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  '&.Mui-focused fieldset': {
                    borderColor: '#004f9e',
                  },
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#004f9e',
                }
              }}
            >
              <InputLabel>Ordenar por</InputLabel>
              <Select
                value={tempFilters.ordering}
                label="Ordenar por"
                onChange={(e) => handleTempFilterChange('ordering', e.target.value)}
                MenuProps={{ 
                  PaperProps: { 
                    sx: { 
                      maxHeight: 300,
                      width: 'auto'
                    } 
                  },
                  anchorOrigin: {
                    vertical: 'bottom',
                    horizontal: 'left',
                  },
                  transformOrigin: {
                    vertical: 'top',
                    horizontal: 'left',
                  },
                }}
                sx={{
                  '& .MuiSelect-select': {
                    width: '100%',
                  }
                }}
              >
                <MenuItem value="-created_at">Más recientes</MenuItem>
                <MenuItem value="price">Precio: menor a mayor</MenuItem>
                <MenuItem value="-price">Precio: mayor a menor</MenuItem>
                <MenuItem value="-views_count">Más vistos</MenuItem>
              </Select>
            </FormControl>
            <Typography sx={{ fontWeight: 500, mb: 1 }}>Rango de precios</Typography>
            <Box sx={{ px: 0.5 }}>
              <ShadcnSlider
                value={tempPriceRange}
                onChange={handleTempPriceRangeChange}
                onValueCommit={handleTempPriceRangeChange}
                min={0}
                max={maxPrice}
                step={1}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2">{formatPrice(tempPriceRange[0])}</Typography>
                <Typography variant="body2">{formatPrice(tempPriceRange[1])}</Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <MuiButton 
            onClick={handleCloseFilterDialog}
            sx={{ 
              color: '#004f9e',
              borderColor: '#004f9e',
              '&:hover': {
                borderColor: '#003b7a',
                backgroundColor: 'rgba(0, 79, 158, 0.04)',
              }
            }}
          >
            Cancelar
          </MuiButton>
          <MuiButton 
            onClick={applyFiltersAndClose} 
            variant="contained" 
            sx={{ 
              bgcolor: '#004f9e',
              '&:hover': {
                bgcolor: '#003b7a',
              }
            }}
          >
            Aplicar filtros
          </MuiButton>
        </DialogActions>
      </Dialog>

      {error ? (
        <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>
      ) : loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : products.length > 0 ? (
        <>          <ProductList 
            products={products} 
            onFavoriteClick={handleFavoriteClick}
            isLoading={loading}
            itemsPerRow={getItemsPerRow()}
            uniformSize={true}
            cardHeight={400}
            imageHeight={220}
          />
          <Box sx={{ 
            mt: 2, 
            mb: 2,
            display: 'flex', 
            justifyContent: 'center' 
          }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              shape='rounded'
              variant='outlined'
              onChange={handlePageChange} 
              color="primary" 
              size="medium"
              siblingCount={0}
              boundaryCount={1}
            />
          </Box>
        </>
      ) : (        <Alert severity="info" sx={{ my: 2 }}>
          No se encontraron productos que coincidan con los filtros seleccionados.
        </Alert>
      )}      {/* Botón Scroll to Top */}
      <ScrollToTopButton showAfter={400} />
    </Container>
    </>
  );
};

export default HomePage;
