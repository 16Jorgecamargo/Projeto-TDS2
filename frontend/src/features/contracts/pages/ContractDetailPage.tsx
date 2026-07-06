import { useState, type JSX } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { XCircleIcon } from '@heroicons/react/24/solid';
import {
  useContract,
  useContractProgress,
  useAddProgress,
  useStartContract,
  useCompleteContract,
  usePayment,
} from '../queries';
import { useCreateRoom } from '../../chat/queries';
import { useAuthStore } from '../../../stores/auth';
import { ContractProgress } from '../components/ContractProgress';
import { ProgressUpdateForm } from '../components/ProgressUpdateForm';
import { DisputeDialog } from '../components/DisputeDialog';
import { PaymentDialog } from '../components/PaymentDialog';
import { ReviewForm } from '../../reviews/components/ReviewForm';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Skeleton } from '../../../components/ui/Skeleton';
import { BackLink } from '../../../components/ui/BackLink';
import { formatCurrency, formatDate } from '../../../lib/utils';
import type { Contract, ContractStatus } from '../api';

const STATUS_LABELS: Record<ContractStatus, string> = {
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  disputed: 'Em disputa',
};

export default function ContractDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [disputing, setDisputing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const { data: contract, isPending } = useContract(id);
  const { data: updates } = useContractProgress(id);
  const { data: payment } = usePayment(id);
  const addProgress = useAddProgress(id);
  const startContract = useStartContract(id);
  const completeContract = useCompleteContract(id);
  const createRoom = useCreateRoom();

  if (isPending || !contract) {
    return (
      <div className="p-6">
        <Skeleton className="h-24 w-full" aria-label="Carregando contrato" />
      </div>
    );
  }

  const isProfessional = user?.role === 'professional';
  const isClient = user?.role === 'client';
  const isOwnProfessionalContract = isProfessional && user?.id === contract.professionalUserId;

  const canStart = isOwnProfessionalContract && contract.status === 'active' && contract.startedAt === null;
  const canRegisterProgress =
    isOwnProfessionalContract && contract.status === 'active' && contract.startedAt !== null;
  const canPay =
    isClient &&
    contract.status !== 'cancelled' &&
    contract.status !== 'disputed' &&
    (!payment || payment.status !== 'captured');
  const canReview = !reviewDone && contract.status === 'completed' && (isClient || isProfessional);
  const otherPartyName = isProfessional ? contract.clientName : contract.professionalHeadline;

  function handleChat(activeContract: Contract) {
    const participantId = isClient ? activeContract.professionalUserId : activeContract.clientId;
    createRoom.mutate(
      { participantId, contractId: activeContract.id },
      { onSuccess: (room) => navigate(`/chat/${room.id}`) },
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <BackLink />
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink">{otherPartyName}</h1>
          <p className="text-sm text-muted">{formatCurrency(contract.total)}</p>
        </div>
        <Badge tone={contract.status === 'disputed' ? 'accent' : 'neutral'}>
          <span className="flex items-center gap-1">
            {contract.status === 'cancelled' && <XCircleIcon className="h-3.5 w-3.5 text-muted" />}
            {STATUS_LABELS[contract.status]}
          </span>
        </Badge>
      </header>

      {contract.schedule && (
        <div className="rounded-lg bg-surface p-3">
          <p className="text-sm font-medium text-ink">{formatDate(contract.schedule.scheduledDate)}</p>
          {contract.schedule.notes && <p className="text-sm text-muted">{contract.schedule.notes}</p>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canStart && (
          <Button onClick={() => startContract.mutate()} disabled={startContract.isPending}>
            Iniciar contrato
          </Button>
        )}
        {canRegisterProgress && (
          <Button onClick={() => completeContract.mutate()} disabled={completeContract.isPending}>
            Concluir contrato
          </Button>
        )}
        {canPay && <Button onClick={() => setPaying(true)}>Pagar</Button>}
        <Button variant="ghost" onClick={() => handleChat(contract)} disabled={createRoom.isPending}>
          Chat
        </Button>
        <Button variant="ghost" onClick={() => setDisputing(true)}>
          Abrir disputa
        </Button>
      </div>

      {canRegisterProgress && (
        <ProgressUpdateForm submitting={addProgress.isPending} onSubmit={(values) => addProgress.mutate(values)} />
      )}

      <h2 className="text-lg font-semibold text-ink">Acompanhamento</h2>
      <ContractProgress updates={updates ?? []} />

      {canReview && (
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-ink">Avaliar</h2>
          <ReviewForm contractId={contract.id} onDone={() => setReviewDone(true)} />
        </div>
      )}

      {disputing && <DisputeDialog contractId={id} onClose={() => setDisputing(false)} />}
      {paying && <PaymentDialog contractId={id} total={contract.total} onClose={() => setPaying(false)} />}
    </div>
  );
}
