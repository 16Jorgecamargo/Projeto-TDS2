import { useNavigate } from 'react-router-dom';
import { useContracts } from '../queries';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContractListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useContracts();
  if (isLoading) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">Contratos</h1>
      {data?.map((contract) => (
        <button
          key={contract.id}
          type="button"
          onClick={() => navigate(`/contracts/${contract.id}`)}
          className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:border-slate-400"
        >
          <span className="font-medium">{currency(contract.total)}</span>
          <span className="text-xs uppercase tracking-wide text-slate-400">{contract.status}</span>
        </button>
      ))}
    </section>
  );
}
