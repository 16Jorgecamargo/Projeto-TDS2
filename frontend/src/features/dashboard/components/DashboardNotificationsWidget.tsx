import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../notifications/queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export function DashboardNotificationsWidget(): JSX.Element {
  const { data, isPending } = useNotifications(1);
  const items = (data?.items ?? []).slice(0, 5);

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Notificações recentes</h2>
      {isPending ? (
        <Skeleton className="h-16 w-full" aria-label="Carregando notificações" />
      ) : items.length === 0 ? (
        <EmptyState title="Nenhuma notificação ainda" />
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((notification) => (
            <li key={notification.id} className="text-sm text-ink">
              {notification.title}
            </li>
          ))}
        </ul>
      )}
      <Link to="/notifications" className="mt-3 inline-block text-sm font-semibold text-primary">
        Ver todas
      </Link>
    </Card>
  );
}
