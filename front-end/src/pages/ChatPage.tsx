import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Typography, 
  Badge, 
  CircularProgress, 
  Container, 
  useMediaQuery, 
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  DialogContentText
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import { List } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth.hooks';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  MoreVert as MoreVertIcon, 
  ThumbUp as ThumbUpIcon, 
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import AudioMessage from '../components/AudioMessage';
import MessageInput from '../components/MessageInput';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));  interface Message {
    id: number;
    sender: number;
    sender_username: string;
    content: string;
    message_type?: 'text' | 'audio';
    audio_file?: string;
    audio_url?: string;
    audio_duration?: number;
    created_at: string;
    edited_at: string | null;
    is_edited: boolean;
    liked: boolean;
    liked_by?: number[];
    liked_by_users?: Array<{id: number, username: string}>;
    is_deleted?: boolean;
  }
  interface Participant {
    id: number;
    username: string;
    profile_picture?: string;
  }

  interface Product {
    title: string;
  }

  interface Conversation {
    id: number;
    participants: Participant[];
    product?: Product;
    unread_count?: number;
    updated_at: string;
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Estado para edición de mensajes
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  
  // Estado para diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // Cargar conversaciones
  useEffect(() => {
    const fetchConversations = async () => {
      setLoadingConvs(true);
      const res = await api.getConversations();
      if (res.success) {
        let convs = [];
        if (Array.isArray(res.data)) {
          convs = res.data;
        } else if (res.data && Array.isArray(res.data.results)) {
          convs = res.data.results;
        } else if (res.data) {
          convs = Object.values(res.data);
        }

        // Debug logging para verificar profile_pictures
        console.log('Conversaciones recibidas:', convs);
        convs.forEach((conv: Conversation, index: number) => {
          console.log(`Conversación ${index + 1}:`, {
            id: conv.id,
            participants: conv.participants.map(p => ({
              id: p.id,
              username: p.username,
              profile_picture: p.profile_picture
            })),
            product: conv.product?.title
          });
        });

        // Ordenar conversaciones por fecha de actualización (más recientes primero)
        convs.sort((a: { updated_at: string }, b: { updated_at: string }) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        setConversations(convs);
      } else {
        setConversations([]);
      }
      setLoadingConvs(false);
    };
    fetchConversations();
  }, []);

  // Cargar mensajes de la conversación seleccionada
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    
    const fetchMessages = async () => {
      setLoadingMsgs(true);
      const res = await api.getMessages(Number(conversationId));
      if (res.success) {
        setMessages(res.data);
        // Actualizar la lista de conversaciones para actualizar los contadores
        refreshConversations();
      }
      setLoadingMsgs(false);
      
      // Scroll al final de los mensajes
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    };
    
    fetchMessages();
  }, [conversationId]);

  // Función para actualizar la lista de conversaciones (y sus contadores)
  const refreshConversations = async () => {
    const res = await api.getConversations();
    if (res.success) {
      let convs = [];
      if (Array.isArray(res.data)) {
        convs = res.data;
      } else if (res.data && Array.isArray(res.data.results)) {
        convs = res.data.results;
      } else if (res.data) {
        convs = Object.values(res.data);
      }
      
      // Ordenar conversaciones por fecha de actualización
      convs.sort((a: { updated_at: string }, b: { updated_at: string }) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      setConversations(convs);
    }
  };

  // Funciones para el menú contextual
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, messageId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageId(messageId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageId(null);
  };
  // Iniciar edición de un mensaje
  const handleEditStart = () => {
    if (!selectedMessageId) return;
    
    const messageToEdit = messages.find(msg => msg.id === selectedMessageId);
    if (messageToEdit) {
      // No permitir editar mensajes de audio
      if (messageToEdit.message_type === 'audio') {
        console.log('No se pueden editar mensajes de audio');
        handleMenuClose();
        return;
      }
      
      setEditingMessageId(selectedMessageId);
      setMessage(messageToEdit.content); // Colocar el contenido en el input
    }
    
    handleMenuClose();
  };

  // Cancelar edición
  const handleEditCancel = () => {
    setEditingMessageId(null);
    setMessage('');
  };  // Eliminar mensaje
  const handleDeleteMessage = () => {
    // Mostrar diálogo de confirmación
    setDeleteDialogOpen(true);
    // No cerrar el menú hasta que se confirme o cancele para mantener selectedMessageId
    setAnchorEl(null); // Solo cerrar visualmente el menú
  };
  // Confirmar eliminación del mensaje
  const confirmDeleteMessage = async () => {
    console.log('confirmDeleteMessage llamada, selectedMessageId:', selectedMessageId);
    if (!selectedMessageId) {
      console.log('No hay selectedMessageId, saliendo');
      return;
    }
    
    console.log('Llamando a api.deleteMessage con ID:', selectedMessageId);
    const res = await api.deleteMessage(selectedMessageId);
    console.log('Respuesta de api.deleteMessage:', res);
    
    if (res.success) {
      console.log('Eliminación exitosa, actualizando estado');
      // Marcar mensaje como eliminado en lugar de eliminarlo
      setMessages(prev => prev.map(msg => 
        msg.id === selectedMessageId ? { ...msg, is_deleted: true } : msg
      ));
      // Actualizar conversaciones
      refreshConversations();
    } else {
      console.error('Error al eliminar mensaje:', res.error);
    }
    
    setDeleteDialogOpen(false);
    setSelectedMessageId(null);
  };
  // Cancelar eliminación del mensaje
  const cancelDeleteMessage = () => {
    setDeleteDialogOpen(false);
    setSelectedMessageId(null); // Limpiar el mensaje seleccionado al cancelar
  };

  // Modificar handleSend para manejar también la edición
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Si estamos editando un mensaje
    if (editingMessageId) {
      if (!message.trim()) return;
      
      const res = await api.updateMessage(editingMessageId, message);
      if (res.success) {
        // Actualizar el mensaje en la lista
        setMessages(prev => prev.map(msg => 
          msg.id === editingMessageId ? res.data : msg
        ));
        
        // Limpiar estado de edición
        setEditingMessageId(null);
        setMessage('');
        
        // Actualizar conversaciones
        refreshConversations();
      }
    } 
    // Si estamos enviando un mensaje nuevo
    else {
      if (!message.trim() || !conversationId) return;
      
      const res = await api.sendMessage(Number(conversationId), message);
      if (res.success) {
        // Añadir mensaje a la lista y limpiar campo
        setMessages((prev) => [...prev, res.data]);
        setMessage('');
      }
    }
    
    // Scroll al final de los mensajes
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
      // Actualizar la lista de conversaciones
    refreshConversations();
  };

  // Función para enviar mensaje de audio
  const handleSendAudio = async (audioFile: File, duration: number) => {
    if (!conversationId) return;
    
    try {
      const res = await api.sendAudioMessage(Number(conversationId), audioFile, duration);
      if (res.success) {
        // Añadir mensaje de audio a la lista
        setMessages((prev) => [...prev, res.data]);
        
        // Scroll al final de los mensajes
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        
        // Actualizar la lista de conversaciones
        refreshConversations();
      }
    } catch (error) {
      console.error('Error al enviar audio:', error);
    }
  };

  // Función para dar like a un mensaje
  const handleLikeMessage = async (messageId: number) => {
    const res = await api.likeMessage(messageId);
    if (res.success) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { 
          ...msg, 
          liked_by: res.data.liked_by, 
          liked: res.data.liked,
          liked_by_users: res.data.liked_by_users
        } : msg
      ));
    }
  };
  // Función para volver a la lista de conversaciones en móvil
  const handleBackToConversations = () => {
    navigate('/chat');
  };

  // Función para formatear la fecha
  const formatDateHeader = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Normalizar las fechas para comparar solo día/mes/año
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    const normalizedMessageDate = normalizeDate(messageDate);
    const normalizedToday = normalizeDate(today);
    const normalizedYesterday = normalizeDate(yesterday);

    if (normalizedMessageDate.getTime() === normalizedToday.getTime()) {
      return 'Hoy';
    } else if (normalizedMessageDate.getTime() === normalizedYesterday.getTime()) {
      return 'Ayer';
    } else {
      return messageDate.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    }
  };

  // Función para verificar si dos mensajes son del mismo día
  const isSameDay = (date1: string, date2: string) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  };

  // Renderizar solo lista de conversaciones en móvil cuando no hay conversación seleccionada
  if (isMobile && !conversationId) {
    return (
      <Container 
        maxWidth="xl" 
        sx={{ 
          pt: 0,
          pb: 0,
          px: 0,
          mt: 0,
          height: 'calc(100vh - 64px)', 
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Conversaciones
          </Typography>
        </Box>
        
        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (            <List
              itemLayout="horizontal"
              dataSource={conversations}
              renderItem={(item: { id: number; participants: { id: number; username: string; profile_picture?: string }[]; product?: { title: string }; unread_count?: number }) => {
                const otherUser = item.participants.find((u: { id: number; username: string; profile_picture?: string }) => u.id !== user?.id);
                const unreadCount = item.unread_count || 0;
                
                console.log('Renderizando conversación móvil:', {
                  id: item.id,
                  otherUser: otherUser,
                  profilePicture: otherUser?.profile_picture
                });
                
                return (
                  <List.Item
                    style={{ 
                      cursor: 'pointer', 
                      position: 'relative',
                      borderLeft: unreadCount > 0 ? '4px solid #1976d2' : 'none',
                      margin: '0 16px',
                      borderBottom: '1px solid #f0f0f0',
                      padding: '12px 0'
                    }}
                    onClick={() => navigate(`/chat/${item.id}`)}
                  >                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      width: '100%',
                      gap: 2
                    }}>
                      {/* Foto de perfil a la izquierda */}
                      <Avatar 
                        src={otherUser?.profile_picture || undefined}
                        sx={{ width: 48, height: 48, flexShrink: 0 }}
                      >
                        {!otherUser?.profile_picture && otherUser?.username?.charAt(0).toUpperCase()}
                      </Avatar>
                      
                      {/* Contenido principal en el centro */}
                      <Box sx={{ flexGrow: 1 }}>
                        {/* Nombre del producto */}
                        <Typography variant="subtitle1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                          {item.product?.title || 'Sin producto'}
                        </Typography>
                        {/* Nombre de la persona */}
                        <Typography variant="body2" color="text.secondary">
                          {otherUser ? `${otherUser.username || 'Usuario'}` : ''}
                        </Typography>
                      </Box>
                      
                      {/* Badge de mensajes no leídos a la derecha */}
                      {unreadCount > 0 && (
                        <Badge 
                          badgeContent={unreadCount} 
                          color="primary"
                          sx={{ flexShrink: 0 }}
                        />
                      )}
                    </Box>
                  </List.Item>
                );
              }}
            />
          )}
        </Box>
      </Container>
    );
  }
  return (
    <Container 
      maxWidth="xl" 
      sx={{ 
        pt: 0,
        pb: 0,
        px: { xs: 0, sm: 0, md: 0 },
        mt: 0,
        height: { xs: 'calc(100vh - 64px)', md: 'calc(100vh - 72px)' },
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        overflow: 'hidden' // Agregar esta línea
        // Solución al problema del margen blanco
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', flex: 1 }}>
        {/* Lista de conversaciones - solo en desktop */}
        {!isMobile && (
          <Box sx={{ width: 340, borderRight: 1, borderColor: 'divider', p: 2, overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Conversaciones
            </Typography>
            {loadingConvs ? (
              <CircularProgress size={24} />
            ) : (              <List
                itemLayout="horizontal"
                dataSource={conversations}
                renderItem={(item: { id: number; participants: { id: number; username: string; profile_picture?: string }[]; product?: { title: string }; unread_count?: number }) => {
                  const otherUser = item.participants.find((u: { id: number; username: string; profile_picture?: string }) => u.id !== user?.id);
                  const unreadCount = item.unread_count || 0;
                  
                  console.log('Renderizando conversación desktop:', {
                    id: item.id,
                    otherUser: otherUser,
                    profilePicture: otherUser?.profile_picture
                  });
                  
                  return (
                    <List.Item
                      style={{ 
                        cursor: 'pointer', 
                        background: String(item.id) === conversationId ? '#f0f4ff' : undefined,
                        position: 'relative',
                        borderLeft: unreadCount > 0 ? '4px solid #1976d2' : 'none',
                        padding: '12px 8px',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                      onClick={() => navigate(`/chat/${item.id}`)}
                    >                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        width: '100%',
                        gap: 2
                      }}>
                        {/* Foto de perfil a la izquierda */}
                        <Avatar 
                          src={otherUser?.profile_picture || undefined}
                          sx={{ width: 40, height: 40, flexShrink: 0 }}
                        >
                          {!otherUser?.profile_picture && otherUser?.username?.charAt(0).toUpperCase()}
                        </Avatar>
                        
                        {/* Contenido principal en el centro */}
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          {/* Nombre del producto */}
                          <Typography 
                            variant="subtitle2" 
                            sx={{ 
                              fontWeight: 'medium', 
                              mb: 0.5,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {item.product?.title || 'Sin producto'}
                          </Typography>
                          {/* Nombre de la persona */}
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {otherUser ? `${otherUser.username || 'Usuario'}` : ''}
                          </Typography>
                        </Box>
                        
                        {/* Badge de mensajes no leídos a la derecha */}
                        {unreadCount > 0 && (
                          <Badge 
                            badgeContent={unreadCount} 
                            color="primary"
                            sx={{ flexShrink: 0 }}
                          />
                        )}
                      </Box>
                    </List.Item>
                  );
                }}
              />
            )}
          </Box>
        )}

        {/* Área de chat */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>          {/* Header con botón de volver en móvil */}
          {isMobile && conversationId && (() => {
            const conv = conversations.find(c => String(c.id) === conversationId);
            const other = conv?.participants.find(p => p.id !== user?.id);
            
            console.log('Header móvil - Usuario encontrado:', {
              conversation: conv?.id,
              otherUser: other,
              profilePicture: other?.profile_picture
            });
              return (
              <Box sx={{ p:2, borderBottom:1, borderColor:'divider', display:'flex', alignItems:'center', gap:2 }}>
                <IconButton onClick={handleBackToConversations}><ArrowBackIcon /></IconButton>
                <Avatar 
                  src={other?.profile_picture || undefined} 
                  sx={{ width:40, height:40 }}
                >
                  {!other?.profile_picture && other?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h6">{conv?.product?.title || 'Chat'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {other?.username || 'Usuario'}
                  </Typography>
                </Box>
              </Box>
            );
          })()}          {/* Header desktop con foto de perfil */}
          {!isMobile && conversationId && (() => {
            const conv = conversations.find(c => String(c.id) === conversationId);
            const other = conv?.participants.find(p => p.id !== user?.id);
            
            console.log('Header desktop - Usuario encontrado:', {
              conversation: conv?.id,
              otherUser: other,
              profilePicture: other?.profile_picture
            });
              return (
              <Box sx={{ p:2, borderBottom:1, borderColor:'divider', display:'flex', alignItems:'center', gap:2 }}>
                <Avatar 
                  src={other?.profile_picture || undefined} 
                  sx={{ width:40, height:40 }}
                >
                  {!other?.profile_picture && other?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">{conv?.product?.title || 'Chat'}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {other?.username || 'Usuario'}
                  </Typography>
                </Box>
              </Box>
            );
          })()}

          <Box sx={{ 
            flexGrow: 1, 
            p: 2, 
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}>
            {loadingMsgs ? (
              <CircularProgress size={24} sx={{ alignSelf: 'center', my: 3 }} />
            ) : messages.length === 0 ? (
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ 
                  alignSelf: 'center', 
                  mt: 4 
                }}
              >
                No hay mensajes. Comienza la conversación.
              </Typography>            ) : (
              <>
                {messages.map((msg: Message, index: number) => {
                  const isCurrentUser = msg.sender === user?.id;
                  
                  // Verificar si necesitamos mostrar un separador de fecha
                  const showDateSeparator = index === 0 || !isSameDay(msg.created_at, messages[index - 1].created_at);
                  
                  return (
                    <React.Fragment key={msg.id}>
                      {/* Separador de fecha */}
                      {showDateSeparator && (
                        <Box 
                          sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            my: 3,
                            mx: 2
                          }}
                        >
                          <Box 
                            sx={{ 
                              flexGrow: 1, 
                              height: '1px', 
                              backgroundColor: '#e0e0e0' 
                            }} 
                          />
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              mx: 2, 
                              px: 2, 
                              py: 0.5, 
                              backgroundColor: '#f5f5f5', 
                              borderRadius: '12px',
                              color: '#666',
                              fontWeight: 'medium',
                              border: '1px solid #e0e0e0'
                            }}
                          >
                            {formatDateHeader(msg.created_at)}
                          </Typography>
                          <Box 
                            sx={{ 
                              flexGrow: 1, 
                              height: '1px', 
                              backgroundColor: '#e0e0e0' 
                            }} 
                          />
                        </Box>
                      )}
                      
                      {/* Mensaje */}                      <Box
                        sx={{
                          mb: 2,
                          p: 2,
                          backgroundColor: msg.is_deleted 
                            ? '#f5f5f5' 
                            : (isCurrentUser ? '#e3f2fd' : '#f5f5f5'),
                          color: msg.is_deleted 
                            ? '#999' 
                            : (isCurrentUser ? '#0d47a1' : '#333'),
                          borderRadius: isCurrentUser ? '20px 20px 0 20px' : '20px 20px 20px 0',
                          maxWidth: '70%',
                          alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          position: 'relative',
                          paddingRight: msg.is_deleted ? '16px' : (isCurrentUser ? '60px' : '50px'),
                          paddingTop: msg.is_deleted ? '16px' : (isCurrentUser ? '35px' : '35px'),
                          fontStyle: msg.is_deleted ? 'italic' : 'normal'
                        }}
                      >                      {/* Contenido del mensaje */}
                      {msg.is_deleted ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#999', fontStyle: 'italic' }}>
                            🗑️ Se ha eliminado un mensaje
                          </Typography>
                        </Box>
                      ) : msg.message_type === 'audio' ? (
                        <>
                          {/* Renderizar componente de audio */}
                          <AudioMessage
                            audioUrl={msg.audio_url || ''}
                            duration={msg.audio_duration}
                            isOwnMessage={isCurrentUser}
                            senderName={msg.sender_username}
                            timestamp={new Date(msg.created_at).toLocaleTimeString()}
                          />
                          {/* Metadatos como en texto */}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                              textAlign: isCurrentUser ? 'right' : 'left',
                              mt: 1
                            }}
                          >
                            {msg.sender_username} - {new Date(msg.created_at).toLocaleTimeString()}
                            {msg.is_edited && ' (editado)'}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>
                            {msg.content}
                          </Typography>
                          
                          {/* Metadatos */}
                          <Typography 
                            variant="caption" 
                            color="text.secondary" 
                            sx={{ 
                              display: 'block', 
                              textAlign: isCurrentUser ? 'right' : 'left',
                              mt: 1
                            }}
                          >
                            {msg.sender_username} - {new Date(msg.created_at).toLocaleTimeString()}
                            {msg.is_edited && ' (editado)'}
                          </Typography>
                        </>
                      )}{/* Indicador de likes para mensajes propios (superpuesto) */}
                      {!msg.is_deleted && isCurrentUser && msg.liked && msg.liked_by && msg.liked_by.length > 0 && (
                        <Box 
                          sx={{ 
                            position: 'absolute', 
                            bottom: -8, 
                            right: 16, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5,
                            backgroundColor: '#fff',
                            borderRadius: '12px',
                            padding: '2px 6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            border: '1px solid #e0e0e0'
                          }}
                        >
                          <Tooltip 
                            title={
                              msg.liked_by_users && msg.liked_by_users.length > 0 
                                ? <>
                                    
                                    <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                                      {msg.liked_by_users.map(user => (
                                        <li key={user.id}>
                                          <Typography variant="caption">{user.username}</Typography>
                                        </li>
                                      ))}
                                    </ul>
                                  </>
                                : `${msg.liked_by.length} persona${msg.liked_by.length > 1 ? 's' : ''} ${msg.liked_by.length > 1 ? 'han' : 'ha'} dado like a este mensaje`
                            }
                            arrow
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <ThumbUpIcon fontSize="small" sx={{ color: '#1976d2', fontSize: '0.8rem' }} />
                              <Typography variant="caption" sx={{ color: '#1976d2', fontSize: '0.75rem' }}>
                                {msg.liked_by.length}
                              </Typography>
                            </Box>
                          </Tooltip>
                        </Box>
                      )}                      {/* Botón de like para mensajes de otros usuarios */}
                      {!msg.is_deleted && !isCurrentUser && (
                        <>
                          <Tooltip title="Me gusta">
                            <IconButton
                              size="small"
                              onClick={() => handleLikeMessage(msg.id)}
                              sx={{
                                position: 'absolute',
                                top: 8,
                                right: 8,
                                backgroundColor: 'transparent',
                                '&:hover': { backgroundColor: 'transparent' }
                              }}
                            >
                              {msg.liked ? 
                                <ThumbUpIcon fontSize="small" color="primary" /> : 
                                <ThumbUpOutlinedIcon fontSize="small" />
                              }
                            </IconButton>
                          </Tooltip>
                          
                          {/* Indicador de likes superpuesto para mensajes de otros */}
                          {msg.liked && msg.liked_by_users && msg.liked_by_users.filter(u => u.id !== user?.id).length > 0 && (
                            <Box 
                              sx={{ 
                                position: 'absolute', 
                                bottom: -8, 
                                right: 16, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 0.5,
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                padding: '2px 6px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                border: '1px solid #e0e0e0'
                              }}
                            >
                              <Tooltip 
                                title={
                                  <>
                                    <Typography variant="caption" component="div">
                                      {msg.liked_by_users.filter(u => u.id !== user?.id).length > 1 
                                        ? 'Otras personas que han dado like:' 
                                        : 'Otra persona que ha dado like:'}
                                    </Typography>
                                    <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                                      {msg.liked_by_users
                                        .filter(u => u.id !== user?.id)
                                        .map(user => (
                                          <li key={user.id}>
                                            <Typography variant="caption">{user.username}</Typography>
                                          </li>
                                        ))}
                                    </ul>
                                  </>
                                }
                                arrow
                                placement="left"
                              >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <ThumbUpIcon fontSize="small" sx={{ color: '#1976d2', fontSize: '0.8rem' }} />
                                  <Typography variant="caption" sx={{ color: '#1976d2', fontSize: '0.75rem' }}>
                                    {msg.liked_by_users.filter(u => u.id !== user?.id).length}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            </Box>
                          )}
                        </>
                      )}
                        {/* Botones de acción solo para mensajes propios */}
                      {!msg.is_deleted && isCurrentUser && (
                        <IconButton
                          size="small"
                          sx={{ 
                            position: 'absolute', 
                            top: 8, 
                            right: 8,
                            backgroundColor: 'transparent',
                            '&:hover': { backgroundColor: 'transparent' }
                          }}
                          onClick={(e) => handleMenuOpen(e, msg.id)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Box>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
                  {/* Menú contextual para acciones en mensajes */}
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  {(() => {
                    const selectedMessage = messages.find(msg => msg.id === selectedMessageId);
                    const isTextMessage = selectedMessage?.message_type !== 'audio';
                    
                    return (
                      <>
                        {/* Solo mostrar opción de editar para mensajes de texto */}
                        {isTextMessage && (
                          <MenuItem onClick={handleEditStart}>
                            <EditIcon fontSize="small" sx={{ mr: 1 }} />
                            Editar mensaje
                          </MenuItem>
                        )}
                        <MenuItem onClick={handleDeleteMessage}>
                          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                          Eliminar mensaje
                        </MenuItem>
                      </>
                    );
                  })()}
                </Menu>
              </>
            )}
          </Box>          {/* Input de mensaje */}
          {conversationId && (
            <Box 
              sx={{ 
                borderTop: 1, 
                borderColor: 'divider', 
                width: '100%',
                padding: 0,
                pb:0,
                mb:0
              }}
            >
              <MessageInput
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSend}
                onSendAudio={handleSendAudio}
                editingMessageId={editingMessageId}
                onEditCancel={handleEditCancel}
              />
            </Box>
          )}
        </Box>
      </Box>

      {/* Diálogo de confirmación para eliminar mensaje */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteMessage}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"¿Eliminar mensaje?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Este mensaje se eliminará para todos. Los demás participantes verán "Se ha eliminado un mensaje".
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDeleteMessage} color="inherit">
            Cancelar
          </Button>
          <Button onClick={confirmDeleteMessage} color="error" autoFocus>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ChatPage;