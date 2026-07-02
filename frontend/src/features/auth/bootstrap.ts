import { authApi } from './api';
import { useAuthStore } from '../../stores/auth';
import { getStoredRefreshToken } from '../../lib/authStorage';

export async function bootstrapSession(): Promise<void> {
  const { finishBootstrapping, setAuth, clear } = useAuthStore.getState();
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    finishBootstrapping();
    return;
  }

  try {
    const result = await authApi.refresh(refreshToken);
    setAuth(result.user, result.accessToken, result.refreshToken);
  } catch {
    clear();
  } finally {
    finishBootstrapping();
  }
}
