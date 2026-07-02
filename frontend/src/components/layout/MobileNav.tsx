import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { getMobilePrimaryItems, type NavItem } from '../../lib/navConfig';
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

export function MobileNav(): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);

  if (!role) return null;

  const primaryItems = getMobilePrimaryItems(role);
  const primaryTabRouteIndexes = getPrimaryRouteIndexes(primaryItems);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-sticky flex border-t border-surface bg-bg md:hidden"
    >
      {primaryItems.map((item, index) => {
        const isPrimaryOccurrence = primaryTabRouteIndexes.has(index);
        return (
          <NavLink
            key={item.to + item.label}
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
      })}
    </nav>
  );
}
