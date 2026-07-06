import { useEffect, useRef, useState, type JSX } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useNotifications, useMarkAllNotificationsRead } from '../queries';
import { useAuthStore } from '../../../stores/auth';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

const MAX_PREVIEW_ITEMS = 5;

export function NotificationBell(): JSX.Element | null {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const notifications = useNotifications(1, { enabled: Boolean(user) });
  const markAllRead = useMarkAllNotificationsRead();
  const items = notifications.data?.items.slice(0, MAX_PREVIEW_ITEMS) ?? [];
  const unread = notifications.data?.items.filter((notification) => !notification.readAt).length ?? 0;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificações"
        className="relative flex h-10 w-10 shrink-0 items-center justify-center text-muted hover:text-ink"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 rounded-full bg-accent px-1.5 py-0.5 text-xs font-semibold text-bg">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-dropdown mt-2 w-80 rounded-md border border-border bg-bg py-2 shadow-md">
          {unread > 0 && (
            <div className="flex items-center justify-between gap-2 px-3 pb-2">
              <span className="text-sm font-semibold text-ink">Notificações</span>
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-xs font-semibold text-primary hover:text-primary-hover disabled:opacity-50"
              >
                Marcar todas como lida
              </button>
            </div>
          )}
          <div className="max-h-80 overflow-y-auto">
            {notifications.isLoading ? (
              <div className="px-3 py-2">
                <Skeleton className="h-16 w-full" aria-label="Carregando notificações" />
              </div>
            ) : items.length === 0 ? (
              <div className="px-3 py-2">
                <EmptyState title="Nenhuma notificação ainda" />
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-surface">
                {items.map((notification) => (
                  <li key={notification.id} className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-ink">{notification.title}</p>
                      {!notification.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    </div>
                    {notification.body && (
                      <p className="truncate text-xs text-muted">{notification.body}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-surface px-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
              className="w-full text-center text-sm font-semibold text-primary hover:text-primary-hover"
            >
              Ver todas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
