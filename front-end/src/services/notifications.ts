import axios from 'axios';
import { API_URL } from '../config';

class NotificationsService {
  // Método para obtener los headers con el token de autenticación
  getHeaders() {
    const token = localStorage.getItem('authToken');
    if (token) {
      return {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };
    }
    return { 'Content-Type': 'application/json' };
  }

  // Obtener todas las notificaciones del usuario
  async getAll() {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      return {
        success: false,
        error: error.response?.data || 'Error al obtener notificaciones'
      };
    }
  }

  // Obtener solo notificaciones no leídas
  async getUnread() {
    try {
      const response = await axios.get(`${API_URL}/api/notifications/unread/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al obtener notificaciones no leídas:', error);
      return {
        success: false,
        error: error.response?.data || 'Error al obtener notificaciones no leídas'
      };
    }
  }

  // Marcar una notificación específica como leída
  async markAsRead(notificationId) {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/${notificationId}/mark_read/`,
        {},
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al marcar notificación ${notificationId} como leída:`, error);
      return {
        success: false,
        error: error.response?.data || 'Error al marcar notificación como leída'
      };
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead() {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_all_read/`,
        {},
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return {
        success: false,
        error: error.response?.data || 'Error al marcar notificaciones como leídas'
      };
    }
  }
  
  // Marcar como leídas todas las notificaciones relacionadas con una conversación
  async markConversationAsRead(conversationId) {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_conversation_read/`,
        { conversation_id: conversationId },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al marcar notificaciones de conversación ${conversationId} como leídas:`, error);
      return {
        success: false,
        error: error.response?.data || 'Error al marcar notificaciones de conversación como leídas'
      };
    }
  }
  
  // Marcar como leídas todas las notificaciones relacionadas con un producto
  async markProductAsRead(productId) {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_product_read/`,
        { product_id: productId },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error(`Error al marcar notificaciones de producto ${productId} como leídas:`, error);
      return {
        success: false,
        error: error.response?.data || 'Error al marcar notificaciones de producto como leídas'
      };
    }
  }
}

export default new NotificationsService();