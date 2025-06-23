import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL;

// Configurar WebSocket URL basándose en la API URL
export const getWebSocketURL = (): string => {
  if (!API_URL) return 'ws://localhost:8000';
  
  // Convertir HTTP/HTTPS a WS/WSS
  let wsUrl = API_URL;
  if (wsUrl.startsWith('https://')) {
    wsUrl = wsUrl.replace('https://', 'wss://');
  } else if (wsUrl.startsWith('http://')) {
    wsUrl = wsUrl.replace('http://', 'ws://');
  }
  
  // Remover /api del final si existe
  wsUrl = wsUrl.replace(/\/api\/?$/, '');
  
  return wsUrl;
};

export const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});
