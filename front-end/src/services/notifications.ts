import axios from 'axios';
import { API_URL } from '../config';

class NotificationsService {  // Método para obtener los headers con el token de autenticación
  getHeaders() {
    const token = localStorage.getItem('authToken');
    console.log('Token de autenticación:', token ? `Token presente (${token.substring(0, 10)}...)` : 'Token no encontrado');
    if (token) {
      return {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      };
    }
    console.warn('No se encontró token de autenticación, enviando request sin Authorization header');
    return { 'Content-Type': 'application/json' };
  }
  // Obtener todas las notificaciones del usuario
  async getAll() {
    try {
      const headers = this.getHeaders();
      console.log('Headers para getAll notifications:', headers);
      console.log('URL de request:', `${API_URL}/api/notifications/`);
      
      const response = await axios.get(`${API_URL}/api/notifications/`, {
        headers
      });
      
      console.log('Respuesta exitosa de getAll notifications:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al obtener notificaciones';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string; status?: number } };
        console.error(`Error HTTP ${axiosError.response?.status} al obtener notificaciones:`, axiosError.response?.data);
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error('Error al obtener notificaciones:', error);
      return {
        success: false,
        error: errorMsg
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
      let errorMsg = 'Error al obtener notificaciones no leídas';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string } };
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error('Error al obtener notificaciones no leídas:', error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Marcar una notificación específica como leída
  async markAsRead(notificationId: string | number) {
    try {
      console.log(`Intentando marcar notificación ${notificationId} como leída...`);
      const response = await axios.post(
        `${API_URL}/api/notifications/${notificationId}/mark_read/`,
        {},
        { headers: this.getHeaders() }
      );
      console.log(`Respuesta del servidor al marcar notificación ${notificationId}:`, response.data);
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al marcar notificación como leída';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string; status?: number } };
        console.error(`Error HTTP ${axiosError.response?.status}:`, axiosError.response?.data);
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error(`Error al marcar notificación ${notificationId} como leída:`, error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllAsRead() {
    try {
      console.log('Intentando marcar todas las notificaciones como leídas...');
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_all_read/`,
        {},
        { headers: this.getHeaders() }
      );
      console.log('Respuesta del servidor al marcar todas como leídas:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al marcar notificaciones como leídas';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string; status?: number } };
        console.error(`Error HTTP ${axiosError.response?.status}:`, axiosError.response?.data);
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error('Error al marcar todas las notificaciones como leídas:', error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
  
  // Marcar como leídas todas las notificaciones relacionadas con una conversación
  async markConversationAsRead(conversationId: string | number) {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_conversation_read/`,
        { conversation_id: conversationId },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al marcar notificaciones de conversación como leídas';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string } };
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error(`Error al marcar notificaciones de conversación ${conversationId} como leídas:`, error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
  
  // Marcar como leídas todas las notificaciones relacionadas con un producto
  async markProductAsRead(productId: string | number) {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_product_read/`,
        { product_id: productId },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al marcar notificaciones de producto como leídas';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string } };
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error(`Error al marcar notificaciones de producto ${productId} como leídas:`, error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Marcar como leídas todas las notificaciones relacionadas con un mensaje
  async markMessageAsRead(messageId: string | number) {
    try {
      const response = await axios.post(
        `${API_URL}/api/notifications/mark_message_read/`,
        { message_id: messageId },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al marcar notificaciones de mensaje como leídas';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string } };
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error(`Error al marcar notificaciones de mensaje ${messageId} como leídas:`, error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Eliminar una notificación específica
  async deleteNotification(notificationId: string | number) {
    try {
      const response = await axios.delete(
        `${API_URL}/api/notifications/${notificationId}/`,
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al eliminar la notificación';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string } };
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error(`Error al eliminar notificación ${notificationId}:`, error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
  
  // Eliminar todas las notificaciones
  async deleteAllNotifications() {
    try {
      const response = await axios.delete(
        `${API_URL}/api/notifications/delete_all/`,
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error) {
      let errorMsg = 'Error al eliminar todas las notificaciones';
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: string } };
        errorMsg = axiosError.response?.data || errorMsg;
      }
      console.error('Error al eliminar todas las notificaciones:', error);
      return {
        success: false,
        error: errorMsg
      };
    }
  }
}

export default new NotificationsService();
