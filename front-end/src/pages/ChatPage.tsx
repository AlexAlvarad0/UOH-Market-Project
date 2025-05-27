import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Badge, CircularProgress, Container, useMediaQuery, useTheme } from '@mui/material';
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
  Close as CloseIcon,
  Send as SendIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  interface Message {
    id: number;
    sender: number;
    sender_username: string;
    content: string;
    created_at: string;
    edited_at: string | null;
    is_edited: boolean;
    liked: boolean;
    liked_by?: number[];
    liked_by_users?: Array<{id: number, username: string}>;
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
      setEditingMessageId(selectedMessageId);
      setMessage(messageToEdit.content); // Colocar el contenido en el input
    }
    
    handleMenuClose();
  };

  // Cancelar edición
  const handleEditCancel = () => {
    setEditingMessageId(null);
    setMessage('');
  };

  // Eliminar mensaje
  const handleDeleteMessage = async () => {
    if (!selectedMessageId) return;
    
    const res = await api.deleteMessage(selectedMessageId);
    if (res.success) {
      // Eliminar mensaje de la lista
      setMessages(prev => prev.filter(msg => msg.id !== selectedMessageId));
      // Actualizar conversaciones
      refreshConversations();
    }
    
    handleMenuClose();
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
        height: '100vh',
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
              </Typography>
            ) : (
              <>
                {messages.map((msg: Message) => {
                  const isCurrentUser = msg.sender === user?.id;
                  return (
                    <Box
                      key={msg.id}
                      sx={{
                        mb: 2,
                        p: 2,
                        backgroundColor: isCurrentUser ? '#e3f2fd' : '#f5f5f5',
                        color: isCurrentUser ? '#0d47a1' : '#333',
                        borderRadius: isCurrentUser ? '20px 20px 0 20px' : '20px 20px 20px 0',
                        maxWidth: '70%',
                        alignSelf: isCurrentUser ? 'flex-end' : 'flex-start',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        position: 'relative',
                        paddingRight: isCurrentUser ? '60px' : '50px', // Espacio para botones
                        paddingTop: isCurrentUser ? '35px' : '35px' // Espacio para botones superiores
                      }}
                    >
                      {/* Contenido del mensaje */}
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

                      {/* Indicador de likes para mensajes propios (superpuesto) */}
                      {isCurrentUser && msg.liked && msg.liked_by && msg.liked_by.length > 0 && (
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
                      )}

                      {/* Botón de like para mensajes de otros usuarios */}
                      {!isCurrentUser && (
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
                      {isCurrentUser && (
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
                  );
                })}
                <div ref={messagesEndRef} />
                
                {/* Menú contextual para acciones en mensajes */}
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleEditStart}>
                    <EditIcon fontSize="small" sx={{ mr: 1 }} />
                    Editar mensaje
                  </MenuItem>
                  <MenuItem onClick={handleDeleteMessage}>
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
                    Eliminar mensaje
                  </MenuItem>
                </Menu>
              </>
            )}
          </Box>

          {/* Input de mensaje */}
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
              <form onSubmit={handleSend} style={{ width: '100%' }}>
                <Box 
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#ffffff',
                    padding: '0',
                    border: '1px solid #d0d0d0',
                    height: '40px',
                    width: '100%',
                    borderRadius: '20px',
                    margin: '10px 10px 0',
                    '&:focus-within': {
                      border: '1px solid #9e9e9e',
                    },
                    position: 'relative'
                  }}
                >
                  <input
                    required
                    placeholder="Mensaje..."
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'transparent',
                      outline: 'none',
                      border: 'none',
                      paddingLeft: '20px',
                      paddingRight: editingMessageId ? '80px' : '40px',
                      color: '#000',
                      borderRadius: '20px',
                    }}
                  />
                  
                  {/* Botones de edición */}
                  {editingMessageId && (
                    <Box sx={{ 
                      position: 'absolute',
                      right: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}>
                      <IconButton
                        size="small"
                        onClick={handleEditCancel}
                        sx={{ p: 0.5 }}
                      >
                        <CloseIcon fontSize="small" sx={{ fontSize: '16px' }} />
                      </IconButton>
                      <IconButton
                        size="small"
                        type="submit"
                        disabled={!message.trim()}
                        sx={{ p: 0.5 }}
                      >
                        <EditIcon 
                          fontSize="small" 
                          sx={{ fontSize: '16px' }}
                          color={message.trim() ? "primary" : "disabled"} 
                        />
                      </IconButton>
                    </Box>
                  )}
                  
                  {/* Botón de enviar */}
                  {!editingMessageId && (
                    <IconButton
                      type="submit"
                      disabled={!message.trim()}
                      size="small"
                      sx={{
                        position: 'absolute',
                        right: '5px',
                        p: 0.5
                      }}
                    >
                      <SendIcon 
                        fontSize="small" 
                        color={message.trim() ? "primary" : "disabled"}
                        sx={{ fontSize: '18px' }}
                      />
                    </IconButton>
                  )}
                </Box>
              </form>
            </Box>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default ChatPage;