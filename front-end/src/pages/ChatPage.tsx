import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Badge, CircularProgress } from '@mui/material';
import { List } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';

const ChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        convs.sort((a, b) => 
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
      convs.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      
      setConversations(convs);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId) return;
    
    const res = await api.sendMessage(Number(conversationId), message);
    if (res.success) {
      // Añadir mensaje a la lista y limpiar campo
      setMessages((prev) => [...prev, res.data]);
      setMessage('');
      
      // Scroll al final de los mensajes
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      // Actualizar la lista de conversaciones
      refreshConversations();
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
            renderItem={(item: any) => {
              // Mostrar nombre del producto y cantidad de mensajes no leídos
              const otherUser = item.participants.find((u: any) => u.id !== user?.id);
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
              {messages.map((msg: any) => {
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
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}
                  >
                    <Typography variant="body1">{msg.content}</Typography>
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
                    </Typography>
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
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