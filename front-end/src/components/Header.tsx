import { useState, MouseEvent, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import Badge from '@mui/material/Badge';
import AccountCircle from '@mui/icons-material/AccountCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CategoryMenu from './buttons/CategoryMenu';
import SearchInput from './common/SearchInput';
import { SearchService } from '../services/searchService';
import NotificationsMenu from './NotificationsMenu';
import logoImage from '../assets/logo.png';
import '../styles/fonts.css';
import '../styles/search.css';
import '../styles/profileMenu.css';
import MessageIcon from '@mui/icons-material/Message';
import SellIcon from '@mui/icons-material/Sell';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import LoginIcon from '@mui/icons-material/Login';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import InventoryIcon from '@mui/icons-material/Inventory';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Avatar from '@mui/material/Avatar';
import api from '../services/api';
import Divider from '@mui/material/Divider';

const Header = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.down('lg')); // Para pantallas sm y md (menores a lg)
  const { isAuthenticated, logout, user } = useAuth();
  const navigate = useNavigate();
  // Estado para nombre de usuario
  const [firstName, setFirstName] = useState<string>('');
  // Estado para foto de perfil
  const [profilePic, setProfilePic] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');  const [favoritesCount, setFavoritesCount] = useState<number>(0);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);  // Efecto para cargar el contador inicial y configurar listeners
  useEffect(() => {
    // Función para cargar el contador de favoritos
    const loadFavoritesCount = async () => {
      if (!isAuthenticated) {
        setFavoritesCount(0);
        return;
      }

      try {
        const response = await api.favorites.getAll();
        if (response.success && response.data) {
          let favoritesData;
          if (Array.isArray(response.data)) {
            favoritesData = response.data;
          } else if (response.data.results) {
            favoritesData = response.data.results;
          } else {
            favoritesData = [];
          }
          setFavoritesCount(favoritesData.length);
        }
      } catch (err) {
        console.error('Error al obtener contador de favoritos:', err);
        setFavoritesCount(0);
      }
    };

    if (!isAuthenticated) {
      setFavoritesCount(0);
      return;
    }

    // Cargar contador inicial
    loadFavoritesCount();

    // Escuchar eventos personalizados de favoritos
    const handleFavoriteAdded = () => {
      console.log('Evento: Favorito agregado - actualizando contador');
      loadFavoritesCount();
    };

    const handleFavoriteRemoved = () => {
      console.log('Evento: Favorito eliminado - actualizando contador');
      loadFavoritesCount();
    };

    // Agregar event listeners
    window.addEventListener('favoriteAdded', handleFavoriteAdded);
    window.addEventListener('favoriteRemoved', handleFavoriteRemoved);
    
    // Actualizar el contador cada 60 segundos como fallback
    const interval = setInterval(() => {
      loadFavoritesCount();
    }, 60000);

    // Cleanup
    return () => {
      window.removeEventListener('favoriteAdded', handleFavoriteAdded);
      window.removeEventListener('favoriteRemoved', handleFavoriteRemoved);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Efecto para cargar datos de perfil
  useEffect(() => {
    const loadProfile = async () => {
      if (!isAuthenticated) {
        setFirstName('');
        setProfilePic('');
        return;
      }
      try {
        const profileRes = await api.getUserProfile();
        if (profileRes.success && profileRes.data) {
          setFirstName(profileRes.data.first_name);
          if (profileRes.data.profile_picture) setProfilePic(profileRes.data.profile_picture);
        }
      } catch (err) {
        console.error('Error al obtener perfil en header:', err);
      }
    };
    loadProfile();
  }, [isAuthenticated]);

  const handleProfileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    
    navigate('/');
    
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };
  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Almacenar en historial de búsquedas
      SearchService.addToSearchHistory(query);
      navigate(`/?search=${encodeURIComponent(query)}`);
    }
  };

  const menuId = 'primary-search-account-menu';
  const renderMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      id={menuId}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMenuOpen}
      onClose={handleMenuClose}
      PaperProps={{
        elevation: 0,
        sx: {
          overflow: 'visible',
          filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.12))',
          mt: 1.5,
          '& .MuiPaper-root': {
            padding: 0,
            borderRadius: '10px',
          },
          '& .MuiList-root': {
            padding: 0,
          },
          '& .MuiMenuItem-root': {
            padding: 0,
          }
        },
      }}
    >
      <div className="profile-menu">        {(isMobile || isMedium) && isAuthenticated && (
          <>
            <Divider sx={{ width: '80%', mx: 'auto', my: 1 }} />
            <Typography
              variant="subtitle1"
              align="center"
              sx={{ width: '100%', py: 1 }}
            >
              ¡Hola <strong>{firstName}</strong>!
            </Typography>
            <Divider sx={{ width: '80%', mx: 'auto', my: 1 }} />
          </>
        )}
        {isAuthenticated ? (
          <>
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/profile'); }}>
              <PersonIcon />
              <span className="menu-item-text">Mi Perfil</span>
            </button>
              <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/product/new'); }}>
              <SellIcon />
              <span className="menu-item-text">Vender Producto</span>
            </button>
            
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/my-products'); }}>
              <InventoryIcon />
              <span className="menu-item-text">Mis Productos</span>
            </button>
              {(isMobile || isMedium) && (
              <>
                <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/favorites'); }}>
                  <FavoriteIcon />
                  <span className="menu-item-text">Favoritos</span>
                </button>
              </>
            )}

            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/chat'); }}>
              <MessageIcon />
              <span className="menu-item-text">Mensajes</span>
            </button>
            
            <button className="menu-item" onClick={handleLogout}>
              <LogoutIcon />
              <span className="menu-item-text">Cerrar Sesión</span>
            </button>
          </>
        ) : (
          <>
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/login'); }}>
              <LoginIcon />
              <span className="menu-item-text">Iniciar Sesión</span>
            </button>
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/register'); }}>
              <PersonAddIcon/>
              <span className="menu-item-text">Registrarse</span>
            </button>
          </>
        )}
      </div>
    </Menu>
  );

  return (
    <AppBar position="fixed" sx={{ 
      bgcolor: '#004f9e', 
      zIndex: 1100,
      boxShadow: 3,
      height: { xs: '64px', md: '72px' },
    }}>      <Toolbar sx={{ 
        display: 'flex', 
        flexWrap: 'nowrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: { xs: '0 8px', sm: '0 16px', md: '0 24px' },
        minHeight: { xs: '56px', sm: '64px', md: '72px' },
        width: '100%',
        boxSizing: 'border-box'
      }}>        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          minWidth: { xs: '40px', sm: '150px', md: '180px' },
          width: { xs: '40px', sm: '180px', md: '200px' },
          mr: { xs: 0.5, sm: 1, md: 2 },
          height: '100%',
          flexShrink: 0,
        }}>
          <Link to="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            textDecoration: 'none',
            height: '100%'
          }}>
            <img 
              src={logoImage} 
              alt="Logo UOH Market" 
              className="site-logo" 
              style={{ 
                width: 'auto', 
                height: 'auto', 
                maxHeight: '32px'
              }} 
            />
            
            <Typography
              variant="h6"
              noWrap
              component="div"
              className="inter-header"
              sx={{ 
                display: { xs: 'none', sm: 'block' }, 
                flexShrink: 0,
                fontSize: { sm: '1.25rem', md: '1.5rem' },
                color: 'white',
                fontFamily: '"Inter", sans-serif',
                fontWeight: 800,
                ml: { sm: 1, md: 1.5 }
              }}
            >
              UOH Market
            </Typography>
          </Link>
        </Box>
          <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: { xs: '100%', sm: 'auto' },
          maxWidth: { xs: 'calc(100% - 100px)', sm: '400px', md: '600px' },
          minWidth: { xs: '120px', sm: '200px' },
          height: '50%',
        }}>
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            mr: { xs: 0.5, sm: 1, md: 2 },
            height: '100%',
            '& .MuiButtonBase-root': {
              fontSize: { md: '1.2rem' },
              padding: { md: '10px' }
            },
            '& .MuiSvgIcon-root': {
              fontSize: { md: '28px' }
            }
          }}>
            <CategoryMenu />
          </Box>
          
          <Box sx={{ 
            flexGrow: 1,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            '& .MuiInputBase-root': {
              fontSize: { md: '1.1rem' },
              height: { xs: '38px', md: '44px' },
              my: 'auto',
            },
            '& .MuiInputBase-input': {
              padding: { md: '10px 14px' }
            },
            '& .MuiButtonBase-root': {
              padding: { md: '8px' },
              height: { xs: '38px', md: '44px' },
              my: 'auto',
            },
            '& .MuiSvgIcon-root': {
              fontSize: { md: '26px' }
            }
          }}>
            <SearchInput
              placeholder={window.innerWidth < 400 ? "Buscar..." : "Buscar productos..."}
              onSearch={handleSearch}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Box>        </Box>
        
        <Box sx={{ 
          display: { xs: 'none', sm: 'none', lg: 'flex' },
          alignItems: 'center',
          justifyContent: 'flex-end',
          minWidth: { lg: '240px' },
          width: { lg: '280px' },
          gap: { lg: 1 },
          height: '100%',
        }}>
          {isAuthenticated && (
            <Typography
              variant="body1"
              sx={{ 
                color: 'white', 
                mr: 2,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                display: { xs: 'none', sm: 'none', lg: 'block' } 
              }}
            >
              ¡Hola <strong>{firstName}</strong>!
            </Typography>
          )}          {isAuthenticated ? (
            <>
              <IconButton
                size="large"
                color="inherit"
                onClick={() => navigate('/favorites')}
                aria-label="favoritos"
                sx={{ flexShrink: 0 }}
              >
                <Badge 
                  badgeContent={favoritesCount}
                  color="error"
                  invisible={favoritesCount === 0}
                >
                  <FavoriteIcon />
                </Badge>
              </IconButton>
              
              <NotificationsMenu />
              
              <IconButton
                size="large"
                edge="end"
                aria-label="perfil de usuario"
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
                sx={{ flexShrink: 0 }}
              >
                {profilePic || user?.profile_picture ? (
                  <Avatar src={profilePic || user!.profile_picture!} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </>          ) : (
            <Button 
              color="inherit" 
              onClick={() => navigate('/login')}
              size="small"
              sx={{
                fontSize: { lg: '1rem' },
                padding: { lg: '6px 12px' },
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}
            >
              Iniciar Sesión
            </Button>
          )}
 
        </Box>        <Box sx={{ 
          display: { xs: 'flex', sm: 'flex', lg: 'none' },
          minWidth: '80px',
          width: '80px',
          ml: 0.5,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'flex-end',
          height: '100%',
        }}>
          <NotificationsMenu />
          <IconButton
            size="small"
            aria-label="mostrar perfil"
            aria-controls={menuId}
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
            sx={{ padding: '6px' }}
          >
            {profilePic || user?.profile_picture ? (
              <Avatar src={profilePic || user!.profile_picture!} sx={{ width: 28, height: 28 }} />
            ) : (
              <AccountCircle sx={{ fontSize: 28 }} />
            )}
          </IconButton>
        </Box>
      </Toolbar>
      {renderMenu}
    </AppBar>
  );
};

export default Header;
