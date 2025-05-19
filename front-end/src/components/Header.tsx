import { useState, MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import AccountCircle from '@mui/icons-material/AccountCircle';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MoreIcon from '@mui/icons-material/MoreVert';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CategoryMenu from './buttons/CategoryMenu';
import SearchInput from './common/SearchInput';
import NotificationsMenu from './NotificationsMenu';
import logoImage from '../assets/logo.png';
import '../styles/fonts.css';
import '../styles/search.css';
import '../styles/profileMenu.css';

const Header = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const isMenuOpen = Boolean(anchorEl);

  const handleProfileMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    
    // Navegar primero a la página principal
    navigate('/');
    
    // Esperar un momento breve para que se complete el proceso de logout
    // y luego recargar la página para actualizar completamente el estado
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
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
      <div className="profile-menu">
        {isAuthenticated ? (
          <>
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/profile'); }}>
              <svg data-name="Layer 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                <path d="m1.5 13v1a.5.5 0 0 0 .3379.4731 18.9718 18.9718 0 0 0 6.1621 1.0269 18.9629 18.9629 0 0 0 6.1621-1.0269.5.5 0 0 0 .3379-.4731v-1a6.5083 6.5083 0 0 0 -4.461-6.1676 3.5 3.5 0 1 0 -4.078 0 6.5083 6.5083 0 0 0 -4.461 6.1676zm4-9a2.5 2.5 0 1 1 2.5 2.5 2.5026 2.5026 0 0 1 -2.5-2.5zm2.5 3.5a5.5066 5.5066 0 0 1 5.5 5.5v.6392a18.08 18.08 0 0 1 -11 0v-.6392a5.5066 5.5066 0 0 1 5.5-5.5z" />
              </svg>
              <span className="menu-item-text">Mi Perfil</span>
            </button>
            
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/product/new'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
                <path d="m109.9 20.63a6.232 6.232 0 0 0 -8.588-.22l-57.463 51.843c-.012.011-.02.024-.031.035s-.023.017-.034.027l-4.721 4.722a1.749 1.749 0 0 0 0 2.475l.341.342-3.16 3.16a8 8 0 0 0 -1.424 1.967 11.382 11.382 0 0 0 -12.055 10.609c-.006.036-.011.074-.015.111a5.763 5.763 0 0 1 -4.928 5.41 1.75 1.75 0 0 0 -.844 3.14c4.844 3.619 9.4 4.915 13.338 4.915a17.14 17.14 0 0 0 11.738-4.545l.182-.167a11.354 11.354 0 0 0 3.348-8.081c0-.225-.02-.445-.032-.667a8.041 8.041 0 0 0 1.962-1.421l3.16-3.161.342.342a1.749 1.749 0 0 0 2.475 0l4.722-4.722c.011-.011.018-.025.029-.036s.023-.018.033-.029l51.844-57.46a6.236 6.236 0 0 0 -.219-8.589z" />
              </svg>
              <span className="menu-item-text">Vender Producto</span>
            </button>
            
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/favorites'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" id="Line">
                <path d="M16 28.72a3 3 0 0 1-2.13-.88l-10.3-10.3a8.31 8.31 0 0 1-2.52-6.07 8.2 8.2 0 0 1 8.18-8.18 8.3 8.3 0 0 1 6.07 2.52l.7.71.71-.71a8.29 8.29 0 0 1 6.07-2.52 8.2 8.2 0 0 1 8.18 8.18 8.3 8.3 0 0 1-2.52 6.07l-10.3 10.3a3 3 0 0 1-2.14.88zM9.23 5.29a6.2 6.2 0 0 0-6.18 6.18 6.27 6.27 0 0 0 1.91 4.57L15.29 26.3a1 1 0 0 0 1.42 0l10.33-10.26a6.27 6.27 0 0 0 1.91-4.57 6.2 6.2 0 0 0-6.18-6.18 6.17 6.17 0 0 0-4.56 1.91L16.71 8.7a1 1 0 0 1-1.42 0L13.8 7.21a6.18 6.18 0 0 0-4.57-1.92z" />
              </svg>
              <span className="menu-item-text">Favoritos</span>
            </button>

            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/chat'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 25" fill="none">
                <path fillRule="evenodd" d="m11.9572 4.31201c-3.35401 0-6.00906 2.59741-6.00906 5.67742v3.29037c0 .1986-.05916.3927-.16992.5576l-1.62529 2.4193-.01077.0157c-.18701.2673-.16653.5113-.07001.6868.10031.1825.31959.3528.67282.3528h14.52603c.2546 0 .5013-.1515.6391-.3968.1315-.2343.1117-.4475-.0118-.6093-.0065-.0085-.0129-.0171-.0191-.0258l-1.7269-2.4194c-.121-.1695-.186-.3726-.186-.5809v-3.29037c0-1.54561-.6851-3.023-1.7072-4.00431-1.1617-1.01594-2.6545-1.67311-4.3019-1.67311z" clipRule="evenodd" />
              </svg>
              <span className="menu-item-text">Mensajes</span>
            </button>
            
            <button className="menu-item" onClick={handleLogout}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span className="menu-item-text">Cerrar Sesión</span>
            </button>
          </>
        ) : (
          <>
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/login'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <span className="menu-item-text">Iniciar Sesión</span>
            </button>
            <button className="menu-item" onClick={() => { handleMenuClose(); navigate('/register'); }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
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
      height: { xs: '64px', md: '72px' }, // Incremento de altura para pantallas grandes
    }}>
      <Toolbar sx={{ 
        display: 'flex', 
        flexWrap: { xs: 'nowrap', sm: 'wrap' },
        alignItems: 'center', // Centrado vertical
        justifyContent: 'space-between',
        padding: { xs: '0 10px', sm: '0 16px', md: '0 24px' }, // Eliminamos padding vertical para mejor control
        minHeight: { xs: '56px', sm: '64px', md: '72px' }, // Ajustado para coincidir con la altura del AppBar
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Logo/Título - Lado izquierdo */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          minWidth: { xs: 'auto', sm: '150px', md: '180px' },
          width: { xs: 'auto', sm: '180px', md: '200px' },
          mr: { xs: 0.5, sm: 1, md: 2 },
          height: '100%', // Ocupar toda la altura
        }}>
          <Link to="/" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            textDecoration: 'none',
            height: '100%' // Ocupar toda la altura
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
            
            {/* Solo mostrar texto en pantallas >= sm */}
            <Typography
              variant="h6"
              noWrap
              component="div"
              className="inter-header"
              sx={{ 
                display: { xs: 'none', sm: 'block' }, 
                flexShrink: 0,
                fontSize: { sm: '1.25rem', md: '1.5rem' }, // Texto más grande en pantallas grandes
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
        
        {/* Contenedor central para búsqueda y menú hamburguesa */}
        <Box sx={{ 
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center', 
          width: { xs: '100%', sm: 'auto' },
          maxWidth: { xs: 'calc(100% - 150px)', sm: '500px', md: '1200px' },
          height: '50%', // Asegurar que ocupe toda la altura
        }}>
          {/* Menú hamburguesa siempre a la izquierda */}
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            mr: { xs: 0.5, sm: 1, md: 2 },
            height: '100%', // Ocupar toda la altura
            '& .MuiButtonBase-root': { // Aumentar tamaño del botón de menú
              fontSize: { md: '1.2rem' },
              padding: { md: '10px' }
            },
            '& .MuiSvgIcon-root': { // Aumentar tamaño del icono de menú
              fontSize: { md: '28px' }
            }
          }}>
            <CategoryMenu />
          </Box>
          
          {/* Barra de búsqueda */}
          <Box sx={{ 
            flexGrow: 1,
            width: '100%',
            display: 'flex',
            alignItems: 'center', // Centrar verticalmente
            height: '100%', // Ocupar toda la altura
            '& .MuiInputBase-root': { // Aumentar tamaño del input de búsqueda
              fontSize: { md: '1.1rem' },
              height: { xs: '38px', md: '44px' }, // Altura específica para centrado uniforme
              my: 'auto', // Margen vertical automático para centrar
            },
            '& .MuiInputBase-input': { // Asegurar que el texto de búsqueda tenga buen tamaño
              padding: { md: '10px 14px' }
            },
            '& .MuiButtonBase-root': { // Aumentar tamaño del botón de búsqueda
              padding: { md: '8px' },
              height: { xs: '38px', md: '44px' }, // Altura específica para centrado uniforme
              my: 'auto', // Margen vertical automático para centrar
            },
            '& .MuiSvgIcon-root': { // Aumentar tamaño del icono de búsqueda
              fontSize: { md: '26px' }
            },
            // Envuelve el SearchInput en un div para centrar perfectamente
            '& > div': {
              display: 'flex',
              alignItems: 'center',
              height: '100%'
            }
          }}>
            <SearchInput
              placeholder={window.innerWidth < 400 ? "Buscar..." : "Buscar productos..."}
              onSearch={() => handleSearch(searchQuery)}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Box>
        </Box>
        
        {/* Iconos para desktop - Lado derecho */}
        <Box sx={{ 
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'flex-end',
          minWidth: { sm: '150px', md: '180px' },
          width: { sm: '180px', md: '200px' },
          gap: { sm: 0.5, md: 1 },
          height: '100%', // Ocupar toda la altura
        }}>
          {isAuthenticated ? (
            <>
              <IconButton
                size="large"
                color="inherit"
                onClick={() => navigate('/favorites')}
                aria-label="favoritos"
              >
                <FavoriteIcon />
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
              >
                <AccountCircle />
              </IconButton>
            </>
          ) : (
            <Button 
              color="inherit" 
              onClick={() => navigate('/login')}
              size="small"
              sx={{
                fontSize: { md: '1rem' },
                padding: { md: '6px 12px' }
              }}
            >
              Iniciar Sesión
            </Button>
          )}
 
        </Box>
        
        {/* Menú para móvil */}
        <Box sx={{ 
          display: { xs: 'flex', sm: 'none' },
          ml: 0.5,
          flexShrink: 0,
          alignItems: 'center',
          height: '100%', // Ocupar toda la altura
        }}>
          <IconButton
            size="small"
            aria-label="mostrar perfil"
            aria-controls={menuId}
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
            sx={{ padding: '6px' }}
          >
            <MoreIcon />
          </IconButton>
        </Box>
      </Toolbar>
      {renderMenu}
    </AppBar>
  );
};

export default Header;
