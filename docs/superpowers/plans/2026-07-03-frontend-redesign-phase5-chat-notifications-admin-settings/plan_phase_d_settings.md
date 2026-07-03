## Fase D — Configurações (Tasks 8-11)

### Task 8: Restilizar `PreferencesForm`

**Files:**
- Modify: `frontend/src/features/settings/components/PreferencesForm.tsx`
- Test: `frontend/src/features/settings/components/PreferencesForm.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `usePreferences()`, `useUpdatePreferences()` de `frontend/src/features/settings/queries.ts` (já existentes, assinaturas inalteradas). `preferencesFormSchema` de `frontend/src/features/settings/schemas.ts` (já existente). `Button` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/settings/components/PreferencesForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreferencesForm } from './PreferencesForm';
import { usePreferences, useUpdatePreferences } from '../queries';

vi.mock('../queries', () => ({ usePreferences: vi.fn(), useUpdatePreferences: vi.fn() }));

describe('PreferencesForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('salva preferencias com o botao estilizado do design system', async () => {
    const mutate = vi.fn();
    vi.mocked(usePreferences).mockReturnValue({
      data: {
        language: 'pt-BR', timezone: 'America/Sao_Paulo',
        emailNotifications: true, pushNotifications: false, smsNotifications: false,
      },
    } as never);
    vi.mocked(useUpdatePreferences).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<PreferencesForm />);
    const button = screen.getByRole('button', { name: 'Salvar' });
    expect(button.className).toContain('bg-primary');

    await user.click(button);

    expect(mutate).toHaveBeenCalledWith({
      language: 'pt-BR', timezone: 'America/Sao_Paulo',
      emailNotifications: true, pushNotifications: false, smsNotifications: false,
    });
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/settings/components/PreferencesForm.test.tsx`
Esperado: FAIL — o botão hoje usa `bg-slate-900` cru, não o componente `Button` (`bg-primary`).

- [ ] **Step 3: Restilizar `PreferencesForm.tsx`**

Substitua o conteúdo de `frontend/src/features/settings/components/PreferencesForm.tsx`:
```tsx
import { useEffect, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { preferencesFormSchema, type PreferencesForm as FormValues } from '../schemas';
import { usePreferences, useUpdatePreferences } from '../queries';
import { Button } from '../../../components/ui/Button';

export function PreferencesForm(): JSX.Element {
  const { data } = usePreferences();
  const update = useUpdatePreferences();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    resolver: zodResolver(preferencesFormSchema),
  });

  useEffect(() => {
    if (data) {
      reset(data);
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => update.mutate(values));

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-ink">Preferências</h2>
      <label className="flex items-center justify-between gap-2 text-ink">
        Idioma
        <input type="text" {...register('language')} className="rounded-sm border border-surface px-2 py-1 text-ink" />
      </label>
      <label className="flex items-center justify-between gap-2 text-ink">
        Fuso horário
        <input type="text" {...register('timezone')} className="rounded-sm border border-surface px-2 py-1 text-ink" />
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" {...register('emailNotifications')} /> Notificações por e-mail
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" {...register('pushNotifications')} /> Notificações push
      </label>
      <label className="flex items-center gap-2 text-ink">
        <input type="checkbox" {...register('smsNotifications')} /> Notificações por SMS
      </label>
      <Button type="submit" disabled={update.isPending}>
        Salvar
      </Button>
    </form>
  );
}

export default PreferencesForm;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/settings/components/PreferencesForm.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/settings/components/PreferencesForm.tsx frontend/src/features/settings/components/PreferencesForm.test.tsx
git commit -m "style(settings): restiliza PreferencesForm com tokens da fase 1"
```

---

### Task 9: Restilizar `ConsentsPanel`

**Files:**
- Modify: `frontend/src/features/settings/components/ConsentsPanel.tsx`
- Test: `frontend/src/features/settings/components/ConsentsPanel.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useConsents()`, `useRecordConsent()` de `frontend/src/features/settings/queries.ts` (já existentes, assinaturas inalteradas). `ConsentType` de `frontend/src/features/settings/api.ts`. `Card` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/settings/components/ConsentsPanel.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentsPanel } from './ConsentsPanel';
import { useConsents, useRecordConsent } from '../queries';

vi.mock('../queries', () => ({ useConsents: vi.fn(), useRecordConsent: vi.fn() }));

