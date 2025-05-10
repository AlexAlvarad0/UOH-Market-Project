import React, { useState, useEffect, useRef, MouseEvent, UIEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import notificationsService from '../services/notifications';
import { 
  IconButton, Badge, Popover, Box, Typography, 
  Button, Divider, List, ListItem, ListItemText,
  ListItemAvatar, Avatar 
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import CheckIcon from '@mui/icons-material/Check';
import '../styles/scroll.css';

interface Notification {
  id: number;
  type: string;
  type_display: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  time_ago: string;
  from_user?: {
    id: number;
    username: string;
  };
  related_product?: {
    id: number;
    title: string;
  };
  related_conversation?: number;
}

const NotificationsMenu: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);

  // Función para cargar las notificaciones
  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      setLoading(true);
      const response = await notificationsService.getAll();
      
      if (response.success && response.data) {
        setNotifications(response.data.results || response.data);
        
        // Contar notificaciones no leídas
        const unread = (response.data.results || response.data).filter(
          (notification: Notification) => !notification.is_read
        ).length;
        
        setUnreadCount(unread);
      } else {
        console.error('Error al cargar notificaciones:', response.error);
        setError('No se pudieron cargar las notificaciones');
      }
    } catch (err) {
      console.error('Error inesperado al cargar notificaciones:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Cargar notificaciones cuando el componente se monta
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      
      // Recargar notificaciones cada minuto
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Manejador para el scroll de la lista
  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  // Abrir el menú de notificaciones
  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  };

  // Cerrar el menú de notificaciones
  const handleClose = () => {
    setIsOpen(false);
    setAnchorEl(null);
  };

  // Marcar todas las notificaciones como leídas
  const handleMarkAllAsRead = async () => {
    try {
      const response = await notificationsService.markAllAsRead();
      
      if (response.success) {
        // Actualizar el estado de las notificaciones localmente
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({
            ...notification,
            is_read: true
          }))
        );
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error al marcar notificaciones como leídas:', err);
    }
  };

  // Marcar una notificación específica como leída
  const markAsRead = async (notificationId: number) => {
    try {
      const response = await notificationsService.markAsRead(notificationId);
      
      if (response.success) {
        // Actualizar el estado de la notificación localmente
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true } 
              : notification
          )
        );
        
        // Actualizar el contador de no leídas
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
      }
    } catch (err) {
      console.error(`Error al marcar notificación ${notificationId} como leída:`, err);
    }
  };

  // Navegar a la página correspondiente según el tipo de notificación
  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Marcar como leída si aún no lo está
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      handleClose();
      
      // Navegar según el tipo de notificación
      if (notification.type === 'message' && notification.related_conversation) {
        // Marcar todas las notificaciones de esta conversación como leídas
        await notificationsService.markConversationAsRead(notification.related_conversation);
        
        // Actualizar el estado localmente
        setNotifications(prevNotifications => 
          prevNotifications.map(notif => 
            notif.related_conversation === notification.related_conversation
              ? { ...notif, is_read: true }
              : notif
          )
        );
        
        // Recalcular unreadCount después de marcar todas las notificaciones de la conversación
        const unreadNotifications = notifications.filter(
          n => n.is_read === false && n.related_conversation !== notification.related_conversation
        ).length;
        setUnreadCount(unreadNotifications);
        
        // Navegar a la conversación
        navigate(`/chat/${notification.related_conversation}`);
      } else if (notification.related_product && notification.related_product.id) {
        // Registrar para depuración
        console.log('Navegando al producto:', notification.related_product);
        
        // Marcar todas las notificaciones de este producto como leídas
        await notificationsService.markProductAsRead(notification.related_product.id);
        
        // Actualizar el estado localmente
        setNotifications(prevNotifications => 
          prevNotifications.map(notif => 
            notif.related_product?.id === notification.related_product?.id
              ? { ...notif, is_read: true }
              : notif
          )
        );
        
        // Recalcular unreadCount después de marcar todas las notificaciones del producto
        const unreadNotifications = notifications.filter(
          n => n.is_read === false && n.related_product?.id !== notification.related_product?.id
        ).length;
        setUnreadCount(unreadNotifications);
        
        // Navegar al producto usando el ID correcto
        navigate(`/products/${notification.related_product.id}`);
      } else {
        console.warn('Notificación sin destino válido:', notification);
      }
    } catch (error) {
      console.error('Error al procesar clic en notificación:', error);
    }
  };

  // Obtener el icono según el tipo de notificación
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageIcon sx={{ fontSize: '1.2rem' }} />;
      case 'views':
        return <VisibilityIcon sx={{ fontSize: '1.2rem' }} />;
      case 'favorite':
        return <FavoriteIcon sx={{ fontSize: '1.2rem' }} />;
      default:
        return <NotificationsIcon sx={{ fontSize: '1.2rem' }} />;
    }
  };

  return (
    <>
      <IconButton
        size="large"
        color="inherit"
        aria-label="notificaciones"
        onClick={handleOpen}
      >
        <Badge 
          badgeContent={unreadCount} 
          color="error"
          invisible={unreadCount === 0}
        >
          <NotificationsIcon />
        </Badge>
      </IconButton>
      
      <Popover
        open={isOpen}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{
          '& .MuiPaper-root': {
            borderRadius: 2,
            width: { xs: 300, sm: 350, md: 400 },
            maxWidth: '95vw',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            mt: 1,
            overflow: 'hidden',
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2, 
          borderBottom: '1px solid #eee' 
        }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
            Notificaciones
          </Typography>
          
          {unreadCount > 0 && (
            <Button 
              size="small" 
              onClick={handleMarkAllAsRead}
              startIcon={<CheckIcon />}
              sx={{ fontSize: '0.75rem' }}
            >
              Marcar todas como leídas
            </Button>
          )}
        </Box>
        
        <div className="scroll-list-container" style={{ maxHeight: '400px' }}>
          <div
            ref={listRef}
            onScroll={handleScroll}
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {loading ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography>Cargando notificaciones...</Typography>
              </Box>
            ) : notifications.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography color="textSecondary">No tienes notificaciones</Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((notification) => (
                  <React.Fragment key={notification.id}>
                    <ListItem 
                      alignItems="flex-start"
                      onClick={() => handleNotificationClick(notification)}
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: notification.is_read ? 'transparent' : 'rgba(63, 81, 181, 0.08)',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                        py: 1.5,
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#f0f0f0' }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="subtitle2" 
                            component="span"
                            sx={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}
                          >
                            {notification.title}
                          </Typography>
                        }
                        secondary={
                          <>
                            <Typography
                              component="span"
                              variant="body2"
                              color="textPrimary"
                              sx={{ 
                                display: 'block',
                                fontWeight: notification.is_read ? 'normal' : 'medium',
                                fontSize: '0.85rem',
                                mb: 0.5,
                              }}
                            >
                              {notification.message}
                            </Typography>
                            <Typography
                              component="span"
                              variant="caption"
                              color="textSecondary"
                              sx={{ fontSize: '0.75rem' }}
                            >
                              {notification.time_ago}
                            </Typography>
                          </>
                        }
                      />
                    </ListItem>
                    <Divider component="li" />
                  </React.Fragment>
                ))}
              </List>
            )}
            
            {/* Gradientes para indicar scroll */}
            <div 
              className="top-gradient" 
              style={{ 
                opacity: topGradientOpacity,
                zIndex: 2,
              }}
            ></div>
            <div 
              className="bottom-gradient" 
              style={{ 
                opacity: bottomGradientOpacity,
                zIndex: 2,
              }}
            ></div>
          </div>
        </div>
      </Popover>
    </>
  );
};

export default NotificationsMenu;