import type { JSX } from 'react';
import { useAuthStore } from '../stores/auth';
import LandingPage from '../features/landing/pages/LandingPage';
import { ClientDashboardPage } from '../features/dashboard/pages/ClientDashboardPage';

export function HomeRoute(): JSX.Element {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'client') {
    return <ClientDashboardPage />;
  }

  return <LandingPage />;
}
