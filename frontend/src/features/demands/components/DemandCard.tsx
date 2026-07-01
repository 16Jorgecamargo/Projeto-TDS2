import type { Demand } from '../api';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface DemandCardProps {
  demand: Demand;
  onOpen: (id: string) => void;
}

export function DemandCard({ demand, onOpen }: DemandCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(demand.id)}
      className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 p-4 text-left hover:border-slate-400"
    >
      <span className="text-base font-semibold text-slate-900">{demand.title}</span>
      <span className="text-sm text-slate-500">
        {currency(demand.budgetMin)} — {currency(demand.budgetMax)}
      </span>
      <span className="text-xs uppercase tracking-wide text-slate-400">{demand.status}</span>
    </button>
  );
}
