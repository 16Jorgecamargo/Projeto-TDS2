import { ProfessionalCard } from '../../professional/components/ProfessionalCard';
import { useSearchProfessionals } from '../queries';
import type { SearchParams } from '../api';

export function ProfessionalResults({ params }: { params: SearchParams }) {
  const { data, isLoading, isError } = useSearchProfessionals(params);

  if (isLoading) return <p>Carregando...</p>;
  if (isError) return <p>Nao foi possivel carregar os resultados.</p>;
  if (!data || data.items.length === 0) return <p>Nenhum profissional encontrado.</p>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {data.items.map((item) => (
        <ProfessionalCard
          key={item.id}
          id={item.id}
          headline={item.headline}
          bio={item.bio}
          hourlyRate={item.hourlyRate}
          ratingAverage={item.ratingAverage}
          ratingCount={item.ratingCount}
        />
      ))}
    </div>
  );
}
