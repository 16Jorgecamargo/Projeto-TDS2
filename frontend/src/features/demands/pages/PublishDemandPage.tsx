import type { JSX } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DemandForm } from '../components/DemandForm';
import { usePublishDemand } from '../queries';
import { inviteProfessional } from '../api';
import type { DemandFormValues } from '../schemas';
import { BackLink } from '../../../components/ui/BackLink';

export default function PublishDemandPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const professionalId = searchParams.get('professionalId');
  const publish = usePublishDemand();

  function handleSubmit(values: DemandFormValues, images: string[]) {
    publish.mutate(
      { values, images },
      {
        onSuccess: async (demand) => {
          if (professionalId) {
            try {
              await inviteProfessional(demand.id, professionalId);
            } catch {
            }
          }
          navigate(`/demands/${demand.id}`);
        },
      },
    );
  }

  return (
    <section className="p-6">
      <BackLink />
      <h1 className="mb-4 mt-4 text-2xl font-bold">Publicar demanda</h1>
      <DemandForm submitting={publish.isPending} onSubmit={handleSubmit} />
    </section>
  );
}
