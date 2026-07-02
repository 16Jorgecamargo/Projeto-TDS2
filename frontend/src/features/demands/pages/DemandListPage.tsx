import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemandCard } from '../components/DemandCard';
import { useDemands } from '../queries';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function DemandListPage(): JSX.Element {
  const navigate = useNavigate();
  const { data, isPending } = useDemands();

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold text-ink">Demandas</h1>
      {isPending ? (
        <Skeleton className="h-24 w-full" aria-label="Carregando demandas" />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Nenhuma demanda ainda"
          action={<Button onClick={() => navigate('/demands/new')}>Publicar demanda</Button>}
        />
      ) : (
        data.items.map((d) => <DemandCard key={d.id} demand={d} onOpen={(id) => navigate(`/demands/${id}`)} />)
      )}
    </section>
  );
}
