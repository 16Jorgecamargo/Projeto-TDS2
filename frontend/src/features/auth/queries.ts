import { useMutation } from '@tanstack/react-query';
import { authApi } from './api';
import { useAuthStore } from '../../stores/auth';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      setAuth(result.user, result.accessToken);
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (result) => {
      setAuth(result.user, result.accessToken);
    },
  });
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword });
}

export function useResetPassword() {
  return useMutation({ mutationFn: authApi.resetPassword });
}
