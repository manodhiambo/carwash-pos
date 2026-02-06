import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, AuthState, LoginCredentials } from '@/types';
import { authApi, clearTokens, setTokens, getTokens } from '@/lib/api';

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);
          const { user, tokens } = response.data;

          set({
            user,
            token: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          clearTokens();
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      refreshUser: async () => {
        try {
          const response = await authApi.getCurrentUser();
          set({ user: response.data });
        } catch (error) {
          console.error('Failed to refresh user:', error);
          get().logout();
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      checkAuth: async () => {
        const { accessToken } = getTokens();

        if (!accessToken) {
          set({ isAuthenticated: false, isLoading: false, user: null });
          return false;
        }

        try {
          const response = await authApi.getCurrentUser();
          set({
            user: response.data,
            isAuthenticated: true,
            isLoading: false,
          });
          return true;
        } catch (error) {
          // Try to refresh token
          try {
            const refreshResponse = await authApi.refreshToken();
            const { user, tokens } = refreshResponse.data;
            setTokens(tokens.accessToken, tokens.refreshToken);
            set({
              user,
              token: tokens.accessToken,
              refreshToken: tokens.refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          } catch (refreshError) {
            clearTokens();
            set({
              user: null,
              token: null,
              refreshToken: null,
              isAuthenticated: false,
              isLoading: false,
            });
            return false;
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
