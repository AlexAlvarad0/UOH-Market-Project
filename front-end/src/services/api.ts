import axios from 'axios';

const API_URL = 'http://localhost:8000/api'; // Ajusta esto a tu URL de API

class ApiService {
  private token: string | null = null;

  constructor() {
    // Verificar si hay un token guardado al inicializar
    this.token = localStorage.getItem('authToken');
    if (this.token) {
      this.setToken(this.token);
    }
  }

  setToken(token: string) {
    this.token = token;
    axios.defaults.headers.common['Authorization'] = `Token ${token}`;
  }

  clearToken() {
    this.token = null;
    delete axios.defaults.headers.common['Authorization'];
  }

  // Método auxiliar para obtener los headers con el token de autorización
  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Token ${this.token}` } : {})
    };
  }

  async login(email: string, password: string) {
    try {
      console.log("Intentando login con:", { email, password });
      // Enviamos los datos en el formato que espera el backend
      const response = await axios.post(`${API_URL}/auth/login/`, {
        email: email,
        password: password
      });
      console.log("Respuesta de login:", response.data);

      // Si la respuesta contiene un token, lo guardamos
      if (response.data.token) {
        this.setToken(response.data.token);
        localStorage.setItem('authToken', response.data.token);
      }

      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error de login:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al iniciar sesión' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al iniciar sesión' };
    }
  }

  // Método para obtener productos con filtros
  async getProducts(params = {}) {
    try {
      const response = await axios.get(`${API_URL}/products/`, {
        params,
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al obtener productos:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar productos' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar productos' };
    }
  }

  // Método para obtener un producto específico por ID
  async getProductById(productId: number) {
    try {
      console.log(`Obteniendo detalles del producto con ID: ${productId}`);

      // Asegurarnos de que la URL termine con barra inclinada (slash) ya que Django lo requiere
      const response = await axios.get(`${API_URL}/products/${productId}/`, {
        headers: this.getHeaders()
      });

      console.log('Detalles del producto recibidos:', response.data);

      // Verificar que la respuesta contenga datos
      if (!response.data) {
        throw new Error('La respuesta no contiene datos del producto');
      }

      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error(`Error al obtener producto ${productId}:`, error);

      // Logging detallado para diagnóstico
      if (axios.isAxiosError(error) && error.response) {
        console.error('Datos de error:', error.response.data);
        console.error('Estado HTTP:', error.response.status);
        console.error('Encabezados:', error.response.headers);

        // Si es un error 404, dar un mensaje específico
        if (error.response.status === 404) {
          return {
            success: false,
            error: `El producto con ID ${productId} no fue encontrado`
          };
        }
        
        return {
          success: false,
          error: error.response.data?.detail ||
            error.response.data ||
            'No se pudo cargar los detalles del producto. Inténtelo de nuevo más tarde.'
        };
      } else if (axios.isAxiosError(error) && error.request) {
        console.error('No hubo respuesta del servidor:', error.request);
        return {
          success: false,
          error: 'No se recibió respuesta del servidor. Verifique su conexión.'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 
          'No se pudo cargar los detalles del producto. Inténtelo de nuevo más tarde.'
      };
    }
  }

  // Método para obtener categorías
  async getCategories() {
    try {
      const response = await axios.get(`${API_URL}/categories/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al obtener categorías:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar categorías' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar categorías' };
    }
  }

  // Método para añadir un producto a favoritos
  async addToFavorites(productId: number) {
    try {
      console.log(`Intentando añadir producto ${productId} a favoritos`);

      // Verificar que productId sea válido
      if (!productId && productId !== 0) {
        throw new Error('Se requiere un ID de producto válido para añadir a favoritos');
      }

      // Asegurar que estamos enviando un número para el ID del producto
      const data = { product: productId };
      console.log('Datos enviados a la API:', data);

      const response = await axios.post(
        `${API_URL}/favorites/`,
        data,
        { headers: this.getHeaders() }
      );

      console.log('Respuesta de añadir a favoritos:', response.data);
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al añadir a favoritos:', error);

      // Logging detallado para diagnóstico
      if (axios.isAxiosError(error) && error.response) {
        console.error('Datos de error:', error.response.data);
        console.error('Estado HTTP:', error.response.status);

        // Para errores 400, mostrar el detalle del error de validación
        if (error.response.status === 400 && error.response.data) {
          return {
            success: false,
            error: `Error de validación: ${JSON.stringify(error.response.data)}`
          };
        }
        
        return {
          success: false,
          error: error.response.data || 'Error al añadir a favoritos. Inténtalo de nuevo más tarde.'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al añadir a favoritos. Inténtalo de nuevo más tarde.'
      };
    }
  }

  // Método para eliminar un producto de favoritos
  async removeFromFavorites(productId: number) {
    try {
      // Primero intentamos encontrar el ID del favorito
      const favorites = await this.favorites.getAll();
      if (!favorites.success) {
        throw new Error('No se pudieron obtener los favoritos');
      }

      const favorite = favorites.data.find((f: { product: { id: number } }) => f.product.id === productId);
      if (!favorite) {
        throw new Error('Favorito no encontrado');
      }

      // Eliminamos el favorito usando su ID
      const response = await axios.delete(
        `${API_URL}/favorites/${favorite.id}/`,
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al eliminar de favoritos:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al eliminar de favoritos' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al eliminar de favoritos' };
    }
  }

  // Otros métodos de la API...
  async getUserProducts() {
    try {
      console.log('Obteniendo productos del usuario actual...');

      // Usar el endpoint específico para productos del usuario en lugar del endpoint general
      const response = await axios.get(`${API_URL}/products/my_products/`, {
        headers: this.getHeaders()
      });

      console.log('Respuesta de productos del usuario:', response.data);
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al obtener productos del usuario:', error);

      // Logging detallado para diagnóstico
      if (axios.isAxiosError(error) && error.response) {
        console.error('Datos de error:', error.response.data);
        console.error('Estado HTTP:', error.response.status);
        
        return {
          success: false,
          error: error.response.data || 'No se pudieron cargar tus productos'
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'No se pudieron cargar tus productos'
      };
    }
  }

  // Favorites API
  favorites = {
    getAll: async () => {
      try {
        console.log('Solicitando lista de favoritos...');
        const response = await axios.get(`${API_URL}/favorites/`, {
          headers: this.getHeaders()
        });

        console.log('Respuesta de favoritos recibida:', response.data);

        // Verificar si la respuesta tiene la estructura esperada
        if (!response.data) {
          console.warn('La respuesta de favoritos está vacía');
          return { success: true, data: [] };
        }

        // No procesar los datos aquí, solo devolver la respuesta tal como viene
        // El componente se encargará de procesar la estructura específica
        return { success: true, data: response.data };      } catch (error: unknown) {
        console.error('Error al obtener favoritos:', error);

        if (axios.isAxiosError(error) && error.response) {
          console.error('Datos de error:', error.response.data);
          console.error('Estado HTTP:', error.response.status);
          
          return {
            success: false,
            error: error.response.data || 'No se pudieron cargar los favoritos'
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'No se pudieron cargar los favoritos'
        };
      }
    },
    // other favorites methods...
  }

  // Add other API methods as needed

  // Método alternativo para validar el token que usa un endpoint existente o simplemente verifica
  // la sesión actual sin depender de un endpoint específico
  async validateToken() {
    // Si hay un token guardado, asumimos que es válido
    // Esta es una solución temporal hasta que tengamos un endpoint adecuado
    if (this.token) {
      // Intentar recuperar datos del usuario del localStorage
      const savedUserData = localStorage.getItem('userData');
      if (savedUserData) {
        try {
          return {
            success: true,
            data: { user: JSON.parse(savedUserData) }
          };
        } catch (e) {
          console.error('Error parsing stored user data', e);
        }
      }
      
      // Si no hay datos de usuario, asumimos que el token es válido
      // pero no tenemos información de usuario
      return {
        success: true,
        data: { user: { is_authenticated: true } }
      };
    }
    
    return {
      success: false,
      error: 'No token found'
    };
  }

  // Método para crear un nuevo producto (elimina la versión duplicada y queda solo esta)
  async createProduct(formData: FormData) {
    try {
      console.log('Enviando nuevo producto al servidor...');
      // Configurar headers para enviar FormData
      const headers = {
        ...(this.token ? { 'Authorization': `Token ${this.token}` } : {})
        // No incluir Content-Type para FormData
      };      // Log detallado del contenido del FormData
      console.log('Contenido del FormData a enviar:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: archivo - ${value.name} (${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      const response = await axios.post(
        `${API_URL}/products/`,
        formData,
        {
          headers: headers,
          timeout: 60000 // Aumentar timeout para subidas de archivos (60 segundos)
        }
      );

      console.log('Producto creado exitosamente:', response.data);
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al crear producto:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error('Datos de error:', error.response.data);
          console.error('Estado HTTP:', error.response.status);
          return {
            success: false,
            error: error.response.data || 'Error al crear el producto'
          };
        } else if (error.request) {
          console.error('No hubo respuesta del servidor:', error.request);
          return {
            success: false,
            error: 'No se recibió respuesta del servidor'
          };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al crear el producto'
      };
    }
  }

  // Método para actualizar un producto existente
  async updateProduct(productId: number, formData: FormData) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No hay sesión activa. Por favor, inicia sesión nuevamente.'
        };
      }

      console.log(`Actualizando producto ${productId}...`);
        // Mostrar el contenido del FormData para depuración
      console.log('Contenido del FormData:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: archivo - ${value.name} (${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }
      
      const response = await axios.patch(
        `${API_URL}/products/${productId}/`,
        formData,
        {
          headers: {
            'Authorization': `Token ${this.token}`
            // No incluir Content-Type para que axios lo establezca automáticamente con el boundary
          },
          timeout: 30000 // 30 segundos
        }
      );
      
      console.log('Respuesta de actualización:', response);
      return { 
        success: true, 
        data: response.data 
      };    } catch (error: unknown) {
      console.error(`Error al actualizar producto ${productId}:`, error);
      
      // Manejo específico según el código de respuesta
      if (axios.isAxiosError(error) && error.response) {
        console.error('Estado HTTP:', error.response.status);
        console.error('Datos de error:', error.response.data);
        
        if (error.response.status === 404) {
          return {
            success: false,
            error: 'El producto no existe'
          };
        } else if (error.response.status === 403) {
          return {
            success: false,
            error: 'No tienes permisos para editar este producto'
          };
        } else if (error.response.data) {
          // Intentar extraer un mensaje de error más descriptivo
          const errorMsg = typeof error.response.data === 'string' 
            ? error.response.data 
            : (error.response.data.detail || JSON.stringify(error.response.data));
            
          return {
            success: false,
            error: errorMsg
          };
        }
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error al actualizar el producto. Inténtalo de nuevo más tarde.'
      };
    }
  }

  // Método para eliminar un producto - IMPLEMENTACIÓN COMPLETA DE BORRADO
  async deleteProduct(productId: number) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No hay sesión activa. Por favor, inicia sesión nuevamente.'
        };
      }      console.log(`Intentando eliminar producto ${productId}...`);
      
      // Simplificar la petición inicial - sin parámetros que podrían causar problemas
      await axios.delete(
        `${API_URL}/products/${productId}/`, 
        {
          headers: {
            'Authorization': `Token ${this.token}`
          }
        }
      );
      
      console.log('Producto eliminado exitosamente');
      return { 
        success: true, 
        data: { 
          message: 'Producto eliminado correctamente',
        } 
      };    } catch (error: unknown) {
      console.error(`Error al eliminar producto ${productId}:`, error);
      
      // Si el error es 404, podemos asumir que el producto ya fue eliminado o no existe
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return {
          success: true,
          data: { 
            message: 'El producto ya no existe en el sistema',
          }
        };
      }
      
      // Para otros errores, intentar extraer el mensaje más informativo
      let errorMsg = 'Error al eliminar el producto';
      if (axios.isAxiosError(error)) {
        if (error.response?.data?.detail) {
          errorMsg = error.response.data.detail;
        } else if (error.response?.data) {
          errorMsg = typeof error.response.data === 'string' 
            ? error.response.data 
            : JSON.stringify(error.response.data);
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  // Método para obtener el perfil del usuario autenticado
  async getUserProfile() {
    try {
      const response = await axios.get(`${API_URL}/users/profile/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al obtener el perfil:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar el perfil' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar el perfil' };
    }
  }

  // Método para actualizar el perfil del usuario
  async updateUserProfile(formData: FormData) {
    try {
      const response = await axios.patch(
        `${API_URL}/profile/`,
        formData,
        {
          headers: {
            // No incluir Content-Type para FormData
            'Authorization': `Token ${this.token}`
          }
        }
      );
      
      // Si la actualización es exitosa, también actualizamos los datos en localStorage
      if (response.data) {
        localStorage.setItem('userData', JSON.stringify(response.data));
      }
      
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al actualizar el perfil:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al actualizar el perfil' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar el perfil' };
    }
  }

  // Conversaciones
  async getConversations() {
    try {
      const response = await axios.get(`${API_URL}/conversations/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar conversaciones' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar conversaciones' };
    }
  }

  async deleteConversation(conversationId: number) {
    try {
      const response = await axios.delete(
        `${API_URL}/conversations/${conversationId}/`,
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al eliminar conversación' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al eliminar conversación' };
    }
  }

  async createConversation(productId: number, sellerId: number) {
    try {
      const response = await axios.post(
        `${API_URL}/conversations/`,
        { product_id: productId, seller_id: sellerId },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al crear conversación' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al crear conversación' };
    }
  }

  async getMessages(conversationId: number) {
    try {
      console.log(`Obteniendo mensajes para conversación ${conversationId}`);
      // Usar la URL de 'messages' endpoint en la conversación específica
      const response = await axios.get(`${API_URL}/conversations/${conversationId}/messages/`, {
        headers: this.getHeaders()
      });
      
      // Al obtener los mensajes, el backend los marca como leídos automáticamente
      // gracias a la acción definida en ConversationViewSet
      console.log(`Recibidos ${response.data?.length || 0} mensajes`);
      
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error al cargar mensajes:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { 
          success: false, 
          error: error.response.data || 'Error al cargar mensajes' 
        };
      }
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al cargar mensajes' 
      };
    }
  }
  async sendMessage(conversationId: number, content: string) {
    try {
      const response = await axios.post(
        `${API_URL}/messages/`,
        { conversation: conversationId, content },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al enviar mensaje' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al enviar mensaje' };
    }
  }

  async updateMessage(messageId: number, content: string) {
    try {
      const response = await axios.patch(
        `${API_URL}/messages/${messageId}/`,
        { content },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al actualizar mensaje' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al actualizar mensaje' };
    }
  }
  async deleteMessage(messageId: number) {
    try {
      const response = await axios.delete(
        `${API_URL}/messages/${messageId}/`,
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al eliminar mensaje' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al eliminar mensaje' };
    }
  }

  async likeMessage(messageId: number) {
    try {
      const response = await axios.post(
        `${API_URL}/messages/${messageId}/like/`,
        {},
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al dar like al mensaje' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al dar like al mensaje' };
    }
  }
}

// Instancia principal para uso general
const apiService = new ApiService();

// Servicios específicos agrupados por funcionalidad
export const auth = {
  async login(email: string, password: string) {
    try {
      const response = await axios.post(`${API_URL}/auth/login/`, {
        email,
        password
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error en login:', error);
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          error: error.response.data
        };
      }
      return {
        success: false,
        error: 'Error al conectar con el servidor'
      };
    }
  },

  async register(username: string, email: string, password: string, firstName: string, lastName: string) {
    try {
      // Usar la ruta correcta según el backend de Django
      const response = await axios.post(`${API_URL}/auth/register/`, {
        username,
        email,
        password,
        password2: password, // Añadir campo password2 que exige el backend
        first_name: firstName,
        last_name: lastName
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error registrando usuario:', error);
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          error: error.response.data
        };
      }
      return {
        success: false,
        error: 'Error al conectar con el servidor'
      };
    }
  },

  async verifyEmail(email: string, code: string) {
    try {
      const response = await axios.post(`${API_URL}/auth/verify-email/`, { email, code });
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error verificando email:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al verificar correo' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al verificar correo' };
    }
  }
};

export default apiService;
