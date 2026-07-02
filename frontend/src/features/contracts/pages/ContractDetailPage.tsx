import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useContract, useContractProgress, useAddProgress, useCompleteContract } from '../queries';
import { ContractProgress } from '../components/ContractProgress';
import { ProgressUpdateForm } from '../components/ProgressUpdateForm';
import { DisputeDialog } from '../components/DisputeDialog';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ContractDetailPage() {
  const { id = '' } = useParams();
  const [disputing, setDisputing] = useState(false);
  const { data: contract } = useContract(id);
  const { data: updates } = useContractProgress(id);
  const addProgress = useAddProgress(id);
  const complete = useCompleteContract(id);

  if (!contract) return <p className="p-6 text-slate-500">Carregando…</p>;
  const isInProgress = contract.status === 'active' && contract.startedAt !== null;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{currency(contract.total)}</h1>
        <span className="text-xs uppercase tracking-wide text-slate-400">{contract.status}</span>
      </header>
      <div className="flex gap-2">
        {isInProgress && (
          <button type="button" onClick={() => complete.mutate()} className="rounded-lg bg-slate-900 px-3 py-2 text-white">
            Concluir contrato
          </button>
        )}
        <button type="button" onClick={() => setDisputing(true)} className="rounded-lg border border-red-300 px-3 py-2 text-red-600">
          Abrir disputa
        </button>
      </div>
      {isInProgress && (
        <ProgressUpdateForm submitting={addProgress.isPending} onSubmit={(values) => addProgress.mutate(values)} />
      )}
      <h2 className="text-lg font-semibold">Acompanhamento</h2>
      <ContractProgress updates={updates ?? []} />
      {disputing && <DisputeDialog contractId={id} onClose={() => setDisputing(false)} />}
    </section>
  );
}
