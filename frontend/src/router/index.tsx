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

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
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
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
