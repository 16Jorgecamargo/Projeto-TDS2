import { describe, it, expect, beforeEach } from 'vitest';
import { http } from './http';
import { useAuthStore } from '../stores/auth';

describe('http client', () => {
  beforeEach(() => {
    useAuthStore.getState().clear();
  });

  it('uses the /api baseURL', () => {
    expect(http.defaults.baseURL).toBe('/api');
  });

  it('attaches the bearer token from the auth store', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 'token-xyz');
    const requestInterceptor = (
      http.interceptors.request as unknown as {
        handlers: {
          fulfilled: (c: { headers: Record<string, string> }) => {
            headers: Record<string, string>;
          };
        }[];
      }
    ).handlers[0].fulfilled;
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBe('Bearer token-xyz');
  });

  it('omits the header when logged out', () => {
    const requestInterceptor = (
      http.interceptors.request as unknown as {
        handlers: {
          fulfilled: (c: { headers: Record<string, string> }) => {
            headers: Record<string, string>;
          };
        }[];
      }
    ).handlers[0].fulfilled;
    const config = requestInterceptor({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});
