import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import apiService from '../services/api';

interface User {
  id: number;
  email: string;
  username: string;
  is_email_verified?: boolean;
  is_verified_seller?: boolean;  // Agregar este campo
  profile?: {
    first_name?: string;
    last_name?: string;
    bio?: string;
    location?: string;
  };
  profile_picture?: string;
}

interface AuthData {
  token: string;
  user: User;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: AuthData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Verify token and load user data on initial app load
  useEffect(() => {
    const verifyToken = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
          if (!token) {
          // No token found, user is not authenticated
          setLoading(false);
          return;
        }

        // Set token for API requests
        apiService.setToken(token);
        
        // Try to get user data from localStorage first for immediate UI update
        const savedUserData = localStorage.getItem('userData');        if (savedUserData) {
          try {
            const parsedUser = JSON.parse(savedUserData);
            setUser(parsedUser);
            
            // MODIFICACIÓN: Si no podemos validar con el backend, al menos confiar en localStorage
            // por ahora para evitar redirecciones innecesarias
          } catch (error) {
            localStorage.removeItem('userData');
          }
        }
        // Optional: Validate token with backend
        // This ensures the token is still valid on the server
        try {
          const response = await apiService.validateToken();
          if (response.success && response.data?.user) {            // Update user data from server
            setUser(response.data.user);
            localStorage.setItem('userData', JSON.stringify(response.data.user));
          } else {
            // Token is invalid
            
            // MODIFICACIÓN: Si tenemos datos de usuario en localStorage y el error es 404,
            // no cerramos sesión, solo asumimos que el endpoint no existe
            if (response.error && typeof response.error === 'string' && response.error.includes('404')) {
              // No realizar logout aquí
            } else {
              logout();
            }          }
        } catch (error) {
          // Don't logout immediately on network errors
          // This allows the app to work offline with previously stored auth data
        }
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, []);
  const login = async (authData: AuthData): Promise<boolean> => {
    try {      if (!authData.token || !authData.user) {
        return false;
      }

      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('userData', JSON.stringify(authData.user));
      
      apiService.setToken(authData.token);
      setUser(authData.user);
        return true;
    } catch (error) {
      return false;
    }
  };
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    apiService.clearToken();
    setUser(null);
  };

  const updateUser = (userData: User) => {
    try {
      setUser(userData);
      localStorage.setItem('userData', JSON.stringify(userData));    } catch (error) {
      // Error updating user data
    }
  };
  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      loading,
      login,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};