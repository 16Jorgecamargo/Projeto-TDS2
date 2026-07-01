import type { ConsentType } from '../api';
import { useConsents, useRecordConsent } from '../queries';

const CONSENT_VERSION = '2026-07-01';

const CONSENT_LABELS: Record<ConsentType, string> = {
  terms: 'Termos de uso',
  privacy: 'Politica de privacidade',
  marketing: 'Comunicacoes de marketing',
  data_processing: 'Tratamento de dados pessoais',
};

export function ConsentsPanel() {
  const { data } = useConsents();
  const record = useRecordConsent();

  const latestByType = new Map<ConsentType, boolean>();
  data?.forEach((consent) => latestByType.set(consent.type, consent.granted));

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Consentimentos (LGPD)</h2>
      {(Object.keys(CONSENT_LABELS) as ConsentType[]).map((type) => (
        <label key={type} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={latestByType.get(type) ?? false}
            onChange={(event) =>
              record.mutate({ type, granted: event.target.checked, version: CONSENT_VERSION })
            }
          />
          {CONSENT_LABELS[type]}
        </label>
      ))}
      <ul className="text-xs text-slate-500">
        {data?.map((consent) => (
          <li key={consent.id}>
            {CONSENT_LABELS[consent.type]} — {consent.granted ? 'concedido' : 'revogado'} em{' '}
            {new Date(consent.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </section>
  );
}
