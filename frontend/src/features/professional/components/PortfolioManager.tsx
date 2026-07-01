import { useState } from 'react';
import { usePortfolio, useCreatePortfolioItem, useRemovePortfolioItem } from '../queries';

export function PortfolioManager({ professionalId }: { professionalId: string | undefined }) {
  const { data } = usePortfolio(professionalId);
  const create = useCreatePortfolioItem(professionalId);
  const remove = useRemovePortfolioItem(professionalId);
  const [title, setTitle] = useState('');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Portfolio</h2>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          placeholder="Titulo do trabalho"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="button"
          disabled={!title || create.isPending}
          onClick={() => {
            create.mutate({ categoryId: null, title, description: null, completedAt: null });
            setTitle('');
          }}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {data?.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>{item.title}</span>
            <button type="button" onClick={() => remove.mutate(item.id)} className="text-sm text-red-600 underline">
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
