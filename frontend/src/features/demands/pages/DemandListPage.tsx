import { useNavigate } from 'react-router-dom';
import { DemandCard } from '../components/DemandCard';
import { useDemands } from '../queries';

export default function DemandListPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDemands();
  if (isLoading) return <p className="p-6 text-slate-500">Carregando…</p>;
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-3 p-6">
      <h1 className="text-2xl font-bold">Demandas</h1>
      {data?.items.map((d) => (
        <DemandCard key={d.id} demand={d} onOpen={(id) => navigate(`/demands/${id}`)} />
      ))}
    </section>
  );
}
