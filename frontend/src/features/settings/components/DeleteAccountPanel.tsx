import { useCancelDeletion, useDeletionStatus, useRequestDeletion } from '../queries';

export function DeleteAccountPanel() {
  const { data } = useDeletionStatus();
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-red-700">Excluir conta</h2>
      {data ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Exclusao agendada para {new Date(data.scheduledFor).toLocaleDateString()}. Voce pode cancelar
            durante a carencia.
          </p>
          <button onClick={() => cancel.mutate()} disabled={cancel.isPending} className="rounded border py-2">
            Cancelar exclusao
          </button>
        </div>
      ) : (
        <button
          onClick={() => request.mutate()}
          disabled={request.isPending}
          className="rounded bg-red-600 py-2 text-white disabled:opacity-50"
        >
          Solicitar exclusao
        </button>
      )}
    </section>
  );
}
