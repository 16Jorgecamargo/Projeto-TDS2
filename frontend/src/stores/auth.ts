import { create } from 'zustand';
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredRefreshToken,
} from '../lib/authStorage';
import { queryClient } from '../lib/queryClient';

export type Role = 'client' | 'professional' | 'admin';

export type AuthUser = { id: string; role: Role; name?: string; email?: string };

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isBootstrapping: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken?: string) => void;
  clear: () => void;
  finishBootstrapping: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: getStoredRefreshToken(),
  isBootstrapping: true,
  setAuth: (user, accessToken, refreshToken) => {
    const previousUserId = get().user?.id;
    const nextRefreshToken = refreshToken ?? get().refreshToken;
    if (nextRefreshToken) {
      setStoredRefreshToken(nextRefreshToken);
    }
    set({ user, accessToken, refreshToken: nextRefreshToken });
    if (previousUserId && previousUserId !== user.id) {
      void queryClient.clear();
    }
  },
  clear: () => {
    clearStoredRefreshToken();
    set({ user: null, accessToken: null, refreshToken: null });
    void queryClient.clear();
  },
  finishBootstrapping: () => set({ isBootstrapping: false }),
}));
