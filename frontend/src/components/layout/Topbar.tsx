import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { useAuthStore } from '../../stores/auth';
import { DashboardIcon, getDashboardRoute } from '../../lib/navConfig';
import { ProfileMenu } from './ProfileMenu';

export function Topbar(): JSX.Element {
  const openPalette = useCommandPaletteStore((state) => state.openPalette);
  const role = useAuthStore((state) => state.user?.role);

  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-4 border-b border-surface bg-bg px-4">
      {role && (
        <Link
          to={getDashboardRoute(role)}
          aria-label="Dashboard"
          className="rounded-sm p-2 hover:bg-surface md:hidden"
        >
          <DashboardIcon className="h-6 w-6 text-ink" />
        </Link>
      )}
      <Link to="/" className="shrink-0 text-lg font-bold text-ink">
        Services Marketplace
      </Link>
      <button
        type="button"
        onClick={openPalette}
        className="flex items-center gap-2 rounded-sm border border-surface px-3 py-2 text-left text-sm text-muted hover:border-primary sm:flex-1"
      >
        <MagnifyingGlassIcon className="h-4 w-4" />
        <span className="hidden flex-1 sm:inline">Buscar ou navegar...</span>
        <kbd className="hidden rounded-sm bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted sm:inline-block">Ctrl K</kbd>
      </button>
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
