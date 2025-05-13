import { createContext } from 'react';

export interface User {
  id: number;
  email: string;
  username: string;
  is_email_verified?: boolean;
  profile?: {
    first_name?: string;
    last_name?: string;
    bio?: string;
    location?: string;
  };
  profile_picture?: string;
}

export interface AuthData {
  token: string;
  user: User;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: AuthData) => Promise<boolean>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
