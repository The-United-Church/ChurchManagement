import React, { createContext, useContext, useEffect, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfile } from '@/hooks/useAuthQuery';
import {
  clearTokens,
  apiLogout,
  type AuthResponse,
} from '@/services/auth.service';
import { disconnectSocket } from '@/services/socket.service';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  profile_img?: string;
  role?: any;
  permissions?: any[];
}

interface AuthContextType {
  user: AuthUser | null;
  loginWithResponse: (data: AuthResponse) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();

  const loginWithResponse = useCallback(
    (data: AuthResponse) => {
      // Cancel any in-flight profile fetch before setting data to prevent
      // a stale 401 response from overwriting the just-set auth data.
      queryClient.cancelQueries({ queryKey: ['auth', 'profile'] });
      queryClient.setQueryData(['auth', 'profile'], {
        ...data.user,
        role: data.role,
        permissions: data.permissions,
      });
    },
    [queryClient]
  );

  const logout = useCallback(async () => {
    clearTokens();
    disconnectSocket();
    // Await the server logout before navigating.
    // A timeout ensures we never block indefinitely if the network is slow.
    await Promise.race([
      apiLogout(),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);
    queryClient.clear();
    // Only hard-navigate to /login if not already on an auth page.
    // Skipping window.location.replace when already on /login prevents an
    // infinite reload loop: after a reload the JS module resets sessionInvalidated
    // to false, useProfile fires again, refresh fails, session-expired fires,
    // logout runs, and the cycle repeats forever.
    const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/register-church'];
    if (!AUTH_PATHS.some((p) => window.location.pathname.startsWith(p))) {
      window.location.replace('/login');
    }
  }, [queryClient]);

  useEffect(() => {
    const handleSessionExpired = () => logout();
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, [logout]);

  const user: AuthUser | null = profile
    ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        profile_img: profile.profile_img,
        role: profile.role,
        permissions: profile.permissions,
      }
    : null;

  const value: AuthContextType = {
    user,
    loginWithResponse,
    logout,
    isAuthenticated: !!user,
    isLoading: isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};