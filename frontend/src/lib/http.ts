import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/auth';

export const http: AxiosInstance = axios.create({ baseURL: '/api' });

const refreshClient: AxiosInstance = axios.create({ baseURL: '/api', withCredentials: true });

export async function refreshAccessToken(): Promise<string> {
  const response = await refreshClient.post<{
    accessToken: string;
    user: { id: string; role: 'client' | 'professional' | 'admin' };
  }>('/auth/refresh');
  const { accessToken, user } = response.data;
  useAuthStore.getState().setAuth(user, accessToken);
  return accessToken;
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retried?: boolean })
      | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const accessToken = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${accessToken}`;
        return http(original);
      } catch (refreshError) {
        useAuthStore.getState().clear();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);
