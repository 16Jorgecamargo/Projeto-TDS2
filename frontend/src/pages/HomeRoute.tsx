import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import LandingPage from '../features/landing/pages/LandingPage';
import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage';
import { ProfessionalDashboardPage } from '../features/professional-dashboard/pages/ProfessionalDashboardPage';

export function HomeRoute(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }

  if (user?.role === 'professional') {
    return <ProfessionalDashboardPage />;
  }

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <LandingPage />;
}
