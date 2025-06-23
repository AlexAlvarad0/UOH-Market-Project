import { getWebSocketURL } from '../config';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface ChatMessage {
  id: number;
  conversation: number;
  sender: number;
  sender_username: string;
  content: string;
  message_type: string;
  audio_file?: string;
  audio_url?: string;
  audio_duration?: number;
  created_at: string;
  edited_at?: string;
  is_edited: boolean;
  is_read: boolean;
  is_deleted: boolean;
  liked: boolean;
  liked_by: number[];
  liked_by_users: Array<{ id: number; username: string }>;
}

interface ConversationData {
  id: number;
  participants: Array<{ id: number; username: string; profile_picture?: string }>;
  product: any;
  created_at: string;
  updated_at: string;
  latest_message?: ChatMessage;
  unread_count: number;
}

type MessageHandler = (data: any) => void;
type ConversationHandler = (data: any) => void;

class WebSocketService {
  private chatSocket: WebSocket | null = null;
  private notificationSocket: WebSocket | null = null;
  private messageHandlers: Map<string, MessageHandler[]> = new Map();
  private conversationHandlers: Map<string, ConversationHandler[]> = new Map();  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 segundo inicial
  private currentConversationId: string | null = null;
  private token: string | null = null;
  private typingTimeout: NodeJS.Timeout | null = null;
  private shouldReconnect = true; // Flag para controlar reconexiones automáticas

  constructor() {
    this.setupEventHandlers();
  }  // Configurar el token de autenticación
  // Agregar validación para el token antes de usarlo en las URLs
  setAuthToken(token: string) {
    if (!token || token.length === 0) {
        console.error('❌ Token de autenticación inválido');
        return;
    }
    this.token = token;
  }// Conectar al WebSocket de chat
  connectToChat(conversationId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Reactivar reconexiones para nueva conexión
        this.shouldReconnect = true;
        
        if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
          this.chatSocket.close();
        }
        
        // Verificar que el token esté configurado
        if (!this.token) {
          console.error('❌ Token no configurado para chat');
          reject(new Error('Token no configurado'));
          return;
        }          this.currentConversationId = conversationId;
        
