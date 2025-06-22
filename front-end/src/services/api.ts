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
      // Verificar que productId sea válido
      if (!productId && productId !== 0) {
        throw new Error('Se requiere un ID de producto válido para añadir a favoritos');
      }// Asegurar que estamos enviando un número para el ID del producto
      const data = { product: productId };

      const response = await axios.post(
        `${API_URL}/favorites/`,
        data,
        { headers: this.getHeaders() }
      );
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
  }  // Método para eliminar un producto de favoritos
  async removeFromFavorites(productId: number) {
    try {
      console.log(`Intentando eliminar producto ${productId} de favoritos`);
      
      // Primero intentamos encontrar el ID del favorito
      const favorites = await this.favorites.getAll();
      if (!favorites.success) {
        throw new Error('No se pudieron obtener los favoritos');
      }

      console.log('Favoritos obtenidos para eliminación:', favorites.data);      // Definir interface simplificada basada en la estructura real
      interface FavoriteItem {
        id: string;
        product: string; // Siempre es un string (ID del producto)
        product_detail?: {
          id?: number;
          title?: string;
          price?: number;
          images?: { image: string }[];
        };
      }

      // Obtener el array de favoritos - puede estar en data directamente o en data.results
      let favoritesArray: FavoriteItem[] = [];
      
      if (Array.isArray(favorites.data)) {
        favoritesArray = favorites.data as FavoriteItem[];
      } else if (favorites.data?.results && Array.isArray(favorites.data.results)) {
        favoritesArray = favorites.data.results as FavoriteItem[];
      }

      console.log('Array de favoritos procesado:', favoritesArray);      // Buscar el favorito correcto - product siempre es string
      const favoriteToDelete = favoritesArray.find((f: FavoriteItem) => {
        console.log(`Comparando favorito ${f.id}: product="${f.product}" con productId="${productId}"`);
        // Convertir tanto el product como el productId a string para comparar
        return f.product.toString() === productId.toString();
      });

      if (!favoriteToDelete) {
        console.error(`No se encontró favorito para producto ${productId}. Favoritos disponibles:`, 
          favoritesArray.map(f => ({ id: f.id, product: f.product })));
        throw new Error('Favorito no encontrado');
      }

      console.log('Favorito encontrado para eliminar:', favoriteToDelete);

      // Eliminamos el favorito usando su ID
      const response = await axios.delete(
        `${API_URL}/favorites/${favoriteToDelete.id}/`,
        { headers: this.getHeaders() }
      );
      
      console.log('Favorito eliminado exitosamente:', response.data);
      return { success: true, data: response.data };
    } catch (error: unknown) {
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
        const response = await axios.get(`${API_URL}/favorites/`, {
          headers: this.getHeaders()
        });

        // Verificar si la respuesta tiene la estructura esperada
        if (!response.data) {
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

  // Método alternativo para validar el token que usa un endpoint existente o simplemente verifica  // Método para validar el token actual con el servidor
  async validateToken() {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No token found'
        };
      }      // Llamar al endpoint del usuario actual para validar el token
      const response = await axios.get(`${API_URL}/accounts/me/`, {
        headers: this.getHeaders()
      });

      if (response.data) {
        return {
          success: true,
          data: { user: response.data }
        };
      }

      return {
        success: false,
        error: 'Invalid token response'
      };
    } catch (error: unknown) {
      console.error('Token validation error:', error);
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data || error.message
        };
      }
      return {
        success: false,
        error: 'Token validation failed'
      };
    }
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

  // Método para cambiar la disponibilidad de un producto
  async toggleProductAvailability(productId: number) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No hay sesión activa. Por favor, inicia sesión nuevamente.'
        };
      }

      console.log(`Cambiando disponibilidad del producto ${productId}...`);
      const response = await axios.post(
        `${API_URL}/products/${productId}/toggle_availability/`,
        {}, // No se necesita cuerpo para esta solicitud POST
        {
          headers: {
            'Authorization': `Token ${this.token}`
          },
          timeout: 15000 // 15 segundos
        }
      );
      
      console.log('Respuesta de cambio de disponibilidad:', response);
      return { 
        success: true, 
        data: response.data 
      };
    } catch (error: unknown) {
      console.error(`Error al cambiar disponibilidad del producto ${productId}:`, error);
      
      if (axios.isAxiosError(error) && error.response) {
        console.error('Estado HTTP:', error.response.status);
        console.error('Datos de error:', error.response.data);
        
        let errorMessage = 'Error al cambiar la disponibilidad.';
        if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido al cambiar la disponibilidad'
      };
    }
  }
  // Método para eliminar un producto
  async deleteProduct(productId: number) {
    try {
      if (!this.token) {
        return {
          success: false,
          error: 'No hay sesión activa. Por favor, inicia sesión nuevamente.'
        };
      }      console.log(`Intentando eliminar producto ${productId}...`);
      
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
      };
    } catch (error: unknown) {
      console.error(`Error al eliminar producto ${productId}:`, error);
      
      if (axios.isAxiosError(error)) {
        // Si el error es 404, el producto ya no existe
        if (error.response?.status === 404) {
          return {
            success: true,
            data: { 
              message: 'El producto ya no existe en el sistema',
            }
          };
        }
        
        // Si el error es 400, verificar el mensaje específico
        if (error.response?.status === 400) {
          const errorMessage = error.response?.data?.error || 
                              error.response?.data?.message || 
                              'El producto no se puede eliminar en este momento';
          return {
            success: false,
            error: errorMessage
          };
        }
        
        // Otros errores HTTP
        const statusCode = error.response?.status;
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            `Error del servidor (${statusCode})`;
        
        return {
          success: false,
          error: errorMessage
        };
      }
        // Error de red u otros errores
      return {
        success: false,
        error: 'Error de conexión. Verifica tu conexión a internet.'
      };
    }
  }

  // Método para obtener el perfil del usuario autenticado
  async getUserProfile() {
    try {
      const response = await axios.get(`${API_URL}/accounts/profile/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };} catch (error: unknown) {
      console.error('Error al obtener el perfil:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar el perfil' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar el perfil' };
    }
  }  // Método para actualizar el perfil del usuario
  async updateUserProfile(formData: FormData) {
    try {
      const response = await axios.patch(
        `${API_URL}/accounts/profile/`,
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
        const errorData = error.response.data;
        
        // Si hay errores específicos de campos, intentar extraer el mensaje más relevante
        if (typeof errorData === 'object') {
          if (errorData.username && Array.isArray(errorData.username)) {
            return { success: false, error: errorData.username[0] };
          }
          if (errorData.username && typeof errorData.username === 'string') {
            return { success: false, error: errorData.username };
          }
          // Si hay otros errores de campos, intentar extraer el primero
          const fieldKeys = Object.keys(errorData);
          if (fieldKeys.length > 0) {
            const firstError = errorData[fieldKeys[0]];
            if (Array.isArray(firstError)) {
              return { success: false, error: firstError[0] };
            }
            if (typeof firstError === 'string') {
              return { success: false, error: firstError };
            }
          }
        }
        
        return { success: false, error: errorData || 'Error al actualizar el perfil' };
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
      return { success: true, data: response.data };
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al crear conversación' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al crear conversación' };
    }
  }  /**
   * Obtener conversación existente para un producto y vendedor
   */
  async getExistingConversationForProduct(productId: number) {
    try {
      const convsRes = await this.getConversations();
      if (!convsRes.success) {
        return { success: false, error: convsRes.error };
      }
      const conversationsData = convsRes.data;
      // Manejar array directo o paginado en 'results'
      const dataWithResults = conversationsData as { results?: unknown[] };
      const conversations = Array.isArray(conversationsData)
        ? (conversationsData as unknown[])
        : Array.isArray(dataWithResults.results)
          ? dataWithResults.results
          : [];
      type ConvStub = { product?: { id: number } };
      const conversation = (conversations as unknown as ConvStub[]).find(
        (c) => c.product?.id === productId
      );
      return {
        success: true,
        hasConversationWithMessages: !!conversation,
        data: conversation || null
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error comprobando conversación existente'
      };
    }
  }
  async getMessages(conversationId: number) {
    try {
      // Usar la URL de 'messages' endpoint en la conversación específica
      const response = await axios.get(`${API_URL}/conversations/${conversationId}/messages/`, {
        headers: this.getHeaders()
      });
      
      // Al obtener los mensajes, el backend los marca como leídos automáticamente
      // gracias a la acción definida en ConversationViewSet
      
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
  }  async sendMessage(conversationId: number, content: string, replyToId?: number) {
    try {
      const requestData: { conversation: number; content: string; reply_to?: number } = { 
        conversation: conversationId, 
        content 
      };
      
      // Agregar reply_to si se está respondiendo a un mensaje
      if (replyToId) {
        requestData.reply_to = replyToId;
      }

      const response = await axios.post(
        `${API_URL}/messages/`,
        requestData,
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

  async sendAudioMessage(conversationId: number, audioFile: File, duration?: number) {
    try {
      const formData = new FormData();
      formData.append('conversation', conversationId.toString());
      formData.append('message_type', 'audio');
      formData.append('audio_file', audioFile);
      if (duration) {
        formData.append('audio_duration', duration.toString());
      }

      // Headers para FormData (sin Content-Type para que axios lo establezca automáticamente)
      const headers = {
        ...(this.token ? { 'Authorization': `Token ${this.token}` } : {})
      };

      const response = await axios.post(
        `${API_URL}/messages/`,
        formData,
        { headers }
      );
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al enviar mensaje de audio' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al enviar mensaje de audio' };
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
  }  async deleteMessage(messageId: number) {
    try {
      console.log('API deleteMessage - enviando DELETE request para messageId:', messageId);
      const response = await axios.delete(
        `${API_URL}/messages/${messageId}/`,
        { headers: this.getHeaders() }
      );
      console.log('API deleteMessage - respuesta exitosa:', response.data);
      return { success: true, data: response.data };    
    } catch (error: unknown) {
      console.error('API deleteMessage - error:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('API deleteMessage - error response:', error.response.data);
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
  // Método para obtener ofertas semanales
  async getWeeklyOffers() {
    try {
      const response = await axios.get(`${API_URL}/products/weekly_offers/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error al obtener ofertas semanales:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar ofertas' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar ofertas' };
    }
  }

  // Método temporal para debug
  async getDebugProducts() {
    try {
      const response = await axios.get(`${API_URL}/products/debug_products/`, {
        headers: this.getHeaders()
      });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error al obtener productos debug:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cargar productos debug' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cargar productos debug' };
    }
  }

  /**
   * Incrementa el contador de visualizaciones de un producto
   */
  async incrementView(productId: number) {
    try {
      const response = await axios.post(
        `${API_URL}/products/${productId}/increment_view/`,
        {},
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error incrementando vista:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Error increment view' };
    }
  }

  // Método para cambiar contraseña
  async changePassword(oldPassword: string, newPassword1: string, newPassword2: string) {
    try {
      const response = await axios.post(
        `${API_URL}/auth/password/change/`,
        { old_password: oldPassword, new_password1: newPassword1, new_password2: newPassword2 },
        { headers: this.getHeaders() }
      );
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error cambiando contraseña:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al cambiar contraseña' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al cambiar contraseña' };
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
  },  async googleLogin(token: string) {
    try {
      const response = await axios.post(`${API_URL}/auth/login/google/`, {
        token
      });
      
      // El backend ya devuelve la estructura correcta, solo retornamos response.data
      return response.data;
    } catch (error) {
      console.error('Error en Google login:', error);
      if (axios.isAxiosError(error) && error.response) {
        return {
          success: false,
          error: error.response.data
        };
      }
      return {
        success: false,
        error: 'Error al conectar con el servidor'
      };    }
  },async register(username: string, email: string, password: string, firstName: string, lastName: string) {
    try {
      // Crear el objeto de datos para enviar
      const dataToSend = {
        username,
        email,
        password,
        password2: password, // Añadir campo password2 que exige el backend
        first_name: firstName,
        last_name: lastName
      };
      
      console.log('=== REGISTRO DEBUG ===');
      console.log('Datos que se envían al backend para registro:', dataToSend);
      console.log('password2 incluido:', 'password2' in dataToSend);
      console.log('password2 valor:', dataToSend.password2);      console.log('URL:', `${API_URL}/accounts/register/`);
      
      // Usar la ruta correcta según el backend de Django
      const response = await axios.post(`${API_URL}/accounts/register/`, dataToSend, {
        headers: {
          'Content-Type': 'application/json'
        }
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
  },  async verifyEmail(email: string, code: string) {
    try {
      const response = await axios.post(`${API_URL}/accounts/email-verification/verify/`, { email, code });
      return { success: true, data: response.data };    } catch (error: unknown) {
      console.error('Error verificando email:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al verificar correo' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al verificar correo' };
    }
  },

  async resendVerificationCode(email: string) {
    try {
      const response = await axios.post(`${API_URL}/accounts/email-verification/resend/`, { email });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error reenviando código de verificación:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al reenviar código' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al reenviar código' };
    }
  },

  // Métodos para reseteo de contraseña
  async requestPasswordReset(email: string) {
    try {
      console.log('Enviando solicitud de reseteo a:', `${API_URL}/accounts/password-reset/request/`);
      const response = await axios.post(`${API_URL}/accounts/password-reset/request/`, {
        email: email.toLowerCase().trim()
      });
      console.log('Respuesta de reseteo exitosa:', response.data);
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error solicitando reseteo de contraseña:', error);
      if (axios.isAxiosError(error) && error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        return { success: false, error: error.response.data || 'Error al solicitar reseteo de contraseña' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al solicitar reseteo de contraseña' };
    }
  },
  async confirmPasswordReset(token: string, newPassword: string, confirmPassword: string) {
    try {
      const response = await axios.post(`${API_URL}/accounts/password-reset/confirm/`, {
        token,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      return { success: true, data: response.data };
    } catch (error: unknown) {
      console.error('Error confirmando reseteo de contraseña:', error);
      if (axios.isAxiosError(error) && error.response) {
        return { success: false, error: error.response.data || 'Error al resetear contraseña' };
      }
      return { success: false, error: error instanceof Error ? error.message : 'Error al resetear contraseña' };
    }
  }
};

export default apiService;
