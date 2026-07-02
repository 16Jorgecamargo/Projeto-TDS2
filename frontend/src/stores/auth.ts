import { create } from 'zustand';
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredRefreshToken,
} from '../lib/authStorage';

export type Role = 'client' | 'professional' | 'admin';

export type AuthUser = { id: string; role: Role };

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
    const nextRefreshToken = refreshToken ?? get().refreshToken;
    if (nextRefreshToken) {
      setStoredRefreshToken(nextRefreshToken);
    }
    set({ user, accessToken, refreshToken: nextRefreshToken });
  },
  clear: () => {
    clearStoredRefreshToken();
    set({ user: null, accessToken: null, refreshToken: null });
  },
  finishBootstrapping: () => set({ isBootstrapping: false }),
}));
