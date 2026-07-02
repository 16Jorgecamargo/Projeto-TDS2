import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { DemandForm } from '../components/DemandForm';
import { usePublishDemand } from '../queries';
import type { DemandFormValues } from '../schemas';

export default function PublishDemandPage(): JSX.Element {
  const navigate = useNavigate();
  const publish = usePublishDemand();

  function handleSubmit(values: DemandFormValues, images: string[]) {
    publish.mutate(
      { values, images },
      { onSuccess: (demand) => navigate(`/demands/${demand.id}`) },
    );
  }

  return (
    <section className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Publicar demanda</h1>
      <DemandForm submitting={publish.isPending} onSubmit={handleSubmit} />
    </section>
  );
}
