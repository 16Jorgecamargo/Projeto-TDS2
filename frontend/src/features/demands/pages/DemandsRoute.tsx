import type { JSX } from 'react';
import { useAuthStore } from '../../../stores/auth';
import DemandListPage from './DemandListPage';
import DemandSearchPage from './DemandSearchPage';

export function DemandsRoute(): JSX.Element {
  const role = useAuthStore((state) => state.user?.role);

  if (role === 'professional') {
    return <DemandSearchPage />;
  }

  return <DemandListPage />;
}

export default DemandsRoute;
