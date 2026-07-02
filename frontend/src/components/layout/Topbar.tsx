import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { Bars3Icon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { useCommandPaletteStore } from '../../stores/commandPalette';
import { ProfileMenu } from './ProfileMenu';

export interface TopbarProps {
  onOpenMobileNav: () => void;
}

export function Topbar({ onOpenMobileNav }: TopbarProps): JSX.Element {
  const openPalette = useCommandPaletteStore((state) => state.openPalette);

  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-4 border-b border-surface bg-bg px-4">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
        className="rounded-sm p-2 hover:bg-surface md:hidden"
      >
        <Bars3Icon className="h-6 w-6 text-ink" />
      </button>
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
