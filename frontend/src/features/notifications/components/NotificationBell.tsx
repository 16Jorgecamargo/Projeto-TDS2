import type { JSX } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useNotifications } from '../queries';
import { useAuthStore } from '../../../stores/auth';

export function NotificationBell(): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const notifications = useNotifications(1, { enabled: Boolean(user) });
  const unread = notifications.data?.items.filter((notification) => !notification.readAt).length ?? 0;

  if (!user) {
    return null;
  }

  return (
    <Link to="/notifications" className="relative inline-flex items-center text-ink" aria-label="Notificações">
      <BellIcon className="h-6 w-6" />
      {unread > 0 && (
        <span className="absolute -right-2 -top-2 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-bg">
          {unread}
        </span>
      )}
    </Link>
  );
}

export default NotificationBell;
