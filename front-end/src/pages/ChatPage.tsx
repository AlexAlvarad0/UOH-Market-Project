import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Badge, CircularProgress } from '@mui/material';
import { List } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth.hooks';
import { Edit as EditIcon, Delete as DeleteIcon, MoreVert as MoreVertIcon, ThumbUp as ThumbUpIcon, ThumbUpOutlined as ThumbUpOutlinedIcon } from '@mui/icons-material';
import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');  interface Message {
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
  const [editContent, setEditContent] = useState('');
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
      setEditContent(messageToEdit.content);
      setMessage(messageToEdit.content); // Colocar el contenido en el input
    }
    
    handleMenuClose();
  };

  // Cancelar edición
  const handleEditCancel = () => {
    setEditingMessageId(null);
    setEditContent('');
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
        setEditContent('');
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

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', mt: 8 }}>
      <Box sx={{ width: 340, borderRight: 1, borderColor: 'divider', p: 2, overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          Conversaciones
        </Typography>
        {loadingConvs ? (
          <CircularProgress size={24} />
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={conversations}
            renderItem={(item: { id: number; participants: { id: number; username: string }[]; product?: { title: string }; unread_count?: number }) => {
              // Mostrar nombre del producto y cantidad de mensajes no leídos
              const otherUser = item.participants.find((u: { id: number; username: string }) => u.id !== user?.id);
              const unreadCount = item.unread_count || 0;
              return (
                <List.Item
                  style={{ 
                    cursor: 'pointer', 
                    background: String(item.id) === conversationId ? '#f0f4ff' : undefined,
                    position: 'relative',
                    paddingRight: unreadCount > 0 ? '40px' : '16px', // Espacio para notificación
                    borderLeft: unreadCount > 0 ? '4px solid #1976d2' : 'none', // Indicador visual
                  }}
                  onClick={() => navigate(`/chat/${item.id}`)}
                >
                  <List.Item.Meta
                    title={
                      <span>
                        {item.product?.title || 'Sin producto'}
                      </span>
                    }
                    description={otherUser ? `${otherUser.username || 'Usuario'}` : ''}
                  />
                  {unreadCount > 0 && (
                    <Badge 
                      badgeContent={unreadCount} 
                      color="primary"
                      sx={{ 
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}
                    />
                  )}
                </List.Item>
              );
            }}
          />
        )}
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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
                      position: 'relative'
                    }}
                  >
                    {/* Contenido del mensaje */}
                    <Typography variant="body1">{msg.content}</Typography>
                      {/* Metadatos y opciones del mensaje */}
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
                      {/* Indicador de likes para mensajes propios */}
                    {isCurrentUser && msg.liked && msg.liked_by && msg.liked_by.length > 0 && (
                      <Box 
                        sx={{ 
                          position: 'absolute', 
                          bottom: 8, 
                          left: 8, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5
                        }}
                      >
                        <Tooltip 
                          title={
                            msg.liked_by_users && msg.liked_by_users.length > 0 
                              ? <>
                                  <Typography variant="caption" component="div">
                                    A {msg.liked_by_users.length > 1 ? 'estas personas' : 'esta persona'} le gusta tu mensaje:
                                  </Typography>
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
                            <ThumbUpIcon fontSize="small" sx={{ color: '#1976d2', fontSize: '0.9rem' }} />
                            <Typography variant="caption" sx={{ color: '#1976d2' }}>
                              {msg.liked_by.length}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    )}
                      {/* Acción para mensajes de otros usuarios */}
                    {!isCurrentUser && (
                      <>
                        <Tooltip title="Me gusta">
                          <IconButton
                            size="small"
                            onClick={() => handleLikeMessage(msg.id)}
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                          >
                            {msg.liked ? 
                              <ThumbUpIcon fontSize="small" color="primary" /> : 
                              <ThumbUpOutlinedIcon fontSize="small" />
                            }
                          </IconButton>
                        </Tooltip>
                        
                        {/* Mostrar quién más ha dado like a este mensaje (excepto el usuario actual) */}
                        {msg.liked && msg.liked_by_users && msg.liked_by_users.length > 0 && (
                          <Box 
                            sx={{ 
                              position: 'absolute', 
                              bottom: 8, 
                              right: 8, 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 0.5
                            }}
                          >
                            <Tooltip 
                              title={
                                <>
                                  <Typography variant="caption" component="div">
                                    {msg.liked_by_users.length > 1 
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
                                <Typography variant="caption" sx={{ color: '#1976d2' }}>
                                  {msg.liked_by_users.filter(u => u.id !== user?.id).length > 0 && 
                                    `+${msg.liked_by_users.filter(u => u.id !== user?.id).length}`}
                                </Typography>
                                {msg.liked_by_users.filter(u => u.id !== user?.id).length > 0 && (
                                  <ThumbUpIcon fontSize="small" sx={{ color: '#1976d2', fontSize: '0.9rem' }} />
                                )}
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
                        sx={{ position: 'absolute', top: 8, right: 8 }}
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

        {conversationId && (
          <Box 
            sx={{ 
              borderTop: 1, 
              borderColor: 'divider', 
              width: '100%',
              padding: 0
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
                  margin: '10px',
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
                    paddingRight: '40px',
                    color: '#000',
                    borderRadius: '20px',
                  }}
                />
                {editingMessageId && (
                  <button
                    type="button"
                    onClick={handleEditCancel}
                    style={{
                      position: 'absolute',
                      right: '40px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      color: '#666'
                    }}
                  >
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!message.trim()}
                  style={{
                    position: 'absolute',
                    right: '5px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '30px',
                    height: '30px',
                    backgroundColor: 'transparent',
                    outline: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: message.trim() ? 'pointer' : 'default',
                    transition: 'all 0.3s',
                    padding: 0,
                  }}
                >
                  {editingMessageId ? (
                    <EditIcon fontSize="small" color={message.trim() ? "primary" : "disabled"} />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 664 663" width="18" height="18">
                      <path
                        fill={message.trim() ? "#e0e0e0" : "none"}
                        d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"
                      />
                      <path
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeWidth="33.67"
                        stroke={message.trim() ? "#000000" : "#9e9e9e"}
                        d="M646.293 331.888L17.7538 17.6187L155.245 331.888M646.293 331.888L17.753 646.157L155.245 331.888M646.293 331.888L318.735 330.228L155.245 331.888"
                      />
                    </svg>
                  )}
                </button>
              </Box>
            </form>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;
