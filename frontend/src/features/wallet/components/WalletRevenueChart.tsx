import type { JSX } from 'react';
import { useTransactions } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { formatCurrency } from '../../../lib/utils';

const MONTH_COUNT = 6;
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' });

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function buildLastMonths(count: number): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: monthKey(date), label: monthFormatter.format(date) });
  }
  return months;
}

export function WalletRevenueChart(): JSX.Element {
  const { data, isPending } = useTransactions(1, 100);

  const months = buildLastMonths(MONTH_COUNT);
  const totals = new Map<string, number>(months.map((month) => [month.key, 0]));

  for (const tx of data?.items ?? []) {
    if (tx.type !== 'credit') continue;
    const key = monthKey(new Date(tx.createdAt));
    if (totals.has(key)) {
      totals.set(key, (totals.get(key) ?? 0) + tx.amount);
    }
  }

  const maxValue = Math.max(1, ...Array.from(totals.values()));

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Receita nos últimos 6 meses</h2>
      {isPending ? (
        <Skeleton className="h-40 w-full" aria-label="Carregando gráfico de receita" />
      ) : (
        <div className="flex items-end gap-3">
          {months.map((month) => {
            const value = totals.get(month.key) ?? 0;
            const heightPercent = (value / maxValue) * 100;
            return (
              <div key={month.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t-sm bg-primary"
                    style={{ height: `${heightPercent}%` }}
                    title={formatCurrency(value)}
                  />
                </div>
                <span className="text-xs capitalize text-muted">{month.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
