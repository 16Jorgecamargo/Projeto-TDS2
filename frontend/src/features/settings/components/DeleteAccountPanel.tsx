import { useState, type JSX } from 'react';
import { useCancelDeletion, useDeletionStatus, useRequestDeletion } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

export function DeleteAccountPanel(): JSX.Element {
  const { data } = useDeletionStatus();
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-accent">Excluir conta</h2>
      {data ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">
            Exclusão agendada para {new Date(data.scheduledFor).toLocaleDateString()}. Você pode cancelar
            durante a carência.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            Cancelar exclusão
          </Button>
        </div>
      ) : (
        <Button type="button" variant="accent" onClick={() => setConfirming(true)}>
          Solicitar exclusão
        </Button>
      )}
      {confirming && (
        <Modal open onClose={() => setConfirming(false)} title="Confirmar exclusão de conta">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              A conta será excluída após o período de carência. Você poderá cancelar antes desse prazo, mas
              essa é uma ação séria e irreversível após a carência terminar.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={request.isPending}
                onClick={() => {
                  request.mutate();
                  setConfirming(false);
                }}
              >
                Confirmar exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export default DeleteAccountPanel;
