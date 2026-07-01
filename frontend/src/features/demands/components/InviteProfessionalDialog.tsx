import { useState } from 'react';
import { useInviteProfessional } from '../queries';

interface InviteProfessionalDialogProps {
  demandId: string;
  onClose: () => void;
}

export function InviteProfessionalDialog({ demandId, onClose }: InviteProfessionalDialogProps) {
  const [professionalId, setProfessionalId] = useState('');
  const invite = useInviteProfessional(demandId);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <div className="flex w-96 flex-col gap-3 rounded-xl bg-white p-5">
        <h3 className="text-lg font-semibold">Convidar profissional</h3>
        <input
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="ID do profissional"
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-2 text-slate-500">
            Cancelar
          </button>
          <button
            type="button"
            disabled={invite.isPending || !professionalId}
            onClick={() => invite.mutate(professionalId, { onSuccess: onClose })}
            className="rounded-lg bg-slate-900 px-3 py-2 text-white disabled:opacity-50"
          >
            Convidar
          </button>
        </div>
      </div>
    </div>
  );
}
