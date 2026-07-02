import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, type Role } from '../stores/auth';

interface ProtectedRouteProps {
  roles?: Role[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return null;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}
