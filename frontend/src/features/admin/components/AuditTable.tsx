import { useState, type JSX } from 'react';
import { useAudit } from '../queries';

const inputClass = 'rounded-sm border border-surface px-3 py-2 text-ink';
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function AuditTable(): JSX.Element {
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const validatedUserId = userId && uuidRegex.test(userId) ? userId : undefined;
  const audit = useAudit({ userId: validatedUserId, action: action || undefined });

  return (
    <>
      <div className="mb-3 flex gap-3">
        <input
          type="text"
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          placeholder="Filtrar por ID de usuário"
          className={`w-full ${inputClass}`}
        />
        <input
          type="text"
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Filtrar por ação"
          className={`w-full ${inputClass}`}
        />
      </div>
      {audit.isLoading || !audit.data ? (
        <p className="text-sm text-muted">Carregando auditoria...</p>
      ) : audit.data.items.length === 0 ? (
        <p className="text-sm text-muted">Nenhum registro de auditoria encontrado.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-2">Data</th>
              <th className="py-2">Usuário</th>
              <th className="py-2">Ação</th>
              <th className="py-2">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {audit.data.items.map((item) => (
              <tr key={item.id} className="border-t border-surface">
                <td className="py-2 text-ink">{new Date(item.createdAt).toLocaleString('pt-BR')}</td>
                <td className="py-2 text-ink">{item.userId ?? '—'}</td>
                <td className="py-2 text-ink">{item.action}</td>
                <td className="py-2 text-ink">{item.entityType ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
