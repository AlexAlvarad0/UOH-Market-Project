import React, { useState, useEffect, useRef, MouseEvent, UIEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.hooks';
import notificationsService from '../services/notifications';
import { 
  IconButton, Badge, Popover, Box, Typography, 
  Button, Divider, List, ListItem, ListItemText,
  ListItemAvatar, Avatar, Tooltip
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MessageIcon from '@mui/icons-material/Message';
import VisibilityIcon from '@mui/icons-material/Visibility';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import HotelClassIcon from '@mui/icons-material/HotelClass';
import CheckIcon from '@mui/icons-material/Check';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import '../styles/scroll.css';
import '../styles/notification-animations.css';

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
  related_message?: number;
  related_rating?: number;
  message_info?: {
    id: number;
    content: string;
    conversation_id: number;
  };
  rating_info?: {
    id: number;
    rating: number;
    comment: string;
    rated_user_id: number;
  };
}

const NotificationsMenu: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { isAuthenticated, user } = useAuth();
  const touchStartXRef = useRef<Record<number, number>>({}); // Referencia para posiciones de touch por notificación

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadUnreadCount = async () => {
      try {
        const response = await notificationsService.getUnread();
        if (response.success && response.data) {
          const data = response.data.results || response.data;
          setUnreadCount(data.length);
        }
      } catch (err) {
        console.error('Error al obtener notificaciones no leídas:', err);
      }
    };
    loadUnreadCount();
  }, [isAuthenticated]);
  const navigate = useNavigate();
  const listRef = useRef<HTMLDivElement>(null);
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1);
  const [animatingItems, setAnimatingItems] = useState<number[]>([]);
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        console.log('Iniciando fetch de notificaciones...');
        console.log('Usuario autenticado:', isAuthenticated);
        console.log('Token en localStorage:', localStorage.getItem('authToken') ? 'Token presente' : 'Token ausente');
        
        const response = await notificationsService.getAll();
        console.log('Respuesta del fetch de notificaciones:', response);
        
        if (response.success && response.data) {
          const data = response.data.results || response.data;
          console.log('Datos de notificaciones procesados:', data);
          console.log('Cantidad de notificaciones:', data.length);
          
          setNotifications(data);
          const unreadCount = data.filter((n: Notification) => !n.is_read).length;
          console.log('Conteo de notificaciones no leídas:', unreadCount);
          setUnreadCount(unreadCount);
        } else {
          console.error('Error al cargar notificaciones:', response.error);
        }
      } catch (err) {
        console.error('Error inesperado al cargar notificaciones:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [isOpen, isAuthenticated]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  const handleOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setAnchorEl(null);
  };
  const handleMarkAllAsRead = async () => {
    try {
      console.log('Iniciando marcado de todas las notificaciones como leídas...');
      const response = await notificationsService.markAllAsRead();
      
      console.log('Respuesta del servicio markAllAsRead:', response);
      
      if (response.success) {
        console.log('Actualizando estado local de las notificaciones...');
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => ({
            ...notification,
            is_read: true
          }))
        );
        setUnreadCount(0);
        console.log('Estado local actualizado correctamente');
      } else {
        console.error('El servicio reportó error:', response.error);
      }
    } catch (err) {
      console.error('Error al marcar notificaciones como leídas:', err);
    }
  };
  const markAsRead = async (notificationId: number) => {
    try {
      console.log(`Iniciando marcado de notificación ${notificationId} como leída...`);
      const response = await notificationsService.markAsRead(notificationId);
      
      console.log(`Respuesta del servicio markAsRead para ${notificationId}:`, response);
      
      if (response.success) {
        console.log(`Actualizando estado local para notificación ${notificationId}...`);
        setNotifications(prevNotifications => 
          prevNotifications.map(notification => 
            notification.id === notificationId 
              ? { ...notification, is_read: true } 
              : notification
          )
        );
        setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        console.log(`Estado local actualizado correctamente para notificación ${notificationId}`);
      } else {
        console.error(`El servicio reportó error para notificación ${notificationId}:`, response.error);
      }
    } catch (err) {
      console.error(`Error al marcar notificación ${notificationId} como leída:`, err);
    }
  };

  const handleDelete = (e: React.MouseEvent<HTMLElement>, notificationId: number) => {
    e.stopPropagation();
    setAnimatingItems(prev => [...prev, notificationId]);
    setTimeout(async () => {
      try {
        await notificationsService.deleteNotification(notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        const wasUnread = notifications.find(n => n.id === notificationId)?.is_read === false;
        if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.error(`Error al eliminar notificación ${notificationId}:`, err);
      }
      setAnimatingItems(prev => prev.filter(id => id !== notificationId));
    }, 300);
  };

  const handleDeleteAll = () => {
    const allIds = notifications.map(n => n.id);
    setAnimatingItems(allIds);
    setTimeout(async () => {
      try {
        await notificationsService.deleteAllNotifications();
        setNotifications([]);
        setUnreadCount(0);
      } catch (err) {
        console.error('Error al eliminar todas las notificaciones:', err);
      }
      setAnimatingItems(prev => prev.filter(id => !allIds.includes(id)));
    }, 300);
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      handleClose();
      
      if (notification.type === 'message' && notification.related_conversation) {
        await notificationsService.markConversationAsRead(notification.related_conversation);
        setNotifications(prevNotifications => 
          prevNotifications.map(notif => 
            notif.related_conversation === notification.related_conversation
              ? { ...notif, is_read: true }
              : notif
          )
        );
        const unreadNotifications = notifications.filter(
          n => n.is_read === false && n.related_conversation !== notification.related_conversation
        ).length;
        setUnreadCount(unreadNotifications);
        navigate(`/chat/${notification.related_conversation}`);
      } else if (notification.type === 'like_message' && notification.message_info?.conversation_id) {
        const conversationId = notification.message_info.conversation_id;
        if (notification.related_message) {
          await notificationsService.markMessageAsRead(notification.related_message);
        }
        setNotifications(prevNotifications => 
          prevNotifications.map(notif => 
            notif.related_message === notification.related_message
              ? { ...notif, is_read: true }
              : notif
          )
        );
        const unreadNotifications = notifications.filter(
          n => n.is_read === false && n.related_message !== notification.related_message        ).length;
        setUnreadCount(unreadNotifications);
        navigate(`/chat/${conversationId}`);
      } else if (notification.type === 'rating' && user?.id) {
        // Navegar al perfil del usuario actual (quien recibió la calificación), en la pestaña de calificaciones
        navigate(`/profile`);
      } else if (notification.related_product && notification.related_product.id) {
        console.log('Navegando al producto:', notification.related_product);
        await notificationsService.markProductAsRead(notification.related_product.id);
        setNotifications(prevNotifications => 
          prevNotifications.map(notif => 
            notif.related_product?.id === notification.related_product?.id
              ? { ...notif, is_read: true }
              : notif
          )
        );
        const unreadNotifications = notifications.filter(
          n => n.is_read === false && n.related_product?.id !== notification.related_product?.id
        ).length;
        setUnreadCount(unreadNotifications);
        navigate(`/products/${notification.related_product.id}`);
      } else {
        console.warn('Notificación sin destino válido:', notification);
      }
    } catch (error) {
      console.error('Error al procesar clic en notificación:', error);
    }
  };
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageIcon sx={{ fontSize: '1.2rem', color: '#1976d2' }} />;
      case 'views':
        return <VisibilityIcon sx={{ fontSize: '1.2rem', color: '#000000' }} />;
      case 'favorite':
        return <FavoriteIcon sx={{ fontSize: '1.2rem', color: '#f44336' }} />;
      case 'like_message':
        return <ThumbUpIcon sx={{ fontSize: '1.2rem', color: '#1976d2' }} />;
      case 'rating':
        return <HotelClassIcon sx={{ fontSize: '1.2rem', color: '#ffd700' }} />;
      default:
        return <NotificationsIcon sx={{ fontSize: '1.2rem' }} />;
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>, id: number) => {
    touchStartXRef.current[id] = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>, id: number) => {
    const startX = touchStartXRef.current[id];
    const endX = e.changedTouches[0].clientX;
    if (startX !== undefined && Math.abs(startX - endX) > 50) {
      handleDelete(e as unknown as MouseEvent<HTMLElement>, id);
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
          {notifications.length > 0 && (
            <Tooltip title="Eliminar todas">
              <IconButton size="small" onClick={handleDeleteAll} sx={{ color: '#f44336' }}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        <div className="scroll-list-container" style={{ maxHeight: '400px' }}>
          <div
            ref={listRef}
            className="scroll-list no-scrollbar"
            onScroll={handleScroll}
            style={{ maxHeight: '400px' }}
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
                  <div
                    key={notification.id}
                    className={`notification-item ${animatingItems.includes(notification.id) ? 'notification-exit' : ''}`}
                    onTouchStart={(e) => handleTouchStart(e, notification.id)}
                    onTouchEnd={(e) => handleTouchEnd(e, notification.id)}
                  >
                    <ListItem
                      alignItems="flex-start"
                      onClick={() => handleNotificationClick(notification)}
                      secondaryAction={
                        <IconButton
                          edge="end"
                          size="small"
                          className="delete-button"
                          sx={{ visibility: 'visible', opacity: isMobile ? 1 : 1 }}
                          onClick={(e) => handleDelete(e, notification.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                      sx={{
                        cursor: 'pointer',
                        backgroundColor: notification.is_read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                        borderLeft: notification.is_read ? 'none' : '3px solid #1976d2',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        },
                        py: 1.5,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <ListItemAvatar>                        <Avatar 
                          sx={{ 
                            bgcolor: notification.type === 'like_message' || notification.type === 'message' 
                              ? '#e3f2fd' 
                              : notification.type === 'favorite' 
                                ? '#ffebee'
                              : notification.type === 'rating'
                                ? '#fffbf0'
                                : '#f5f5f5',
                            width: 40,
                            height: 40
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography 
                            variant="subtitle2" 
                            component="span"
                            sx={{ 
                              fontWeight: 'bold',
                              fontSize: '0.9rem',
                              color: notification.is_read ? '#000000' : '#1976d2'
                            }}
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
                                fontWeight: 'normal',
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
                  </div>
                ))}
              </List>
            )}
            
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
