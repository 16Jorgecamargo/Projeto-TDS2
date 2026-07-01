import { useState } from 'react';
import { useMyProfile, useAddServiceArea, useRemoveServiceArea, usePublicProfile } from '../queries';

export function ServiceAreaManager() {
  const { data: profile } = useMyProfile();
  const { data: publicProfile } = usePublicProfile(profile?.id);
  const addArea = useAddServiceArea();
  const removeArea = useRemoveServiceArea();
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Areas de atendimento</h2>
      <div className="flex gap-2">
        <input className="flex-1 rounded border px-3 py-2" placeholder="Cidade" value={city} onChange={(e) => setCity(e.target.value)} />
        <input
          className="w-16 rounded border px-3 py-2"
          placeholder="UF"
          maxLength={2}
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
        />
        <button
          type="button"
          disabled={!city || state.length !== 2 || addArea.isPending}
          onClick={() => addArea.mutate({ city, state, radiusKm: null })}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          Adicionar
        </button>
      </div>
      <ul className="flex flex-col gap-2">
        {publicProfile?.serviceAreas.map((area) => (
          <li key={area.id} className="flex items-center justify-between rounded border px-3 py-2">
            <span>
              {area.city} - {area.state}
            </span>
            <button type="button" onClick={() => removeArea.mutate(area.id)} className="text-sm text-red-600 underline">
              Remover
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
