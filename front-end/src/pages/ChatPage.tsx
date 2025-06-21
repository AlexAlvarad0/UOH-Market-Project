import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth.hooks';
import { useWebSocket } from '../hooks/useWebSocket';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  MoreVert as MoreVertIcon, 
  ThumbUp as ThumbUpIcon, 
  ThumbUpOutlined as ThumbUpOutlinedIcon,
  ArrowBack as ArrowBackIcon,
  DoneAll as DoneAllIcon
} from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';
import AudioMessage from '../components/AudioMessage';
import MessageInput from '../components/MessageInput';
import SwipeableMessage from '../components/SwipeableMessage';

// Componente memoizado para el indicador de typing
const TypingIndicator = React.memo(({ typingUsers }: { typingUsers: string[] }) => {
  if (typingUsers.length === 0) return null;
  
  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1, px: 2 }}>
      <Box sx={{ 
        backgroundColor: 'grey.100', 
        borderRadius: 2, 
        px: 2, 
        py: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          {typingUsers.length === 1 
            ? `${typingUsers[0]} está escribiendo...`
            : `${typingUsers.slice(0, -1).join(', ')} y ${typingUsers.slice(-1)} están escribiendo...`
          }
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.2 }}>
          <Box sx={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            animation: 'typing 1.4s infinite ease-in-out'
          }} />
          <Box sx={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            animation: 'typing 1.4s infinite ease-in-out',
            animationDelay: '0.2s'
          }} />
          <Box sx={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: 'primary.main',
            animation: 'typing 1.4s infinite ease-in-out',
            animationDelay: '0.4s'
          }} />
        </Box>
        <style>
          {`
            @keyframes typing {
              0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.4;
              }
              30% {
                transform: translateY(-10px);
                opacity: 1;
              }
            }
          `}
        </style>
      </Box>
    </Box>
  );
});

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
    reply_to?: number;
    reply_to_message?: {
      id: number;
      sender_username: string;
      content: string;
      message_type: 'text' | 'audio';
      audio_duration?: number;
      created_at: string;
      is_deleted: boolean;
    };
    created_at: string;
    edited_at: string | null;
    is_edited: boolean;
    liked: boolean;
    liked_by?: number[];
    liked_by_users?: Array<{id: number, username: string}>;
    is_deleted?: boolean;
    is_read?: boolean;
  }

  interface Participant {
    id: number;
    username: string;
    profile_picture?: string;
  }
  interface Product {
    id: number;
    title: string;
  }
  interface Conversation {
    id: number;
    participants: Participant[];
    product?: Product;
    unread_count?: number;
    updated_at: string;
    latest_message?: Message | null;
  }

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);  // Estado para edición de mensajes
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  
  // Estado para respuestas de mensajes
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  
  // Estado para diálogo de confirmación de eliminación
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);  // Estado para indicador de escritura
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // WebSocket hook - solo conectar si tenemos conversationId válido
  const {
    sendMessage: sendWSMessage,
    markAsRead,
    addChatMessageListener,
    addConversationListener,
    isConnected
  } = useWebSocket(conversationId || null, localStorage.getItem('authToken'));

  // Función para actualizar la lista de conversaciones (y sus contadores)
  // Usar useCallback con dependencias vacías para evitar recreación constante
  const refreshConversations = useCallback(async () => {
    try {
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
        
        // Filtrar conversaciones vacías (sin mensajes)
        convs = convs.filter((conv: Conversation) => conv.latest_message !== null && conv.latest_message !== undefined);
        
        // Ordenar conversaciones por fecha de actualización
        convs.sort((a: { updated_at: string }, b: { updated_at: string }) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
        
        setConversations(convs);
      }    } catch {
      // Error silenciado para mejor rendimiento
    }
  }, []); // Sin dependencias para evitar recreación
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

        // Filtrar conversaciones vacías (sin mensajes)
        convs = convs.filter((conv: Conversation) => conv.latest_message !== null && conv.latest_message !== undefined);

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
  }, []);  // Cargar mensajes de la conversación seleccionada
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setReplyingToMessage(null);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMsgs(true);
      setReplyingToMessage(null);
      
      try {
        const res = await api.getMessages(Number(conversationId));
        if (res.success) {
          setMessages(res.data);
        }      } catch {
        // Error silenciado para mejor rendimiento
      } finally {
        setLoadingMsgs(false);
      }
        // Scroll al final de los mensajes solo una vez
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' }); // Scroll inmediato, sin animation
      }
    };
    
    fetchMessages();  }, [conversationId]); // Remover refreshConversations de dependencias

  // WebSocket listeners para mensajes en tiempo real
  useEffect(() => {
    if (!conversationId) return;

    // Listener para nuevos mensajes
    const unsubscribeNewMessage = addChatMessageListener('new_message', (data) => {
      const newMessage = data.message;
      
      setMessages(prev => {
        // Evitar duplicados
        if (prev.some(msg => msg.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage];
      });      // Auto-scroll solo para mensajes nuevos, sin timeout para mejor rendimiento
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }

      // Solo refrescar conversaciones ocasionalmente, no en cada mensaje
      // Se actualiza via listener de conversación
    });// Listener para mensajes editados
    const unsubscribeEditMessage = addChatMessageListener('message_edited', (data) => {
      const editedMessage = data.message;
      
      // Solo procesar la edición si NO fue hecha por el usuario actual
      // Si fue hecha por el usuario actual, ya se actualizó localmente en handleSend
      if (editedMessage.sender !== user?.id) {
        setMessages(prev => 
          prev.map(msg => {
            if (msg.id === editedMessage.id) {
              // Si el mensaje editado tiene datos incompletos, preservar los originales
              if (!editedMessage.created_at || !editedMessage.sender) {
                return {
                  ...msg, // Mantener todos los datos originales
                  content: editedMessage.content || msg.content, // Solo actualizar contenido
                  is_edited: true,
                  edited_at: editedMessage.edited_at || new Date().toISOString()
                };
              }
              return editedMessage;
            }
            return msg;
          })
        );
      }
    });// Listener para mensajes eliminados
    const unsubscribeDeleteMessage = addChatMessageListener('message_deleted', (data) => {
      const messageId = data.message_id;
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, is_deleted: true };
          }
          return msg;
        })
      );});    // Listener para likes de mensajes
    const unsubscribeLikes = addChatMessageListener('message_like', (data) => {
      const { message_id, liked_by, liked_by_users, liked } = data;
      
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === message_id) {
            return {
              ...msg,
              liked: liked,
              liked_by: liked_by || [],
              liked_by_users: liked_by_users || []
            };
          }
          return msg;
        })
      );
    });    // Listener para indicador de escritura
    const unsubscribeTyping = addChatMessageListener('typing', (data) => {
      const { username, is_typing, user_id } = data;
      
      // Solo procesar el evento si NO es del usuario actual
      if (user_id !== user?.id) {
        setTypingUsers(prev => {
          if (is_typing) {
            return prev.includes(username) ? prev : [...prev, username];
          } else {
            return prev.filter(u => u !== username);
          }
        });        // Limpiar indicador después de 3 segundos sin timeout anidado
        if (is_typing) {
          setTimeout(() => {
            setTypingUsers(prev => prev.filter(u => u !== username));
          }, 3000);
        }
      }
    });    // Listener para mensajes leídos
    const unsubscribeRead = addChatMessageListener('message_read', (data) => {
      const { message_id, user_id } = data;
      
      // Solo procesar si el mensaje fue leído por otro usuario (no por mí mismo)
      if (user_id !== user?.id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message_id ? { ...msg, is_read: true } : msg
          )
        );
      }
    });    return () => {
      unsubscribeNewMessage();
      unsubscribeEditMessage();
      unsubscribeDeleteMessage();
      unsubscribeLikes();
      unsubscribeTyping();
      unsubscribeRead();
    };
  }, [conversationId, addChatMessageListener, user?.id]); // Remover refreshConversations

  // WebSocket listeners para actualizaciones de conversaciones
  useEffect(() => {
    // Listener para nuevas conversaciones
    const unsubscribeNewConv = addConversationListener('new_conversation', (data) => {
      const newConversation = data.conversation;
      setConversations(prev => {
        // Evitar duplicados
        if (prev.some(conv => conv.id === newConversation.id)) {
          return prev;
        }
        return [newConversation, ...prev];
      });
    });

    // Listener para actualizaciones de conversación
    const unsubscribeUpdateConv = addConversationListener('conversation_updated', (data) => {
      const { conversation_id, latest_message, unread_count } = data;
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === conversation_id) {
            return {
              ...conv,
              latest_message,
              unread_count,
              updated_at: new Date().toISOString()
            };
          }
          return conv;
        }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      );
    });

    return () => {
      unsubscribeNewConv();
      unsubscribeUpdateConv();
    };
  }, [addConversationListener]);

  // Marcar mensajes como leídos cuando se abre una conversación
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const unreadMessages = messages.filter(msg => 
      !msg.is_read && msg.sender !== user?.id
    );

    unreadMessages.forEach(msg => {
      markAsRead(msg.id);
    });  }, [messages, conversationId, user?.id, markAsRead]);

  // Funciones para el menú contextual
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, messageId: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageId(messageId);
  };  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageId(null);
  };  // Iniciar edición de un mensaje
  const handleEditStart = () => {
    if (!selectedMessageId) return;
    
    const messageToEdit = messages.find(msg => msg.id === selectedMessageId);
    if (messageToEdit) {      // No permitir editar mensajes de audio
      if (messageToEdit.message_type === 'audio') {
        handleMenuClose();
        return;
      }
      
      setEditingMessageId(selectedMessageId);
      setMessage(messageToEdit.content);
      handleMenuClose();
    }
  };

  // Cancelar edición de mensaje
  const handleEditCancel = () => {
    setEditingMessageId(null);
    setMessage('');
  };  // Función para mostrar diálogo de confirmación de eliminación
  const handleDeleteMessage = () => {
    setDeleteDialogOpen(true);
    // NO llamar handleMenuClose() aquí para mantener selectedMessageId
    setAnchorEl(null); // Solo cerrar el menú visual
  };// Confirmar eliminación del mensaje
  const confirmDeleteMessage = async () => {
    if (!selectedMessageId) {
      return;
    }
    
    const res = await api.deleteMessage(selectedMessageId);
    
    if (res.success) {
      // Actualizar inmediatamente el estado local
      setMessages(prev => 
        prev.map(msg => 
          msg.id === selectedMessageId ? { ...msg, is_deleted: true } : msg
        )
      );
        // Actualizar conversaciones
      refreshConversations();
    }
    
    setDeleteDialogOpen(false);
    setSelectedMessageId(null);
  };
  // Cancelar eliminación del mensaje
  const cancelDeleteMessage = () => {
    setDeleteDialogOpen(false);
    setSelectedMessageId(null);
  };

  // Función para iniciar respuesta a un mensaje
  const handleReplyToMessage = (message: Message) => {
    setReplyingToMessage(message);
    handleMenuClose();
  };

  // Función para cancelar respuesta
  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };  // Modificar handleSend para manejar también la edición y respuestas
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();    // Si estamos editando un mensaje
    if (editingMessageId) {
      if (!message.trim()) return;      // Usar API REST para editar
      const res = await api.updateMessage(editingMessageId, message);
      if (res.success) {        // Actualizar inmediatamente el estado local
        setMessages(prev => 
          prev.map(msg => 
            msg.id === editingMessageId ? { 
              ...msg, 
              content: message, 
              is_edited: true, 
              edited_at: new Date().toISOString() 
            } : msg
          )
        );
        
        // NO refrescar conversaciones aquí para mejor rendimiento
        // La actualización llegará por WebSocket si es necesario
      }
      
      // Limpiar estado de edición
      setEditingMessageId(null);
      setMessage('');
    }
    // Si estamos enviando un mensaje nuevo
    else {
      if (!message.trim() || !conversationId) return;
      
      // Enviar mensaje con respuesta si hay una seleccionada
      if (replyingToMessage) {
        await handleSendReply(message);
      } else {
        // Usar WebSocket para enviar mensaje normal
        sendWSMessage(message, 'text');
      }
      
      setMessage('');
      setReplyingToMessage(null);
    }    // Scroll al final de los mensajes (solo si no estamos editando)
    if (!editingMessageId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  };

  // Función para enviar respuesta a un mensaje
  const handleSendReply = async (content: string) => {
    if (!conversationId || !replyingToMessage) return;
      try {
      const res = await api.sendMessage(Number(conversationId), content, replyingToMessage.id);      if (res.success) {
        // El mensaje llegará por WebSocket, no necesitamos agregarlo manualmente
        // NO refrescar conversaciones aquí para mejor rendimiento
      }} catch {
      // Error handling for reply message
    }
  };  // Función para enviar mensaje de audio
  const handleSendAudio = async (audioFile: File, duration: number) => {
    if (!conversationId) return;
    
    try {
      const res = await api.sendAudioMessage(Number(conversationId), audioFile, duration);
      if (res.success) {        // NO agregar el mensaje localmente aquí, ya que llegará por WebSocket
        // Esto evita la duplicación del audio
        
        // NO actualizar conversaciones aquí para mejor rendimiento
          // Scroll al final con mejor rendimiento
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }}    } catch {
      // Error handling for audio message
    }
  };
  // Función para dar like a un mensaje
  const handleLikeMessage = async (messageId: number) => {
    // Usar API REST en lugar de WebSocket para mayor confiabilidad
    const res = await api.likeMessage(messageId);
    if (res.success) {
      // Actualizar inmediatamente el estado local
      setMessages(prev => 
        prev.map(msg => {
          if (msg.id === messageId) {
            return {
              ...msg,
              liked_by: res.data.liked_by || [],
              liked: res.data.liked,
              liked_by_users: res.data.liked_by_users || []
            };
          }
          return msg;
        })
      );
    }
  };
  
  // Función para volver a la lista de conversaciones en móvil
  const handleBackToConversations = () => {
    navigate('/chat');
  };  // Funciones memoizadas para formateo de fechas para evitar recálculos
  const formatDateHeader = useCallback((date: string) => {
    if (!date) {
      return 'Fecha desconocida';
    }
    
    const messageDate = new Date(date);
    
    // Verificar si la fecha es válida
    if (isNaN(messageDate.getTime())) {
      return 'Fecha inválida';
    }
    
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
  }, []);

  // Función para formatear la hora de manera segura
  const formatMessageTime = useCallback((date: string) => {
    if (!date) {
      return '--:--';
    }
    
    const messageDate = new Date(date);
    
    // Verificar si la fecha es válida
    if (isNaN(messageDate.getTime())) {
      return '--:--';
    }
    
    return messageDate.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Función para verificar si dos mensajes son del mismo día
  const isSameDay = useCallback((date1: string, date2: string) => {
    if (!date1 || !date2) {
      return false;
    }
    
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Verificar si las fechas son válidas
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      return false;
    }
    
    return d1.getDate() === d2.getDate() && 
           d1.getMonth() === d2.getMonth() && 
           d1.getFullYear() === d2.getFullYear();
  }, []);

  // Renderizar solo lista de conversaciones en móvil cuando no hay conversación seleccionada
  if (isMobile && !conversationId) {
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
          overflow: 'hidden'
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Conversaciones
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
          {loadingConvs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <CircularProgress />
            </Box>
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={conversations}
              renderItem={(item: { id: number; participants: { id: number; username: string; profile_picture?: string }[]; product?: { id: number; title: string }; unread_count?: number }) => {
                const otherUser = item.participants.find((u: { id: number; username: string; profile_picture?: string }) => u.id !== user?.id);
                const unreadCount = item.unread_count || 0;
                
                return (
                  <List.Item
                    key={item.id}
                    onClick={() => navigate(`/chat/${item.id}`)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: 'transparent',
                      padding: '16px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      border: '1px solid #e0e0e0'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Badge badgeContent={unreadCount} color="error">
                          <Avatar 
                            src={otherUser?.profile_picture || undefined}
                            sx={{ width: 50, height: 50 }}
                          >
                            {!otherUser?.profile_picture && otherUser?.username?.charAt(0).toUpperCase()}
                          </Avatar>
                        </Badge>
                      }
                      title={
                        <Typography variant="subtitle1" component="span">
                          {item.product?.title || 'Chat'}
                        </Typography>
                      }
                      description={otherUser?.username || 'Usuario'}
                    />
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
        overflow: 'hidden'
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
            ) : (
              <List
                itemLayout="horizontal"
                dataSource={conversations}                renderItem={(item: { id: number; participants: { id: number; username: string; profile_picture?: string }[]; product?: { id: number; title: string }; unread_count?: number }) => {
                  const otherUser = item.participants.find((u: { id: number; username: string; profile_picture?: string }) => u.id !== user?.id);
                  const unreadCount = item.unread_count || 0;
                  
                  return (
                    <List.Item
                      key={item.id}
                      onClick={() => navigate(`/chat/${item.id}`)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: String(item.id) === conversationId ? '#f5f5f5' : 'transparent',
                        padding: '16px',
                        borderRadius: '8px',
                        marginBottom: '8px'
                      }}
                    >
                      <List.Item.Meta
                        avatar={
                          <Badge badgeContent={unreadCount} color="error">
                            <Avatar 
                              src={otherUser?.profile_picture || undefined}
                              sx={{ width: 50, height: 50 }}
                            >
                              {!otherUser?.profile_picture && otherUser?.username?.charAt(0).toUpperCase()}
                            </Avatar>
                          </Badge>
                        }
                        title={
                          <Link 
                            to={item.product ? `/products/${item.product.id}` : '#'} 
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Typography variant="subtitle1" component="span">
                              {item.product?.title || 'Chat'}
                            </Typography>
                          </Link>
                        }
                        description={otherUser?.username || 'Usuario'}
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </Box>
        )}

        {/* Área de chat */}
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header con botón de volver en móvil */}
          {isMobile && conversationId && (() => {
            const conv = conversations.find(c => String(c.id) === conversationId);
            const other = conv?.participants.find(p => p.id !== user?.id);
            
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
                  <Link to={conv?.product ? `/products/${conv.product.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="h6">{conv?.product?.title || 'Chat'}</Typography>
                  </Link>
                  <Typography variant="caption" color="text.secondary">
                    {other?.username || 'Usuario'}
                  </Typography>
                </Box>
              </Box>
            );
          })()}

          {/* Header desktop con foto de perfil */}
          {!isMobile && conversationId && (() => {
            const conv = conversations.find(c => String(c.id) === conversationId);
            const other = conv?.participants.find(p => p.id !== user?.id);
            
            return (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={other?.profile_picture || undefined} 
                  sx={{ width: 40, height: 40 }}
                >
                  {!other?.profile_picture && other?.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Link to={conv?.product ? `/products/${conv.product.id}` : '#'} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <Typography variant="h6">{conv?.product?.title || 'Chat'}</Typography>
                  </Link>
                  <Typography variant="caption" color="text.secondary">
                    {other?.username || 'Usuario'}
                  </Typography>
                </Box>
                {/* Indicador de conexión WebSocket */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box 
                    sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: isConnected ? 'green' : 'red' 
                    }} 
                  />
                  <Typography variant="caption" color="text.secondary">
                    {isConnected ? 'En línea' : 'Desconectado'}
                  </Typography>
                </Box>
              </Box>
            );
          })()}          <Box sx={{ 
            flexGrow: 1, 
            p: { xs: 1, md: 2 }, // Menos padding en móvil
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'visible', // Permitir overflow horizontal para iconos
            // Agregar padding extra para evitar que se corten los elementos
            py: { xs: 2, md: 3 } // Menos padding vertical en móvil
          }}>
            {loadingMsgs ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : !conversationId ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Typography variant="h6" color="text.secondary">
                  {isMobile ? 'Selecciona una conversación' : 'Selecciona una conversación para empezar a chatear'}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ flexGrow: 1 }}>                {messages.map((msg, index) => {
                  const isOwnMessage = msg.sender === user?.id;
                  const showDateHeader = index === 0 || !isSameDay(msg.created_at, messages[index - 1].created_at);if (msg.is_deleted) {                    return (
                      <Box key={msg.id} sx={{ 
                        mb: 1,
                        // Márgenes iguales - más pequeños en móvil para evitar solapamiento
                        mx: { xs: '8px', md: '15px' }
                      }}>
                        {showDateHeader && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                            <Typography variant="caption" sx={{ backgroundColor: 'grey.200', px: 2, py: 0.5, borderRadius: 2 }}>
                              {formatDateHeader(msg.created_at)}
                            </Typography>
                          </Box>
                        )}                        <SwipeableMessage
                          onReply={() => handleReplyToMessage(msg)}
                          isOwnMessage={isOwnMessage}
                          disabled={true} // Los mensajes eliminados no se pueden responder
                        >
                          <Box sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', mb: 0.5 }}>
                            <Box sx={{ maxWidth: '70%' }}>
                              <Box
                                sx={{
                                  backgroundColor: 'grey.100',
                                  color: 'text.secondary',
                                  p: 1,
                                  borderRadius: 10,
                                  border: '1px solid',
                                  borderColor: 'grey.300',
                                  wordBreak: 'break-word'
                                }}
                              >
                                <Typography variant="body2" sx={{ fontStyle: 'italic', opacity: 0.8 }}>
                                  🗑️ Mensaje eliminado
                                </Typography>
                              </Box>
                            </Box>                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', px: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {msg.sender_username} • {formatMessageTime(msg.created_at)}
                              </Typography>
                              {/* Indicador de lectura para mensajes propios eliminados */}
                              {isOwnMessage && msg.is_read && (
                                <DoneAllIcon sx={{ 
                                  fontSize: 12, 
                                  color: '#004f9e',
                                  ml: 0.5
                                }} />
                              )}
                            </Box>
                          </Box>
                        </SwipeableMessage>
                      </Box>
                    );
                  }                  return (
                    // Wrapper de mensaje con overflow visible
                    <Box key={msg.id} sx={{
                      mb: 1,
                      position: 'relative',
                      overflow: 'visible',
                      // Márgenes iguales - más pequeños en móvil para evitar solapamiento
                      mx: { xs: '8px', md: '15px' }
                    }}>
                      {showDateHeader && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                          <Typography variant="caption" sx={{ backgroundColor: 'grey.200', px: 2, py: 0.5, borderRadius: 2 }}>
                            {formatDateHeader(msg.created_at)}
                          </Typography>
                        </Box>
                      )}                        <SwipeableMessage
                          onReply={() => handleReplyToMessage(msg)}
                          isOwnMessage={isOwnMessage}
                          disabled={false} // Permitir swipe en todos los mensajes normales
                        >
                          <Box sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', mb: 0.5 }}>
                            <Box sx={{ 
                              maxWidth: '70%', 
                              position: 'relative'
                            }} className="group">                          {msg.message_type === 'audio' ? (
                            <AudioMessage
                              audioUrl={msg.audio_url || ''}
                              duration={msg.audio_duration || 0}
                              isOwnMessage={isOwnMessage}
                            />
                          ) : (
                            <Box
                              sx={{
                                backgroundColor: isOwnMessage ? 'primary.main' : 'grey.200',
                                color: isOwnMessage ? 'white' : 'text.primary',
                                p: 1.5,
                                borderRadius: 2,
                                position: 'relative',
                                wordBreak: 'break-word'
                              }}
                            >                              {/* Mostrar mensaje de respuesta si existe */}
                              {msg.reply_to_message && (
                                <Box
                                  sx={{
                                    backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                                    border: `2px solid ${isOwnMessage ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}`,
                                    borderRadius: 1,
                                    p: 1,
                                    mb: 1,
                                    fontSize: '0.875rem'
                                  }}
                                >
                                    <Typography variant="caption" sx={{ 
                                      fontWeight: 'bold',
                                      color: isOwnMessage ? 'rgba(255,255,255,0.9)' : 'text.secondary',
                                      display: 'block'
                                    }}>
                                      {msg.reply_to_message.sender_username}
                                    </Typography>
                                    <Typography variant="body2" sx={{ 
                                      color: isOwnMessage ? 'rgba(255,255,255,0.8)' : 'text.secondary',
                                      fontStyle: msg.reply_to_message.is_deleted ? 'italic' : 'normal',
                                      opacity: msg.reply_to_message.is_deleted ? 0.7 : 1
                                    }}>
                                      {msg.reply_to_message.is_deleted 
                                        ? '🗑️ Mensaje eliminado'
                                        : msg.reply_to_message.message_type === 'audio' 
                                          ? `🎵 Audio (${msg.reply_to_message.audio_duration}s)`
                                          : msg.reply_to_message.content
                                      }                                    </Typography>
                                  </Box>
                              )}
                              
                              <Typography variant="body2">
                                {msg.content}
                              </Typography>
                              {msg.is_edited && (
                                <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                                  (editado)
                                </Typography>
                              )}
                            </Box>
                          )}                          {/* Menú contextual para mensajes propios (tanto texto como audio) */}
                          {isOwnMessage && (
                            <IconButton
                              size="small"
                              sx={{ 
                                position: 'absolute', 
                                top: -12, // Posición más arriba - mitad afuera del mensaje
                                right: -12, // Posición más a la derecha - mitad afuera del mensaje
                                opacity: 1, // Siempre visible
                                backgroundColor: '#eeeeee',
                                border: '1px solid #e0e0e0',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                '&:hover': { 
                                  backgroundColor: 'grey.100',
                                  transform: 'scale(1.05)'
                                },
                                zIndex: 10, // Asegurar que esté por encima de otros elementos
                                width: 24, // Hacer el botón más pequeño
                                height: 24,
                                minWidth: 24
                              }}
                              onClick={(e) => handleMenuOpen(e, msg.id)}
                            >
                              <MoreVertIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          )}
                            {/* Información de likes - mostrar para todos los mensajes */}
                          {msg.liked_by && msg.liked_by.length > 0 && (
                            <Box sx={{ 
                              position: 'absolute', 
                              bottom: -12, 
                              right: isOwnMessage ? -12 : -12,
                              display: 'flex',
                              alignItems: 'center',
                              mr: 1 // Margen para separar del contenido
                            }}>
                              {/* Para mensajes propios: solo mostrar info de likes */}
                              {isOwnMessage ? (
                                <Tooltip title={`Le gustó a: ${msg.liked_by_users?.map(u => u.username).join(', ') || ''}`}>
                                  <Box sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    backgroundColor: 'background.paper',
                                    borderRadius: '50%',
                                    width: 32,
                                    height: 32,
                                    justifyContent: 'center',
                                    border: '1px solid #e0e0e0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}>
                                    <ThumbUpIcon sx={{ fontSize: 14 }} color="primary" />
                                    {msg.liked_by.length > 1 && (
                                      <Typography variant="caption" sx={{ ml: 0.3, fontSize: '0.6rem', fontWeight: 'bold' }}>
                                        {msg.liked_by.length}
                                      </Typography>
                                    )}
                                  </Box>
                                </Tooltip>
                              ) : (
                                /* Para mensajes de otros: botón de like funcional */
                                <>
                                  <Tooltip title={msg.liked_by_users?.map(u => u.username).join(', ') || ''}>
                                    <IconButton
                                      size="small"
                                      sx={{ 
                                        backgroundColor: 'background.paper',
                                        width: 32,
                                        height: 32,
                                        border: '1px solid #e0e0e0',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        '&:hover': { 
                                          backgroundColor: 'grey.100',
                                          transform: 'scale(1.05)'
                                        }
                                      }}
                                      onClick={() => handleLikeMessage(msg.id)}
                                    >
                                      {msg.liked_by?.includes(user?.id || 0) ? (
                                        <ThumbUpIcon sx={{ fontSize: 14 }} color="primary" />
                                      ) : (
                                        <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  {msg.liked_by.length > 1 && (
                                    <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.6rem', fontWeight: 'bold' }}>
                                      {msg.liked_by.length}
                                    </Typography>
                                  )}
                                </>
                              )}
                            </Box>
                          )}
                          
                          {/* Botón de like para mensajes de otros usuarios (cuando no hay likes aún) */}
                          {!isOwnMessage && (!msg.liked_by || msg.liked_by.length === 0) && (
                            <Box sx={{ 
                              position: 'absolute', 
                              bottom: -12, 
                              right: -12,
                              display: 'flex',
                              alignItems: 'center',
                              mr: 1 // Margen para separar del contenido
                            }}>
                              <IconButton
                                size="small"
                                sx={{ 
                                  backgroundColor: 'background.paper',
                                  width: 32,
                                  height: 32,
                                  border: '1px solid #e0e0e0',
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                  '&:hover': { 
                                    backgroundColor: 'grey.100',
                                    transform: 'scale(1.05)'
                                  }
                                }}
                                onClick={() => handleLikeMessage(msg.id)}
                              >
                                <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
                              </IconButton>
                            </Box>
                          )}                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start', px: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {msg.sender_username} • {formatMessageTime(msg.created_at)}
                          </Typography>
                          {/* Indicador de lectura para mensajes propios */}
                          {isOwnMessage && msg.is_read && (
                            <DoneAllIcon sx={{ 
                              fontSize: 12, 
                              color: '#004f9e',
                              ml: 0.5
                            }} />
                          )}
                        </Box>
                      </Box>
                      </SwipeableMessage>
                    </Box>
                  );
                })}                  {/* Indicador de escritura usando componente memoizado */}
                <TypingIndicator typingUsers={typingUsers} />
                
                <div ref={messagesEndRef} />
              </Box>
            )}
          </Box>          {/* Input de mensaje */}
          {conversationId && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>              <MessageInput
                message={message}
                setMessage={setMessage}
                onSendMessage={handleSend}
                onSendAudio={handleSendAudio}
                onTyping={() => {}} // Función dummy para evitar error por ahora
                editingMessageId={editingMessageId}
                onEditCancel={handleEditCancel}
                replyingToMessage={replyingToMessage}
                onCancelReply={handleCancelReply}
              />
            </Box>
          )}
        </Box>
      </Box>      {/* Menú contextual */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {/* Mostrar opción de editar solo para mensajes de texto */}
        {selectedMessageId && messages.find(msg => msg.id === selectedMessageId)?.message_type !== 'audio' && (
          <MenuItem onClick={handleEditStart}>
            <EditIcon sx={{ mr: 1 }} fontSize="small" />
            Editar
          </MenuItem>
        )}
        {/* Opción de eliminar para todos los tipos de mensaje */}
        <MenuItem onClick={handleDeleteMessage}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Eliminar
        </MenuItem>
      </Menu>

      {/* Diálogo de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDeleteMessage}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.
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