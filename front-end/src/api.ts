import axios from 'axios';
import { API_URL } from './config';

type RegisterData = {
  username: string;
  email: string;
  password: string;
  password2?: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
};

/**
 * Registra un nuevo usuario
 */
export const register = async (userData: RegisterData) => {  try {
    return (await axios.post(`${API_URL}/auth/register/`, userData)).data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error('Error en el registro');
  }
};

/**
 * Versión simplificada para compatibilidad con implementaciones existentes
 */
export const registerSimple = async (username: string, email: string, password: string) => {  try {
    await axios.post(`${API_URL}/auth/register/`, {
      username,
      email,
      password,
      password2: password // Muchas APIs de Django requieren confirmación de contraseña
    });
    return true;  } catch {
    return false;
  }
};

export const login = async (email: string, password: string) => {
  try {
    // URL corregida sin duplicar /api
    const response = await axios.post(`${API_URL}/auth/login/`, { email, password });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error('Error en el inicio de sesión');
  }
}

// Tipos para las calificaciones
export interface Rating {
  id: number;
  rating: number;
  comment: string;
  rater: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
  };
  rated_user: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRatingData {
  rated_user: number;
  rating: number;
  comment?: string;
}

/**
 * Crear una nueva calificación
 */
export const createRating = async (ratingData: CreateRatingData, token: string) => {
  try {
    const response = await axios.post(
      `${API_URL}/accounts/ratings/create/`,
      ratingData,
      {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error('Error al crear la calificación');
  }
};

/**
 * Obtener las calificaciones de un usuario
 */
export const getUserRatings = async (userId: number, page: number = 1) => {
  try {
    const response = await axios.get(`${API_URL}/accounts/ratings/user/${userId}/?page=${page}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error('Error al obtener las calificaciones');
  }
};

/**
 * Obtener la calificación actual del usuario autenticado para un vendedor específico
 */
export const getUserRatingForSeller = async (sellerId: number, token: string) => {
  try {
    const response = await axios.get(
      `${API_URL}/accounts/ratings/user/${sellerId}/my-rating/`,
      {
        headers: {
          'Authorization': `Token ${token}`,
        },
      }
    );
    // Si el backend devuelve { rating: null }, debemos devolver null para indicar que no hay calificación
    if (response.data && response.data.rating === null) {
      return null;
    }
    // Solo devolver la respuesta si realmente hay una calificación válida
    if (response.data && response.data.id) {
      return response.data;
    }
    return null;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null; // No existe calificación del usuario para este vendedor
    }
    throw error;
  }
};

/**
 * Actualizar una calificación existente
 */
export const updateRating = async (sellerId: number, ratingData: Omit<CreateRatingData, 'rated_user'>, token: string) => {
  try {
    const response = await axios.put(
      `${API_URL}/accounts/ratings/user/${sellerId}/my-rating/`,
      ratingData,
      {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error('Error al actualizar la calificación');
  }
};
