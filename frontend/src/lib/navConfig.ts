import type { ComponentType, SVGProps } from 'react';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  BanknotesIcon,
  BellIcon,
  Cog6ToothIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChartBarIcon,
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
  { label: 'Dashboard', to: '/', icon: HomeIcon },
  { label: 'Buscar profissional', to: '/search', icon: MagnifyingGlassIcon },
  { label: 'Minhas demandas', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
  { label: 'Notificações', to: '/notifications', icon: BellIcon },
  { label: 'Configurações', to: '/settings', icon: Cog6ToothIcon },
];

const professionalNav: NavItem[] = [
  { label: 'Dashboard', to: '/professional/dashboard', icon: HomeIcon },
  { label: 'Demandas disponíveis', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Meus contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Portfólio/Perfil', to: '/professional/dashboard', icon: BriefcaseIcon },
  { label: 'Disponibilidade', to: '/professional/dashboard', icon: CalendarDaysIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
  { label: 'Notificações', to: '/notifications', icon: BellIcon },
  { label: 'Configurações', to: '/settings', icon: Cog6ToothIcon },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: ChartBarIcon },
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

const MOBILE_PRIMARY_COUNT = 4;
const MOBILE_PRIMARY_EXCLUDED_ROUTES = new Set(['/search']);

export function getNavItems(role: Role): NavItem[] {
  return navByRole[role];
}

export function getMobilePrimaryItems(role: Role): NavItem[] {
  return getNavItems(role)
    .filter((item) => !MOBILE_PRIMARY_EXCLUDED_ROUTES.has(item.to))
    .slice(0, MOBILE_PRIMARY_COUNT);
}

export function getMobileOverflowItems(role: Role): NavItem[] {
  return getNavItems(role).slice(MOBILE_PRIMARY_COUNT);
}
