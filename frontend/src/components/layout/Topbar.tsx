import type { JSX } from 'react';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';
import { ProfileMenu } from './ProfileMenu';

export function Topbar(): JSX.Element {
  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center gap-4 border-b border-surface bg-bg px-4">
      <span className="flex-1 text-lg font-bold text-ink">Services Marketplace</span>
      <NotificationBell />
      <ProfileMenu />
    </header>
  );
}
