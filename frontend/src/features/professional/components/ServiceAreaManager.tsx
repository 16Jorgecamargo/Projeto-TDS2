import { useState } from 'react';
import { useMyProfile, useAddServiceArea, useRemoveServiceArea, usePublicProfile } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

export function ServiceAreaManager() {
  const { data: profile } = useMyProfile();
  const { data: publicProfile } = usePublicProfile(profile?.id);
  const addArea = useAddServiceArea();
  const removeArea = useRemoveServiceArea();
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [radiusKm, setRadiusKm] = useState('');

  const areas = publicProfile?.serviceAreas ?? [];

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Áreas de atendimento</h2>
      <div className="mb-3 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-sm border border-surface px-3 py-2 text-ink"
          placeholder="Cidade"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
        <input
          className="w-16 rounded-sm border border-surface px-3 py-2 text-ink"
          placeholder="UF"
          maxLength={2}
          value={state}
          onChange={(e) => setState(e.target.value.toUpperCase())}
        />
        <input
          className="w-28 rounded-sm border border-surface px-3 py-2 text-ink"
          placeholder="Raio (km)"
          type="number"
          min={0}
          value={radiusKm}
          onChange={(e) => setRadiusKm(e.target.value)}
        />
        <Button
          type="button"
          disabled={!city || state.length !== 2 || addArea.isPending}
          onClick={() => {
            addArea.mutate({ city, state, radiusKm: radiusKm === '' ? null : Number(radiusKm) });
            setCity('');
            setState('');
            setRadiusKm('');
          }}
        >
          Adicionar
        </Button>
      </div>
      {areas.length === 0 ? (
        <EmptyState title="Nenhuma área de atendimento cadastrada" />
      ) : (
        <ul className="flex flex-col gap-2">
          {areas.map((area) => (
            <li key={area.id} className="flex items-center justify-between rounded-sm bg-surface px-3 py-2">
              <span className="text-sm text-ink">
                {area.city} - {area.state}
                {area.radiusKm !== null && ` · raio ${area.radiusKm} km`}
              </span>
              <button
                type="button"
                onClick={() => removeArea.mutate(area.id)}
                className="text-sm font-semibold text-accent underline"
              >
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