describe('ConsentsPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lista consentimentos dentro de um card e registra novo consentimento', async () => {
    const mutate = vi.fn();
    vi.mocked(useConsents).mockReturnValue({
      data: [
        {
          id: 'c1', type: 'terms', granted: false, version: '2026-07-01',
          grantedAt: '2026-07-01T00:00:00Z', createdAt: '2026-07-01T00:00:00Z',
        },
      ],
    } as never);
    vi.mocked(useRecordConsent).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();

    render(<ConsentsPanel />);

    expect(screen.getByText('Consentimentos (LGPD)')).toBeInTheDocument();
    const checkbox = screen.getByRole('checkbox', { name: 'Termos de uso' });
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(mutate).toHaveBeenCalledWith({ type: 'terms', granted: true, version: '2026-07-01' });
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar a baseline**

Rode: `cd frontend && npx vitest run src/features/settings/components/ConsentsPanel.test.tsx`
Esperado: PASS (1/1) já com a implementação atual — o comportamento de marcar consentimento não muda nesta task, só o wrapper visual (`Card`). Confirme que passa antes de mexer no arquivo.

- [ ] **Step 3: Restilizar `ConsentsPanel.tsx`**

Substitua o conteúdo de `frontend/src/features/settings/components/ConsentsPanel.tsx`:
```tsx
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
```

- [ ] **Step 4: Rodar teste para confirmar que continua passando**

Rode: `cd frontend && npx vitest run src/features/settings/components/ConsentsPanel.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/settings/components/ConsentsPanel.tsx frontend/src/features/settings/components/ConsentsPanel.test.tsx
git commit -m "style(settings): restiliza ConsentsPanel com card da fase 1"
```

---

### Task 10: Restilizar `DeleteAccountPanel` com `Modal` de confirmação

**Files:**
- Modify: `frontend/src/features/settings/components/DeleteAccountPanel.tsx`
- Test: `frontend/src/features/settings/components/DeleteAccountPanel.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `useDeletionStatus()`, `useRequestDeletion()`, `useCancelDeletion()` de `frontend/src/features/settings/queries.ts` (já existentes, assinaturas inalteradas). `Card`, `Button`, `Modal` de `frontend/src/components/ui/`.
- Produces: nenhuma interface nova — só estilo e um `Modal` de confirmação local.

- [ ] **Step 1: Escrever os testes falhos**

Crie `frontend/src/features/settings/components/DeleteAccountPanel.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteAccountPanel } from './DeleteAccountPanel';
import { useDeletionStatus, useRequestDeletion, useCancelDeletion } from '../queries';

vi.mock('../queries', () => ({
  useDeletionStatus: vi.fn(),
  useRequestDeletion: vi.fn(),
  useCancelDeletion: vi.fn(),
}));

describe('DeleteAccountPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('abre modal de confirmacao antes de solicitar exclusao e cancela sem disparar', async () => {
    const request = vi.fn();
    vi.mocked(useDeletionStatus).mockReturnValue({ data: undefined } as never);
    vi.mocked(useRequestDeletion).mockReturnValue({ mutate: request, isPending: false } as never);
    vi.mocked(useCancelDeletion).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<DeleteAccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Solicitar exclusão' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(request).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('confirma exclusao no modal e dispara a mutation', async () => {
    const request = vi.fn();
    vi.mocked(useDeletionStatus).mockReturnValue({ data: undefined } as never);
    vi.mocked(useRequestDeletion).mockReturnValue({ mutate: request, isPending: false } as never);
    vi.mocked(useCancelDeletion).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    const user = userEvent.setup();

    render(<DeleteAccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Solicitar exclusão' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }));

    expect(request).toHaveBeenCalled();
  });

  it('cancela exclusao ja agendada sem modal de confirmacao', async () => {
    const cancel = vi.fn();
    vi.mocked(useDeletionStatus).mockReturnValue({
      data: { id: 'del1', status: 'pending', requestedAt: '2026-07-01T00:00:00Z', scheduledFor: '2026-07-15T00:00:00Z' },
    } as never);
    vi.mocked(useRequestDeletion).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useCancelDeletion).mockReturnValue({ mutate: cancel, isPending: false } as never);
    const user = userEvent.setup();

    render(<DeleteAccountPanel />);
    await user.click(screen.getByRole('button', { name: 'Cancelar exclusão' }));

    expect(cancel).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/settings/components/DeleteAccountPanel.test.tsx`
Esperado: FAIL — a implementação atual chama `request.mutate()` direto no clique do botão "Solicitar exclusão", sem `Modal` de confirmação.

- [ ] **Step 3: Restilizar `DeleteAccountPanel.tsx`**

Substitua o conteúdo de `frontend/src/features/settings/components/DeleteAccountPanel.tsx`:
```tsx
import { useState, type JSX } from 'react';
import { useCancelDeletion, useDeletionStatus, useRequestDeletion } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';

export function DeleteAccountPanel(): JSX.Element {
  const { data } = useDeletionStatus();
  const request = useRequestDeletion();
  const cancel = useCancelDeletion();
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-accent">Excluir conta</h2>
      {data ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-ink">
            Exclusão agendada para {new Date(data.scheduledFor).toLocaleDateString()}. Você pode cancelar
            durante a carência.
          </p>
          <Button
            type="button"
            variant="ghost"
            onClick={() => cancel.mutate()}
            disabled={cancel.isPending}
          >
            Cancelar exclusão
          </Button>
        </div>
      ) : (
        <Button type="button" variant="accent" onClick={() => setConfirming(true)}>
          Solicitar exclusão
        </Button>
      )}
      {confirming && (
        <Modal open onClose={() => setConfirming(false)} title="Confirmar exclusão de conta">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink">
              A conta será excluída após o período de carência. Você poderá cancelar antes desse prazo, mas
              essa é uma ação séria e irreversível após a carência terminar.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={request.isPending}
                onClick={() => {
                  request.mutate();
                  setConfirming(false);
                }}
              >
                Confirmar exclusão
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Card>
  );
}

export default DeleteAccountPanel;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/settings/components/DeleteAccountPanel.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/settings/components/DeleteAccountPanel.tsx frontend/src/features/settings/components/DeleteAccountPanel.test.tsx
git commit -m "style(settings): adiciona modal de confirmacao a exclusao de conta"
```

---

### Task 11: Restilizar `SettingsPage`

**Files:**
- Modify: `frontend/src/features/settings/pages/SettingsPage.tsx`
- Test: `frontend/src/features/settings/pages/SettingsPage.test.tsx` (novo arquivo)

**Interfaces:**
- Consumes: `PreferencesForm` (Task 8), `ConsentsPanel` (Task 9), `DeleteAccountPanel` (Task 10) — nenhuma prop, mesmo uso de hoje. `Card` de `components/ui/`.
- Produces: nenhuma interface nova — só estilo.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/settings/pages/SettingsPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from './SettingsPage';

vi.mock('../components/PreferencesForm', () => ({ PreferencesForm: () => <div>preferences-form</div> }));
vi.mock('../components/ConsentsPanel', () => ({ ConsentsPanel: () => <div>consents-panel</div> }));
vi.mock('../components/DeleteAccountPanel', () => ({ DeleteAccountPanel: () => <div>delete-account-panel</div> }));

describe('SettingsPage', () => {
  it('mostra titulo e as tres secoes dentro de cards separados', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByText('preferences-form')).toBeInTheDocument();
    expect(screen.getByText('consents-panel')).toBeInTheDocument();
    expect(screen.getByText('delete-account-panel')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/settings/pages/SettingsPage.test.tsx`
Esperado: FAIL — o título hoje é `"Configuracoes"` sem acento; o teste espera `"Configurações"` (a task corrige a grafia junto com o restyle, já que copy de UI deve estar em português correto).

- [ ] **Step 3: Restilizar `SettingsPage.tsx`**

Substitua o conteúdo de `frontend/src/features/settings/pages/SettingsPage.tsx`:
```tsx
import type { JSX } from 'react';
import { ConsentsPanel } from '../components/ConsentsPanel';
import { DeleteAccountPanel } from '../components/DeleteAccountPanel';
import { PreferencesForm } from '../components/PreferencesForm';

export default function SettingsPage(): JSX.Element {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold text-ink">Configurações</h1>
      <PreferencesForm />
      <ConsentsPanel />
      <DeleteAccountPanel />
    </div>
  );
}
```

Nota: `PreferencesForm` (Task 8) não usa `Card` internamente (é um `<form>` de secão simples, mesmo padrão de `ReviewForm`/`DisputeDialog` que também não se auto-envolvem em `Card`) — só `ConsentsPanel` e `DeleteAccountPanel` retornam `Card` diretamente (Tasks 9 e 10). Isso é intencional: o formulário de preferências fica visualmente mais leve que os painéis de consentimento/exclusão, que têm mais texto e ações de maior peso.

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/settings/pages/SettingsPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Rodar a suíte completa do frontend, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/settings/pages/SettingsPage.tsx frontend/src/features/settings/pages/SettingsPage.test.tsx
git commit -m "style(settings): restiliza SettingsPage e corrige acentuacao do titulo"
```

---
