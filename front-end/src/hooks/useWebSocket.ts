import { useEffect, useCallback, useRef } from 'react';
import { webSocketService, ChatMessage, ConversationData, MessageHandler, ConversationHandler } from '../services/websocket';

// Hook para manejar conexión de chat
export const useChatWebSocket = (conversationId: string | null, token: string | null) => {
  const isConnectedRef = useRef(false);
  const currentConversationRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!conversationId || !token) {
      console.log('❌ No se puede conectar: conversationId o token faltante');
      return;
    }

    // Evitar reconexiones innecesarias si ya estamos conectados a la misma conversación
    if (currentConversationRef.current === conversationId && isConnectedRef.current) {
      console.log('✅ Ya conectado a conversación:', conversationId);
      return;
    }

    const connectToChat = async () => {
      try {
        console.log('🔄 Conectando a conversación:', conversationId);
        webSocketService.setAuthToken(token);
        
        // Si ya tenemos una conversación diferente, cambiar en lugar de conectar nuevo
        if (currentConversationRef.current && currentConversationRef.current !== conversationId) {
          await webSocketService.switchConversation(conversationId);
        } else {
          await webSocketService.connectToChat(conversationId);
        }
        
        isConnectedRef.current = true;
        currentConversationRef.current = conversationId;
        console.log('✅ Conexión de chat exitosa');
      } catch (error) {
        console.error('❌ Error conectando al chat WebSocket:', error);
        isConnectedRef.current = false;
        currentConversationRef.current = null;
      }
    };

    connectToChat();    return () => {
      isConnectedRef.current = false;
      // No desconectar automáticamente para evitar reconexiones innecesarias
      // solo marcar como desconectado
    };
  }, [conversationId, token]);

  const sendMessage = useCallback((content: string, messageType: string = 'text') => {
    webSocketService.sendMessage(content, messageType);
  }, []);

  const markAsRead = useCallback((messageId: number) => {
    webSocketService.markMessageAsRead(messageId);
  }, []);

  const toggleLike = useCallback((messageId: number) => {
    webSocketService.toggleMessageLike(messageId);
  }, []);

  const editMessage = useCallback((messageId: number, newContent: string) => {
    webSocketService.editMessage(messageId, newContent);
  }, []);

  const deleteMessage = useCallback((messageId: number) => {
    webSocketService.deleteMessage(messageId);
  }, []);

  const handleTyping = useCallback(() => {
    webSocketService.handleTyping();
  }, []);

  return {
    sendMessage,
    markAsRead,
    toggleLike,
    editMessage,
    deleteMessage,
    handleTyping,
    isConnected: isConnectedRef.current
  };
};

// Hook para manejar notificaciones generales
export const useNotificationWebSocket = (token: string | null) => {
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!token) {
      console.log('❌ No hay token para conectar a notificaciones');
      return;
    }

    const connectToNotifications = async () => {
      try {
        console.log('🔑 Configurando token para notificaciones:', token.substring(0, 20) + '...');
        webSocketService.setAuthToken(token);
        
        // Esperar un poco para asegurar que el token se configure
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await webSocketService.connectToNotifications();
        isConnectedRef.current = true;
        console.log('✅ Conexión de notificaciones exitosa');
      } catch (error) {
        console.error('❌ Error conectando al WebSocket de notificaciones:', error);
        isConnectedRef.current = false;
      }
    };

    connectToNotifications();

    return () => {
      isConnectedRef.current = false;
    };
  }, [token]);

  return {
    isConnected: isConnectedRef.current
  };
};

// Hook para escuchar mensajes específicos del chat
export const useChatMessages = () => {
  const addChatMessageListener = useCallback((type: string, handler: MessageHandler) => {
    webSocketService.onChatMessage(type, handler);
    
    return () => {
      webSocketService.offChatMessage(type, handler);
    };
  }, []);

  return { addChatMessageListener };
};

// Hook para escuchar actualizaciones de conversaciones
export const useConversationUpdates = () => {
  const addConversationListener = useCallback((type: string, handler: ConversationHandler) => {
    webSocketService.onConversationUpdate(type, handler);
    
    return () => {
      webSocketService.offConversationUpdate(type, handler);
    };
  }, []);

  return { addConversationListener };
};

// Hook principal que combina todo
export const useWebSocket = (conversationId: string | null, token: string | null) => {
  const chat = useChatWebSocket(conversationId, token);
  const notifications = useNotificationWebSocket(token);
  const { addChatMessageListener } = useChatMessages();
  const { addConversationListener } = useConversationUpdates();

  const switchConversation = useCallback(async (newConversationId: string) => {
    try {
      await webSocketService.switchConversation(newConversationId);
    } catch (error) {
      console.error('Error cambiando de conversación:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  const getConnectionStatus = useCallback(() => {
    return webSocketService.getConnectionStatus();
  }, []);

  return {
    ...chat,
    notificationsConnected: notifications.isConnected,
    addChatMessageListener,
    addConversationListener,
    switchConversation,
    disconnect,
    getConnectionStatus
  };
};
