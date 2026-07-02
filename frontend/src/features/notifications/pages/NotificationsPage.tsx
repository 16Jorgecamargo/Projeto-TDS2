import { useNotifications, useMarkNotificationRead } from '../queries';

export function NotificationsPage() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();

  if (notifications.isLoading || !notifications.data) {
    return <p className="p-6 text-gray-500">Carregando notificações...</p>;
  }

  const items = notifications.data.items;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Notificações</h1>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhuma notificação ainda.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-2xl bg-white shadow">
          {items.map((notification) => (
            <li key={notification.id} className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                {notification.body && (
                  <p className="text-sm text-gray-500">{notification.body}</p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(notification.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              {!notification.readAt && (
                <button
                  type="button"
                  onClick={() => markRead.mutate(notification.id)}
                  disabled={markRead.isPending}
                  className="shrink-0 text-sm text-blue-600"
                >
                  Marcar lida
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NotificationsPage;
