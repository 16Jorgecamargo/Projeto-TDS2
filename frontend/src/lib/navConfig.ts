import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  BriefcaseIcon,
  UsersIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';
import type { Role } from '../stores/auth';

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const clientNav: NavItem[] = [
  { label: 'Minhas demandas', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
];

const professionalNav: NavItem[] = [
  { label: 'Demandas disponíveis', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Meus contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Perfil', to: '/professional/profile', icon: BriefcaseIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
];

const adminNav: NavItem[] = [
  { label: 'Denúncias', to: '/admin/reports', icon: ExclamationTriangleIcon },
  { label: 'Disputas', to: '/admin/disputes', icon: ScaleIcon },
  { label: 'Usuários', to: '/admin/users', icon: UsersIcon },
  { label: 'Auditoria', to: '/admin/audit', icon: ClipboardDocumentListIcon },
  { label: 'Catálogo', to: '/admin/catalog', icon: BriefcaseIcon },
  { label: 'Financeiro', to: '/admin/finance', icon: CreditCardIcon },
];

const navByRole: Record<Role, NavItem[]> = {
  client: clientNav,
  professional: professionalNav,
  admin: adminNav,
};

const dashboardRouteByRole: Record<Role, string> = {
  client: '/',
  professional: '/professional/dashboard',
  admin: '/admin',
};

const MOBILE_PRIMARY_ROUTE_COUNT = 2;

export function getNavItems(role: Role): NavItem[] {
  return navByRole[role];
}

export function getMobilePrimaryItems(role: Role): NavItem[] {
  return getNavItems(role).slice(0, MOBILE_PRIMARY_ROUTE_COUNT);
}

export function getDashboardItem(role: Role): NavItem {
  return { label: 'Dashboard', to: dashboardRouteByRole[role], icon: HomeIcon };
}

export function getChatItem(role: Role): NavItem | undefined {
  return getNavItems(role).find((item) => item.label === 'Chat');
}
