import { useEffect, type JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { useSidebarStore } from '../../stores/sidebar';
import { getMobilePrimaryItems, getDashboardItem, getChatItem, type NavItem } from '../../lib/navConfig';
import { Tooltip } from '../ui/Tooltip';
import { cn } from '../../lib/utils';

const AUTO_COLLAPSE_QUERY = '(max-width: 1023px)';

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
  const setCollapsed = useSidebarStore((state) => state.setCollapsed);

  useEffect(() => {
    const mediaQuery = window.matchMedia(AUTO_COLLAPSE_QUERY);
    const syncCollapsed = (event: MediaQueryList | MediaQueryListEvent) => setCollapsed(event.matches);
    syncCollapsed(mediaQuery);
    mediaQuery.addEventListener('change', syncCollapsed);
    return () => mediaQuery.removeEventListener('change', syncCollapsed);
  }, [setCollapsed]);

  if (!role) return null;

  const dashboardItem = getDashboardItem(role);
  const chatItem = getChatItem(role);
  const primaryItems = getMobilePrimaryItems(role);
  const linkItems = [dashboardItem, ...(chatItem ? [chatItem] : []), ...primaryItems];
  const primaryRouteIndexes = getPrimaryRouteIndexes(linkItems);

  function renderLink(item: NavItem, linkIndex: number) {
    const isPrimaryOccurrence = primaryRouteIndexes.has(linkIndex);
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
  }

  return (
    <aside
      className={cn(
        'hidden shrink-0 flex-col border-r border-surface bg-bg py-4 nav:flex',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Navegação principal">
        {renderLink(dashboardItem, 0)}
        {chatItem && renderLink(chatItem, 1)}
        {primaryItems.map((item, offset) => renderLink(item, (chatItem ? 2 : 1) + offset))}
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
