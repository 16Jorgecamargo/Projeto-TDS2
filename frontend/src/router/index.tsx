import { createBrowserRouter } from 'react-router-dom';
import { App } from '../App';
import { NotFound } from '../pages/NotFound';
import { Forbidden } from '../pages/Forbidden';
import { ProtectedRoute } from './ProtectedRoute';
import { RequireGuest } from './RequireGuest';
import { RequireProfessionalProfile } from './RequireProfessionalProfile';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import VerifyEmailPage from '../features/auth/pages/VerifyEmailPage';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import SettingsPage from '../features/settings/pages/SettingsPage';
import PublicProfilePage from '../features/professional/pages/PublicProfilePage';
import ProfessionalDashboardPage from '../features/professional-dashboard/pages/ProfessionalDashboardPage';
import ProfessionalProfileEditPage from '../features/professional/pages/ProfessionalProfileEditPage';
import { HomeRoute } from '../pages/HomeRoute';
import SearchPage from '../features/landing/pages/SearchPage';
import PublishDemandPage from '../features/demands/pages/PublishDemandPage';
import DemandsRoute from '../features/demands/pages/DemandsRoute';
import DemandDetailPage from '../features/demands/pages/DemandDetailPage';
import ContractListPage from '../features/contracts/pages/ContractListPage';
import ContractDetailPage from '../features/contracts/pages/ContractDetailPage';
import WalletPage from '../features/wallet/pages/WalletPage';
import { NotificationsPage } from '../features/notifications/pages/NotificationsPage';
import { ChatIndexPage } from '../features/chat/pages/ChatIndexPage';
import { ChatPage } from '../features/chat/pages/ChatPage';
import { AdminDashboardPage } from '../features/admin/pages/AdminDashboardPage';
import { ReportsPage } from '../features/admin/pages/ReportsPage';
import { DisputesPage } from '../features/admin/pages/DisputesPage';
import { UsersPage } from '../features/admin/pages/UsersPage';
import { AuditPage } from '../features/admin/pages/AuditPage';
import { CatalogPage } from '../features/admin/pages/CatalogPage';
import { FinancePage } from '../features/admin/pages/FinancePage';

export const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        element: <RequireProfessionalProfile />,
        children: [
          { path: '/', element: <HomeRoute /> },
          { path: '/search', element: <SearchPage /> },
          { path: '/forbidden', element: <Forbidden /> },
          { path: '/professionals/:id', element: <PublicProfilePage /> },
          {
            element: <ProtectedRoute />,
            children: [
              { path: '/settings', element: <SettingsPage /> },
              { path: '/professional/dashboard', element: <ProfessionalDashboardPage /> },
              { path: '/professional/profile', element: <ProfessionalProfileEditPage /> },
              { path: '/demands', element: <DemandsRoute /> },
              { path: '/demands/:id', element: <DemandDetailPage /> },
              { path: '/contracts', element: <ContractListPage /> },
              { path: '/contracts/:id', element: <ContractDetailPage /> },
              { path: '/wallet', element: <WalletPage /> },
              { path: '/notifications', element: <NotificationsPage /> },
              { path: '/chat', element: <ChatIndexPage /> },
              { path: '/chat/:roomId', element: <ChatPage /> },
            ],
          },
          {
            element: <ProtectedRoute roles={['client']} />,
            children: [{ path: '/demands/new', element: <PublishDemandPage /> }],
          },
          {
            element: <ProtectedRoute roles={['admin']} />,
            children: [
              { path: '/admin', element: <AdminDashboardPage /> },
              { path: '/admin/reports', element: <ReportsPage /> },
              { path: '/admin/disputes', element: <DisputesPage /> },
              { path: '/admin/users', element: <UsersPage /> },
              { path: '/admin/audit', element: <AuditPage /> },
              { path: '/admin/catalog', element: <CatalogPage /> },
              { path: '/admin/finance', element: <FinancePage /> },
            ],
          },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  {
    element: <RequireGuest />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
]);
