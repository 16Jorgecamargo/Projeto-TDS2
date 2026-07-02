import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { getMobilePrimaryItems, getDashboardItem, getChatItem, type NavItem } from '../../lib/navConfig';
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

function NavTab({ item, isPrimaryOccurrence }: { item: NavItem; isPrimaryOccurrence: boolean }): JSX.Element {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      aria-label={item.label}
      aria-current={isPrimaryOccurrence ? 'page' : false}
      className={({ isActive }) =>
        cn(
          'flex flex-1 items-center justify-center py-3',
          isActive && isPrimaryOccurrence ? 'text-primary' : 'text-muted',
        )
      }
    >
      <item.icon className="h-7 w-7" strokeWidth={1.75} />
    </NavLink>
  );
}

export function MobileNav(): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);
  const openPalette = useCommandPaletteStore((state) => state.openPalette);

  if (!role) return null;

  const dashboardItem = getDashboardItem(role);
  const primaryItems = getMobilePrimaryItems(role);
  const chatItem = getChatItem(role);

  const linkItems = [dashboardItem, ...primaryItems, ...(chatItem ? [chatItem] : [])];
  const primaryRouteIndexes = getPrimaryRouteIndexes(linkItems);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-surface bg-bg nav:hidden"
    >
      <NavTab item={linkItems[0]} isPrimaryOccurrence={primaryRouteIndexes.has(0)} />
      {primaryItems.map((item, offset) => {
        const index = offset + 1;
        return <NavTab key={item.to + item.label} item={item} isPrimaryOccurrence={primaryRouteIndexes.has(index)} />;
      })}
      <button
        type="button"
        onClick={openPalette}
        aria-label="Buscar"
        className="flex flex-1 items-center justify-center py-3 text-muted"
      >
        <MagnifyingGlassIcon className="h-7 w-7" strokeWidth={1.75} />
      </button>
      {chatItem && (
        <NavTab item={chatItem} isPrimaryOccurrence={primaryRouteIndexes.has(linkItems.length - 1)} />
      )}
    </nav>
  );
}
