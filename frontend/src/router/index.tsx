import { createBrowserRouter } from 'react-router-dom';
import { App } from '../App';
import { NotFound } from '../pages/NotFound';
import { ProtectedRoute } from './ProtectedRoute';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import PublicProfilePage from '../features/professional/pages/PublicProfilePage';
import ProfessionalDashboardPage from '../features/professional/pages/ProfessionalDashboardPage';
import LandingPage from '../features/landing/pages/LandingPage';
import SearchPage from '../features/landing/pages/SearchPage';
import PublishDemandPage from '../features/demands/pages/PublishDemandPage';
import DemandListPage from '../features/demands/pages/DemandListPage';
import DemandDetailPage from '../features/demands/pages/DemandDetailPage';
import ContractListPage from '../features/contracts/pages/ContractListPage';
import ContractDetailPage from '../features/contracts/pages/ContractDetailPage';
import WalletPage from '../features/wallet/pages/WalletPage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/forbidden', element: <div /> },
      { path: '/professionals/:id', element: <PublicProfilePage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: '/settings', element: <SettingsPage /> },
          { path: '/professional/dashboard', element: <ProfessionalDashboardPage /> },
          { path: '/demands', element: <DemandListPage /> },
          { path: '/demands/:id', element: <DemandDetailPage /> },
          { path: '/contracts', element: <ContractListPage /> },
          { path: '/contracts/:id', element: <ContractDetailPage /> },
          { path: '/wallet', element: <WalletPage /> },
        ],
      },
      {
        element: <ProtectedRoute roles={['client']} />,
        children: [{ path: '/demands/new', element: <PublishDemandPage /> }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
