import { useReports, useResolveReport } from '../queries';

export function ReportsTable() {
  const reports = useReports();
  const resolve = useResolveReport();

  if (reports.isLoading || !reports.data) {
    return <p className="text-sm text-gray-500">Carregando denúncias...</p>;
  }

  if (reports.data.items.length === 0) {
    return <p className="text-sm text-gray-400">Nenhuma denúncia pendente.</p>;
  }

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-gray-500">
          <th className="py-2">Denúncia</th>
          <th className="py-2">Status</th>
          <th className="py-2">Ação</th>
        </tr>
      </thead>
      <tbody>
        {reports.data.items.map((report) => (
          <tr key={report.id} className="border-t border-gray-100">
            <td className="py-2">{report.id}</td>
            <td className="py-2">{report.status}</td>
            <td className="py-2 space-x-3">
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ id: report.id, resolution: 'actioned' })}
                className="text-indigo-600"
              >
                Aplicar ação
              </button>
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={() => resolve.mutate({ id: report.id, resolution: 'dismissed' })}
                className="text-gray-500"
              >
                Descartar
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
