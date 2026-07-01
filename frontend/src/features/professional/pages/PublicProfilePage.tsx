import { useParams } from 'react-router-dom';
import { usePublicProfile, usePortfolio } from '../queries';

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isLoading, isError } = usePublicProfile(id);
  const { data: portfolio } = usePortfolio(id);

  if (isLoading) return <p className="p-6">Carregando...</p>;
  if (isError || !profile) return <p className="p-6">Perfil nao encontrado.</p>;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">{profile.headline}</h1>
      {profile.bio ? <p>{profile.bio}</p> : null}
      <p className="text-sm text-slate-500">
        {profile.ratingAverage.toFixed(1)} ({profile.ratingCount} avaliacoes)
      </p>
      <section>
        <h2 className="text-lg font-semibold">Areas de atendimento</h2>
        <ul>
          {profile.serviceAreas.map((area) => (
            <li key={area.id}>
              {area.city} - {area.state}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Portfolio</h2>
        <ul className="flex flex-col gap-2">
          {portfolio?.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
