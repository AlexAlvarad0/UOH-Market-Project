import apiService from './api';

const SEARCH_HISTORY_KEY = 'uoh_market_search_history';
const MAX_HISTORY_ITEMS = 10;

/**
 * Servicio para gestionar búsquedas, historial y sugerencias
 */
export class SearchService {
  
  /**
   * Obtiene el historial de búsquedas del localStorage
   */
  static getSearchHistory(): string[] {
    try {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      return savedHistory ? JSON.parse(savedHistory) : [];
    } catch (error) {
      console.error('Error al obtener historial de búsqueda:', error);
      return [];
    }
  }

  /**
   * Añade una búsqueda al historial
   * @param query Término de búsqueda
   */
  static addToSearchHistory(query: string): string[] {
    try {
      if (!query.trim()) return this.getSearchHistory();
      
      const history = this.getSearchHistory();
      
      // Eliminar la consulta si ya existe (para moverla al principio)
      const filteredHistory = history.filter(item => 
        item.toLowerCase() !== query.toLowerCase()
      );
      
      // Añadir la nueva consulta al principio
      const updatedHistory = [query, ...filteredHistory].slice(0, MAX_HISTORY_ITEMS);
      
      // Guardar en localStorage
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      
      return updatedHistory;
    } catch (error) {
      console.error('Error al guardar historial de búsqueda:', error);
      return this.getSearchHistory();
    }
  }

  /**
   * Elimina una búsqueda del historial
   * @param query Término de búsqueda a eliminar
   */
  static removeFromSearchHistory(query: string): string[] {
    try {
      const history = this.getSearchHistory();
      const updatedHistory = history.filter(item => 
        item.toLowerCase() !== query.toLowerCase()
      );
      
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      return updatedHistory;
    } catch (error) {
      console.error('Error al eliminar del historial:', error);
      return this.getSearchHistory();
    }
  }

  /**
   * Limpia todo el historial de búsquedas
   */
  static clearSearchHistory(): void {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }

  /**
   * Obtiene sugerencias basadas en la entrada del usuario
   * @param input Texto ingresado por el usuario
   */
  static async getSuggestions(input: string): Promise<string[]> {
    if (!input.trim() || input.trim().length < 2) {
      return [];
    }
    
    try {
      const response = await apiService.getProducts({ search: input, limit: 5 });
        if (response.success && response.data.results) {
        // Extraer títulos de productos como sugerencias
        return response.data.results
          .map((product: { title: string }) => product.title)
          .filter((title: string, index: number, self: string[]) => 
            // Eliminar duplicados
            self.indexOf(title) === index
          );
      }
      
      return [];
    } catch (error) {
      console.error('Error al obtener sugerencias:', error);
      return [];
    }
  }
}

export default SearchService;