        const baseWsUrl = getWebSocketURL();
        const wsUrl = `${baseWsUrl}/ws/chat/${conversationId}/?token=${this.token}`;
        this.chatSocket = new WebSocket(wsUrl);this.chatSocket.onopen = () => {
          this.reconnectAttempts = 0;
          resolve();
        };        this.chatSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleChatMessage(data);
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };        this.chatSocket.onclose = (event) => {
          // Solo reconectar si no fue cerrado intencionalmente (código 1000 = normal closure)
          if (event.code !== 1000 && this.shouldReconnect) {
            this.handleChatReconnect();
          }
        };

        this.chatSocket.onerror = (error) => {
          console.error('💥 Error en chat WebSocket:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }
  // Conectar al WebSocket de notificaciones
  connectToNotifications(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.notificationSocket && this.notificationSocket.readyState === WebSocket.OPEN) {
          this.notificationSocket.close();
        }
        
        // Verificar que el token esté configurado
        if (!this.token) {
          console.error('❌ Token no configurado para notificaciones');
          reject(new Error('Token no configurado'));
          return;        }        
        
        const baseWsUrl = getWebSocketURL();
        const wsUrl = `${baseWsUrl}/ws/notifications/?token=${this.token}`;
        this.notificationSocket = new WebSocket(wsUrl);

        this.notificationSocket.onopen = () => {
          resolve();
        };

        this.notificationSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleNotificationMessage(data);
          } catch (error) {
            console.error('Error parsing notification message:', error);
          }
        };        this.notificationSocket.onclose = () => {
          this.handleNotificationReconnect();
        };

        this.notificationSocket.onerror = (error) => {
          console.error('Error en notification WebSocket:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }  // Enviar mensaje de chat
  sendMessage(content: string, messageType: string = 'text') {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'chat_message',
        content,
        message_type: messageType
      };
      this.chatSocket.send(JSON.stringify(message));    } else {
      // Chat WebSocket no está conectado - silenciar error
    }
  }

  // Marcar mensaje como leído
  markMessageAsRead(messageId: number) {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message_read',
        message_id: messageId
      };
      this.chatSocket.send(JSON.stringify(message));
    }
  }

  // Dar o quitar like a un mensaje
  toggleMessageLike(messageId: number) {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message_like',
        message_id: messageId
      };
      this.chatSocket.send(JSON.stringify(message));
    }
  }

  // Editar mensaje
  editMessage(messageId: number, newContent: string) {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message_edit',
        message_id: messageId,
        content: newContent
      };
      this.chatSocket.send(JSON.stringify(message));
    }
  }

  // Eliminar mensaje
  deleteMessage(messageId: number) {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message_delete',
        message_id: messageId
      };
      this.chatSocket.send(JSON.stringify(message));
    }
  }

  // Enviar indicador de escritura
  sendTypingIndicator(isTyping: boolean) {
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      const message = {
        type: 'typing',
        is_typing: isTyping
      };
      this.chatSocket.send(JSON.stringify(message));
    }
  }

  // Manejar indicador de escritura con debounce
  handleTyping() {
    // Enviar indicador de que está escribiendo
    this.sendTypingIndicator(true);

    // Limpiar timeout anterior
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Configurar timeout para dejar de escribir
    this.typingTimeout = setTimeout(() => {
      this.sendTypingIndicator(false);
    }, 2000); // 2 segundos sin escribir
  }

  // Registrar handler para mensajes de chat
  onChatMessage(type: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)?.push(handler);
  }

  // Registrar handler para notificaciones de conversación
  onConversationUpdate(type: string, handler: ConversationHandler) {
    if (!this.conversationHandlers.has(type)) {
      this.conversationHandlers.set(type, []);
    }
    this.conversationHandlers.get(type)?.push(handler);
  }

  // Remover handler
  offChatMessage(type: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  offConversationUpdate(type: string, handler: ConversationHandler) {
    const handlers = this.conversationHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Manejar mensajes de chat
  private handleChatMessage(data: WebSocketMessage) {
    const handlers = this.messageHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  // Manejar mensajes de notificación
  private handleNotificationMessage(data: WebSocketMessage) {
    const handlers = this.conversationHandlers.get(data.type);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }  // Manejar reconexión del chat
  private handleChatReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.currentConversationId) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        if (this.currentConversationId) {
          this.connectToChat(this.currentConversationId).catch(() => {
            // Silenciar errores de reconexión
          });
        }
      }, delay);
    }
  }
  // Manejar reconexión de notificaciones
  private handleNotificationReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(() => {
        this.connectToNotifications().catch(() => {
          // Silenciar errores de reconexión
        });
      }, delay);
    }
  }

  // Configurar event handlers para la página
  private setupEventHandlers() {
    // Manejar cuando la página se va a cerrar
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });    // Manejar cambios de visibilidad de la página
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Página oculta - reducir actividad
      } else {
        // Página visible - reactivar
        this.checkConnections();
      }
    });
  }

  // Verificar conexiones y reconectar si es necesario
  private checkConnections() {
    if (this.currentConversationId && 
        (!this.chatSocket || this.chatSocket.readyState !== WebSocket.OPEN)) {
        this.connectToChat(this.currentConversationId);
    }

    // Solo intentar notificaciones si hay token
    if (this.token && (!this.notificationSocket || this.notificationSocket.readyState !== WebSocket.OPEN)) {
        this.connectToNotifications();
    }
  }
  // Desconectar todos los WebSockets
  disconnect() {
    this.shouldReconnect = false; // Desactivar reconexiones automáticas
    
    if (this.chatSocket) {
      this.chatSocket.close();
      this.chatSocket = null;
    }

    if (this.notificationSocket) {
      this.notificationSocket.close();
      this.notificationSocket = null;
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
      this.typingTimeout = null;
    }

    this.currentConversationId = null;
    this.messageHandlers.clear();
    this.conversationHandlers.clear();
  }
  // Cambiar de conversación
  switchConversation(conversationId: string) {
    // Desactivar reconexiones antes de cerrar
    this.shouldReconnect = false;
    
    if (this.chatSocket && this.chatSocket.readyState === WebSocket.OPEN) {
      this.chatSocket.close();
    }
    
    // Esperar un poco antes de conectar a la nueva conversación
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connectToChat(conversationId).then(resolve).catch(resolve);
      }, 100);
    });
  }

  // Obtener estado de la conexión
  getConnectionStatus() {
    return {
      chat: this.chatSocket?.readyState,
      notifications: this.notificationSocket?.readyState,
      currentConversation: this.currentConversationId
    };
  }
}

// Exportar instancia singleton
export const webSocketService = new WebSocketService();

// Exportar tipos para uso en componentes
export type { ChatMessage, ConversationData, MessageHandler, ConversationHandler };
