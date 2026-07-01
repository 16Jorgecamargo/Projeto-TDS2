import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDemand, useDemandQuotes, useAcceptQuote } from '../queries';
import { InviteProfessionalDialog } from '../components/InviteProfessionalDialog';

const currency = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function DemandDetailPage() {
  const { id = '' } = useParams();
  const [inviting, setInviting] = useState(false);
  const { data: demand } = useDemand(id);
  const { data: quotes } = useDemandQuotes(id);
  const accept = useAcceptQuote(id);

  if (!demand) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{demand.title}</h1>
        <button type="button" onClick={() => setInviting(true)} className="rounded-lg border border-slate-300 px-3 py-2">
          Convidar profissional
        </button>
      </header>
      <p className="text-slate-600">{demand.description}</p>
      <h2 className="text-lg font-semibold">Orçamentos</h2>
      <ul className="flex flex-col gap-2">
        {quotes?.map((q) => (
          <li key={q.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span>
              {currency(q.total)} — {q.status}
            </span>
            {q.status === 'pending' && demand.status === 'open' && (
              <button
                type="button"
                onClick={() => accept.mutate(q.id)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-white"
              >
                Aceitar
              </button>
            )}
          </li>
        ))}
      </ul>
      {inviting && <InviteProfessionalDialog demandId={id} onClose={() => setInviting(false)} />}
    </section>
  );
}
