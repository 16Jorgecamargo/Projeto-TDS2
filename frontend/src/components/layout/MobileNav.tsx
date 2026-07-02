import type { JSX } from 'react';
import { NavLink } from 'react-router-dom';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../../stores/auth';
import { getMobilePrimaryItems, getNavItems, type NavItem } from '../../lib/navConfig';
import { Drawer } from '../ui/Drawer';
import { cn } from '../../lib/utils';

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  onOpenMore: () => void;
}

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

export function MobileNav({ open, onClose, onOpenMore }: MobileNavProps): JSX.Element | null {
  const role = useAuthStore((state) => state.user?.role);

  if (!role) return null;

  const primaryItems = getMobilePrimaryItems(role);
  const allItems = getNavItems(role);
  const primaryTabRouteIndexes = getPrimaryRouteIndexes(primaryItems);
  const primaryDrawerRouteIndexes = getPrimaryRouteIndexes(allItems);

  return (
    <>
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
              aria-current={isPrimaryOccurrence ? 'page' : false}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold',
                  isActive && isPrimaryOccurrence ? 'text-primary' : 'text-muted',
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-xs font-semibold text-muted"
        >
          <EllipsisHorizontalIcon className="h-5 w-5" />
          Mais
        </button>
      </nav>
      <Drawer open={open} onClose={onClose} title="Menu" side="left">
        <nav className="flex flex-col gap-1" aria-label="Menu completo">
          {allItems.map((item, index) => {
            const isPrimaryOccurrence = primaryDrawerRouteIndexes.has(index);
            return (
              <NavLink
                key={item.to + item.label}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                aria-current={isPrimaryOccurrence ? 'page' : false}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold',
                    isActive && isPrimaryOccurrence ? 'bg-surface text-primary' : 'text-ink hover:bg-surface',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </Drawer>
    </>
  );
}
