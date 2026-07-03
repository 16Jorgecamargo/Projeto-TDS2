import type { JSX } from 'react';
import type { ConsentType } from '../api';
import { useConsents, useRecordConsent } from '../queries';
import { Card } from '../../../components/ui/Card';

const CONSENT_VERSION = '2026-07-01';

const CONSENT_LABELS: Record<ConsentType, string> = {
  terms: 'Termos de uso',
  privacy: 'Política de privacidade',
  marketing: 'Comunicações de marketing',
  data_processing: 'Tratamento de dados pessoais',
};

export function ConsentsPanel(): JSX.Element {
  const { data } = useConsents();
  const record = useRecordConsent();

  const latestByType = new Map<ConsentType, boolean>();
  data?.forEach((consent) => {
    if (!latestByType.has(consent.type)) {
      latestByType.set(consent.type, consent.granted);
    }
  });

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Consentimentos (LGPD)</h2>
      {(Object.keys(CONSENT_LABELS) as ConsentType[]).map((type) => (
        <label key={type} className="flex items-center gap-2 text-ink">
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
      <ul className="text-xs text-muted">
        {data?.map((consent) => (
          <li key={consent.id}>
            {CONSENT_LABELS[consent.type]} — {consent.granted ? 'concedido' : 'revogado'} em{' '}
            {new Date(consent.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default ConsentsPanel;
