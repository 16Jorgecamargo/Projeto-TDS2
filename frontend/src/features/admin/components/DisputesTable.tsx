import { useDisputes, useResolveDispute } from '../queries';

export function DisputesTable() {
  const disputes = useDisputes();
  const resolve = useResolveDispute();

  if (disputes.isLoading || !disputes.data) {
    return <p className="text-sm text-gray-500">Carregando disputas...</p>;
  }

  if (disputes.data.items.length === 0) {
    return <p className="text-sm text-gray-400">Nenhuma disputa em aberto.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-gray-500">
          <th className="py-2">Disputa</th>
          <th className="py-2">Status</th>
          <th className="py-2">Ação</th>
        </tr>
      </thead>
      <tbody>
        {disputes.data.items.map((dispute) => (
          <tr key={dispute.id} className="border-t border-gray-100">
            <td className="py-2">{dispute.id}</td>
            <td className="py-2">{dispute.status}</td>
            <td className="py-2 space-x-3">
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() =>
                  resolve.mutate({ id: dispute.id, outcome: 'refund_client', note: 'Reembolso ao cliente' })
                }
                className="text-indigo-600"
              >
                Reembolsar cliente
              </button>
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() =>
                  resolve.mutate({
                    id: dispute.id,
                    outcome: 'release_professional',
                    note: 'Liberado para o profissional',
                  })
                }
                className="text-indigo-600"
              >
                Liberar profissional
              </button>
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ id: dispute.id, outcome: 'split', note: 'Divisao entre as partes' })}
                className="text-gray-500"
              >
                Dividir
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
