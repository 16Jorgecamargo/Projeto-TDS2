import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
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
  { label: 'Configurações', to: '/settings', icon: Cog6ToothIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
];

const professionalNav: NavItem[] = [
  { label: 'Demandas disponíveis', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Meus contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Configurações', to: '/settings', icon: Cog6ToothIcon },
  { label: 'Portfólio/Perfil', to: '/professional/dashboard', icon: BriefcaseIcon },
  { label: 'Disponibilidade', to: '/professional/dashboard', icon: CalendarDaysIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
];

const adminNav: NavItem[] = [
  { label: 'Denúncias', to: '/admin', icon: ExclamationTriangleIcon },
  { label: 'Disputas', to: '/admin', icon: ScaleIcon },
  { label: 'Usuários', to: '/admin', icon: UsersIcon },
  { label: 'Contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Pagamentos/Carteira', to: '/wallet', icon: CreditCardIcon },
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

const MOBILE_PRIMARY_COUNT = 4;

export function getNavItems(role: Role): NavItem[] {
  return navByRole[role];
}

export function getMobilePrimaryItems(role: Role): NavItem[] {
  return getNavItems(role).slice(0, MOBILE_PRIMARY_COUNT);
}

export function getDashboardRoute(role: Role): string {
  return dashboardRouteByRole[role];
}

export { HomeIcon as DashboardIcon };
