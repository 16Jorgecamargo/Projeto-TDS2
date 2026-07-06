import { useState, type JSX } from 'react';
import { useUsers, useSetUserStatus } from '../queries';
import type { UserStatus } from '../schemas';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Ativo',
  suspended: 'Suspenso',
  deleted: 'Excluido',
};

const inputClass = 'rounded-sm border border-surface px-3 py-2 text-ink';

export function UsersTable(): JSX.Element {
  const [search, setSearch] = useState('');
  const users = useUsers({ search: search || undefined });
  const setStatus = useSetUserStatus();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [status, setStatusValue] = useState<UserStatus>('suspended');
  const [reason, setReason] = useState('');

  function openAction(id: string) {
    setStatusValue('suspended');
    setReason('');
    setTargetId(id);
  }

  function closeAction() {
    setTargetId(null);
  }

  function confirmAction() {
    if (!targetId || reason.trim().length < 3) return;
    setStatus.mutate({ id: targetId, status, reason });
    setTargetId(null);
  }

  return (
    <>
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nome ou email"
        className={`mb-3 w-full ${inputClass}`}
      />
      {users.isLoading || !users.data ? (
        <p className="text-sm text-muted">Carregando usuários...</p>
      ) : users.data.items.length === 0 ? (
        <p className="text-sm text-muted">Nenhum usuário encontrado.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-muted">
              <th className="py-2">Nome</th>
              <th className="py-2">Email</th>
              <th className="py-2">Papel</th>
              <th className="py-2">Status</th>
              <th className="py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {users.data.items.map((item) => (
              <tr key={item.id} className="border-t border-surface">
                <td className="py-2 text-ink">{item.full_name}</td>
                <td className="py-2 text-ink">{item.email}</td>
                <td className="py-2 text-ink">{item.role}</td>
                <td className="py-2">
                  <Badge tone={item.status === 'active' ? 'neutral' : 'primary'}>
                    {STATUS_LABELS[item.status]}
                  </Badge>
                </td>
                <td className="py-2">
                  <Button type="button" variant="primary" size="sm" onClick={() => openAction(item.id)}>
                    Mudar status
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {targetId && (
        <Modal open onClose={closeAction} title="Mudar status do usuário">
          <div className="flex flex-col gap-3">
            <label htmlFor="user-status" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Novo status</span>
              <select
                id="user-status"
                value={status}
                onChange={(event) => setStatusValue(event.target.value as UserStatus)}
                className={inputClass}
              >
                <option value="active">Ativo</option>
                <option value="suspended">Suspenso</option>
                <option value="deleted">Excluído</option>
              </select>
            </label>
            <label htmlFor="user-reason" className="flex flex-col gap-1">
              <span className="text-sm text-muted">Motivo</span>
              <textarea
                id="user-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className={inputClass}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeAction}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={setStatus.isPending || reason.trim().length < 3}
                onClick={confirmAction}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
