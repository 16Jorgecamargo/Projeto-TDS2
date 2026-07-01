import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './auth';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('starts logged out', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('stores the user and token on setAuth', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token-abc');
    const state = useAuthStore.getState();
    expect(state.user).toEqual({ id: 'u1', role: 'client' });
    expect(state.accessToken).toBe('token-abc');
  });

  it('resets state on clear', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'admin' }, 'token-abc');
    useAuthStore.getState().clear();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});
