import type { JSX } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { useNotifications } from '../queries';

export function NotificationBell(): JSX.Element {
  const notifications = useNotifications();
  const unread = notifications.data?.items.filter((notification) => !notification.readAt).length ?? 0;

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
