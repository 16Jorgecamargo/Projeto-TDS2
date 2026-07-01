import { useNavigate } from 'react-router-dom';
import { DemandForm } from '../components/DemandForm';
import { usePublishDemand } from '../queries';

export default function PublishDemandPage() {
  const navigate = useNavigate();
  const publish = usePublishDemand();
  return (
    <section className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Publicar demanda</h1>
      <DemandForm
        submitting={publish.isPending}
        onSubmit={(values) => publish.mutate(values, { onSuccess: (d) => navigate(`/demands/${d.id}`) })}
      />
    </section>
  );
}
