import type { JSX } from 'react';
import { useNotifications, useMarkNotificationRead } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Button } from '../../../components/ui/Button';
import { BackLink } from '../../../components/ui/BackLink';

export function NotificationsPage(): JSX.Element {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();

  if (notifications.isLoading || !notifications.data) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <BackLink />
        <h1 className="text-2xl font-semibold text-ink">Notificações</h1>
        <Skeleton className="h-16 w-full" aria-label="Carregando notificações" />
      </div>
    );
  }

  const items = notifications.data.items;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <BackLink />
      <h1 className="text-2xl font-semibold text-ink">Notificações</h1>
      {items.length === 0 ? (
        <EmptyState title="Nenhuma notificação ainda" />
      ) : (
        <Card noPadding className="flex flex-col gap-0 divide-y divide-surface">
          {items.map((notification) => (
            <div key={notification.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{notification.title}</p>
                  {!notification.readAt && <Badge tone="accent">Não lida</Badge>}
                </div>
                {notification.body && <p className="text-sm text-muted">{notification.body}</p>}
                <p className="text-xs text-muted">
                  {new Date(notification.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              {!notification.readAt && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => markRead.mutate(notification.id)}
                  disabled={markRead.isPending}
                >
                  Marcar lida
                </Button>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export default NotificationsPage;
