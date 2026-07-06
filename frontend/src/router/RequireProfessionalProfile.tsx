import type { JSX } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useMyProfile } from '../features/professional/queries';

const PROFILE_PATH = '/professional/profile';

export function RequireProfessionalProfile(): JSX.Element {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();
  const isProfessional = user?.role === 'professional';
  const { isError } = useMyProfile({ enabled: isProfessional });

  if (isProfessional && isError && location.pathname !== PROFILE_PATH) {
    return <Navigate to={PROFILE_PATH} replace />;
  }
  return <Outlet />;
}
