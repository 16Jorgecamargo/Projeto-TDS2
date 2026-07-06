import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useDashboard } from '../queries';
import { StatTile } from '../../../components/ui/StatTile';
import { Skeleton } from '../../../components/ui/Skeleton';

export function DashboardMetrics(): JSX.Element {
  const dashboard = useDashboard();
  const navigate = useNavigate();

  if (dashboard.isLoading || !dashboard.data) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  const { counters, pending, activity, finance } = dashboard.data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Contadores gerais</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Usuários totais" value={String(counters.totalUsers)} />
          <StatTile label="Contratos ativos" value={String(counters.activeContracts)} />
          <StatTile label="Demandas abertas" value={String(counters.openDemands)} />
          <StatTile label="GMV (30d)" value={counters.gmvLast30Days} />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Fila de pendências</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatTile
            label="Denúncias pendentes"
            value={String(pending.reports)}
            onClick={() => navigate('/admin/reports')}
          />
          <StatTile
            label="Disputas pendentes"
            value={String(pending.disputes)}
            onClick={() => navigate('/admin/disputes')}
          />
          <StatTile
            label="Saques pendentes"
            value={String(pending.withdrawals)}
            onClick={() => navigate('/admin/finance')}
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Atividade (30 dias)</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-64">
            <h3 className="mb-2 text-sm font-semibold text-muted">Novos usuários</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity.newUsersByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="currentColor" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-64">
            <h3 className="mb-2 text-sm font-semibold text-muted">Contratos concluídos</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity.completedContractsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="currentColor" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Financeiro resumido</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Capturado (30d)" value={finance.totalCaptured30d} />
          <StatTile label="Estornado (30d)" value={finance.totalRefunded30d} />
          <StatTile label="Saldo em carteiras" value={finance.walletBalanceSum} />
          <StatTile label="Saques pendentes (R$)" value={finance.pendingWithdrawalsAmount} />
        </div>
      </div>
    </div>
  );
}
