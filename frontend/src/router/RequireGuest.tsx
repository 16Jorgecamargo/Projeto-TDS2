import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { useAuthStore } from '../stores/auth';

export function RequireGuest(): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const isBootstrapping = useAuthStore((state) => state.isBootstrapping);

  if (isBootstrapping) {
    return null;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }
  return (
    <MotionConfig reducedMotion="user">
      <Outlet />
    </MotionConfig>
  );
}
