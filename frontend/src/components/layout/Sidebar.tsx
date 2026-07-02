import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { useSidebarStore } from '../../stores/sidebar';
import { getNavItems, type NavItem } from '../../lib/navConfig';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/utils';

function getPrimaryRouteIndexes(items: NavItem[]): Set<number> {
  const seenRoutes = new Set<string>();
  const primaryIndexes = new Set<number>();
  items.forEach((item, index) => {
    if (!seenRoutes.has(item.to)) {
      seenRoutes.add(item.to);
      primaryIndexes.add(index);
    }
  });
  return primaryIndexes;
}

export function Sidebar(): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);
  const collapsed = useSidebarStore((state) => state.collapsed);
  const toggle = useSidebarStore((state) => state.toggle);

  if (!role) return null;

  const items = getNavItems(role);
  const primaryRouteIndexes = getPrimaryRouteIndexes(items);

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-surface bg-bg py-4 md:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Navegação principal">
        {items.map((item, index) => {
          const isPrimaryOccurrence = primaryRouteIndexes.has(index);
          const link = (
            <NavLink
              to={item.to}
              end={item.to === '/'}
              aria-label={collapsed ? item.label : undefined}
              aria-current={isPrimaryOccurrence ? 'page' : false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold transition-colors',
                  isActive && isPrimaryOccurrence
                    ? 'bg-surface text-primary'
                    : 'text-muted hover:bg-surface hover:text-ink',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );

          return collapsed ? (
            <Tooltip key={item.to + item.label} label={item.label}>
              {link}
            </Tooltip>
          ) : (
            <span key={item.to + item.label}>{link}</span>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        className="mx-2 mt-2 flex items-center justify-center rounded-sm p-2 text-muted hover:bg-surface"
      >
        {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
      </button>
    </aside>
  );
}
