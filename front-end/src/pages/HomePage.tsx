import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Container, Typography, Box, CircularProgress, Alert, 
  Pagination, FormControl, InputLabel, Select, MenuItem,
  Grid, Dialog, DialogTitle, DialogContent,
  DialogActions, Button as MuiButton, 
} from '@mui/material';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { useAuth } from '../hooks/useAuth';
import ProductList from '../components/ProductList';
import OffersCarousel from '../components/OffersCarousel';
import BreadcrumbNav from '../components/BreadcrumbNav';
import api from '../services/api';
// Para implementar Slider de shadcn/ui
import * as SliderPrimitive from '@radix-ui/react-slider';
import { styled } from '@mui/material/styles';
import { formatPrice } from '../utils/formatPrice';

// Slider de shadcn/ui adaptado para Material UI
const SliderRoot = styled(SliderPrimitive.Root)(({ theme }) => ({
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

const SliderRange = styled(SliderPrimitive.Range)(({ theme }) => ({
  position: 'absolute',
  backgroundColor: '#004f9e',
  borderRadius: '9999px',
  height: '100%',
}));

const SliderThumb = styled(SliderPrimitive.Thumb)(({ theme }) => ({
  display: 'block',
  width: 16,
  height: 16,
  backgroundColor: 'white',
  boxShadow: `0 2px 4px ${theme.palette.mode === 'light' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)'}`,
  borderRadius: '9999px',
  border: `2px solid #004f9e`,
  transition: 'background-color 120ms, box-shadow 120ms',
  '&:focus': {
    outline: 'none',
    boxShadow: `0 0 0 4px rgba(0, 79, 158, 0.2)`,
  },
}));

const ShadcnSlider = ({ value, onChange, min, max, step, onValueCommit }) => (
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
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<Array<{id: number, name: string}>>([]);
  const [priceRange, setPriceRange] = useState([0, 1000000]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchParam = searchParams.get('search');
    const categoryParam = searchParams.get('category');
    
    let updatedFilters = { ...filters };
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
  }, [location.search]);

  useEffect(() => {
    const getCategories = async () => {
      try {
        const response = await api.getCategories();
        if (Array.isArray(response.data)) {
          setCategories(response.data);
        } else if (response.data && Array.isArray(response.data.results)) {
          setCategories(response.data.results);
        } else {
          console.error("Categories data is not an array:", response.data);
          setCategories([]);
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
        setCategories([]);
      }
    };

    getCategories();
  }, []);

  useEffect(() => {
    const getProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching products with filters:', { page, ...filters });
        
        const response = await api.getProducts({
          page,
          search: filters.search,
          category: filters.category,
          min_price: filters.min_price,
          max_price: filters.max_price,
          condition: filters.condition,
          ordering: filters.ordering
        });
        
        console.log('Products response:', response);
        
        if (response.success && response.data) {
          const productData = response.data.results || response.data;
          const totalCount = response.data.count || productData.length;
          
          setProducts(Array.isArray(productData) ? productData : []);
          setTotalPages(Math.ceil(totalCount / 12));
        } else {
          setError("No se pudieron cargar los productos.");
          setProducts([]);
          setTotalPages(1);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError("No se pudieron cargar los productos. Por favor, inténtelo de nuevo más tarde.");
        setProducts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    };

    getProducts();
  }, [page, filters]);

  const handlePageChange = (event, value) => {
    setPage(value);
    window.scrollTo(0, 0);
  };

  const handleFilterChange = (name, value) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handlePriceRangeChange = (newValue) => {
    setPriceRange(newValue);
  };

  const applyPriceFilter = () => {
    setFilters(prev => ({ 
      ...prev, 
      min_price: priceRange[0], 
      max_price: priceRange[1] 
    }));
    setPage(1);
  };

  const handleFavoriteClick = async (productId) => {
    if (!isAuthenticated) {
      return;
    }
    
    try {
      const productIndex = products.findIndex(p => p.id === productId);
      const isFavorite = products[productIndex]?.is_favorite;
      
      if (isFavorite) {
        await api.removeFromFavorites(productId);
      } else {
        await api.addToFavorites(productId);
      }
      
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, is_favorite: !product.is_favorite } 
            : product
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
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

  const handleTempFilterChange = (name, value) => {
    setTempFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleTempPriceRangeChange = (newValue) => {
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
  };

  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        py: { xs: 2, sm: 3 },
        px: { xs: 1, sm: 2, md: 3 },
        mt: { xs: 2, sm: 3 }, // margen superior igual que en las otras páginas
      }}
    >
      {/* Breadcrumb - Solo mostramos "Inicio" en la página principal */}
      <BreadcrumbNav items={[]} />

      <Box sx={{ 
        width: '100%',
        mt: 0,
        mb: 4
      }}>
        <OffersCarousel />
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
      </Typography>

      <Box sx={{ 
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
      </Box>

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
        </DialogTitle>
        <DialogContent 
          dividers={false} 
          sx={{ 
            p: 2,
            borderTop: 'none', // Eliminar borde superior
            '& .MuiDialogContent-dividers': {
              borderTop: 'none', // También eliminarlo en el pseudo-elemento
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
            }
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12}>
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
                    getContentAnchorEl: null,
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
                        {cat.name}
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
                    getContentAnchorEl: null,
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
                    getContentAnchorEl: null,
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
                  max={1000000}
                  step={1000}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2">{formatPrice(tempPriceRange[0])}</Typography>
                  <Typography variant="body2">{formatPrice(tempPriceRange[1])}</Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 2, py: 1.5 }}>
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
        <>
          <ProductList 
            products={products} 
            onFavoriteClick={handleFavoriteClick}
            isLoading={loading}
            itemsPerRow={5}
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
              onChange={handlePageChange} 
              color="primary" 
              size="medium"
              siblingCount={0}
              boundaryCount={1}
            />
          </Box>
        </>
      ) : (
        <Alert severity="info" sx={{ my: 2 }}>
          No se encontraron productos que coincidan con los filtros seleccionados.
        </Alert>
      )}
    </Container>
  );
};

export default HomePage;