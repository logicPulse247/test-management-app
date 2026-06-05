import { create } from 'zustand';
import { getAuthToken } from '@/lib/api';
import { authService } from '@/services/auth.service';
import type { AuthUser, LoginCredentials } from '@/types/auth.types';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

export type AuthStore = AuthState & AuthActions;

const initialToken = getAuthToken();

function authFromToken(token: string | null): Pick<AuthState, 'token' | 'isAuthenticated'> {
  return {
    token,
    isAuthenticated: Boolean(token),
  };
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...authFromToken(initialToken),
  user: null,
  loading: false,

  login: async (credentials) => {
    set({ loading: true });

    try {
      const { token, user } = await authService.login(credentials);
      set({
        ...authFromToken(token),
        user,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ loading: true });

    try {
      await authService.logout();
    } finally {
      set({
        ...authFromToken(null),
        user: null,
        loading: false,
      });
    }
  },

  setUser: (user) => set({ user }),
}));
