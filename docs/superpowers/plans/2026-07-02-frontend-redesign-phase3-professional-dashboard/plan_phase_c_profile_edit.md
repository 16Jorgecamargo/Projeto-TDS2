# Fase C — Restilização dos Formulários de Gestão + Página de Edição de Perfil

Ver `plan_index.md` para Global Constraints. Depende da Task 1 (Fase A) para os hooks `useAddPortfolioImage`/`useRemovePortfolioImage` usados na Task 12.

Todas as tasks desta fase modificam arquivos existentes em `frontend/src/features/professional/components/` — sem mudar props, campos de formulário, validação Zod ou chamadas de API, só a camada visual (classes Tailwind cruas → tokens da Fase 1) e, na Task 12, a adição do upload de foto.

### Task 9: Restilizar `ProfileForm`

**Files:**
- Modify: `frontend/src/features/professional/components/ProfileForm.tsx`
- Test: `frontend/src/features/professional/professional.test.tsx` (teste existente já cobre a lógica — só adicionar 1 caso novo de acessibilidade)

**Interfaces:**
- Consumes: `useMyProfile()`, `useUpsertProfile()` (já existentes, sem mudança). `Card`/`Button` de `components/ui/`.
- Produces: nenhuma mudança de interface pública — mesmo componente `ProfileForm`, sem props.

- [ ] **Step 1: Escrever o teste falho de acessibilidade**

Em `frontend/src/features/professional/professional.test.tsx`, adicione ao `describe('ProfileForm', ...)` existente (não remova o teste que já está lá):

```tsx
it('cada campo tem label associado via htmlFor/id', async () => {
  vi.mocked(professionalApi.getMyProfile).mockResolvedValue({
    id: 'p1', userId: 'u1', headline: 'Antigo', bio: null, yearsExperience: 5,
    hourlyRate: 100, serviceRadiusKm: 20, ratingAverage: 0, ratingCount: 0,
    isAvailable: true, verifiedAt: null, createdAt: '2026-07-01T00:00:00Z',
  });

  renderForm();
  await screen.findByDisplayValue('Antigo');

  expect(screen.getByLabelText('Título')).toHaveAttribute('id', 'profile-headline');
  expect(screen.getByLabelText('Biografia')).toHaveAttribute('id', 'profile-bio');
  expect(screen.getByLabelText('Anos de experiência')).toHaveAttribute('id', 'profile-years-experience');
  expect(screen.getByLabelText('Valor por hora (R$)')).toHaveAttribute('id', 'profile-hourly-rate');
  expect(screen.getByLabelText('Raio de atendimento (km)')).toHaveAttribute('id', 'profile-service-radius');
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional/professional.test.tsx`
Esperado: FAIL — o teste novo não encontra `id="profile-headline"` (label hoje é só `<span>` envolvente, sem `htmlFor`/`id` explícitos).

- [ ] **Step 3: Restilizar `ProfileForm.tsx`**

Substitua o conteúdo de `frontend/src/features/professional/components/ProfileForm.tsx` por:

```tsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileFormSchema, type ProfileForm as FormValues } from '../schemas';
import { useMyProfile, useUpsertProfile } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

const setValueAsNumber = (value: string) => (value === '' ? null : Number(value));

export function ProfileForm() {
  const { data } = useMyProfile();
  const upsert = useUpsertProfile();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(profileFormSchema) });

  useEffect(() => {
    if (data) {
      reset({
        headline: data.headline,
        bio: data.bio,
        yearsExperience: data.yearsExperience,
        hourlyRate: data.hourlyRate,
        serviceRadiusKm: data.serviceRadiusKm,
      });
    }
  }, [data, reset]);

  const onSubmit = handleSubmit((values) => upsert.mutate(values));

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-ink">Perfil profissional</h2>
        <label htmlFor="profile-headline" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Título</span>
          <input
            id="profile-headline"
            {...register('headline')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
          {errors.headline && <span className="text-xs text-accent">{errors.headline.message}</span>}
        </label>
        <label htmlFor="profile-bio" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Biografia</span>
          <textarea
            id="profile-bio"
            {...register('bio')}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        <label htmlFor="profile-years-experience" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Anos de experiência</span>
          <input
            id="profile-years-experience"
            type="number"
            {...register('yearsExperience', { setValueAs: setValueAsNumber })}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        <label htmlFor="profile-hourly-rate" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Valor por hora (R$)</span>
          <input
            id="profile-hourly-rate"
            type="number"
            {...register('hourlyRate', { setValueAs: setValueAsNumber })}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        <label htmlFor="profile-service-radius" className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Raio de atendimento (km)</span>
          <input
            id="profile-service-radius"
            type="number"
            {...register('serviceRadiusKm', { setValueAs: setValueAsNumber })}
            className="rounded-sm border border-surface px-3 py-2 text-ink"
          />
        </label>
        {upsert.isError && <p className="text-sm text-accent">Não foi possível salvar o perfil</p>}
        <Button type="submit" disabled={upsert.isPending}>
          {upsert.isPending ? 'Salvando...' : 'Salvar perfil'}
        </Button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional/professional.test.tsx`
Esperado: PASS, incluindo o teste original de submissão (`fireEvent.change`/`fireEvent.click` continuam funcionando pois os campos mantêm os mesmos `name`/`register` — só ganharam `id` explícito) e o novo teste de acessibilidade.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional/components/ProfileForm.tsx frontend/src/features/professional/professional.test.tsx
git commit -m "style(professional): restiliza ProfileForm com tokens da fase 1"
```

---

### Task 10: Restilizar `ServiceAreaManager`

**Files:**
- Modify: `frontend/src/features/professional/components/ServiceAreaManager.tsx`
- Test: `frontend/src/features/professional/components/ServiceAreaManager.test.tsx` (novo)

**Interfaces:**
- Consumes: `useMyProfile()`, `usePublicProfile(id)`, `useAddServiceArea()`, `useRemoveServiceArea()` (já existentes, sem mudança). `Card`/`Button`/`EmptyState` de `components/ui/`.
- Produces: nenhuma mudança de interface pública.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional/components/ServiceAreaManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ServiceAreaManager } from './ServiceAreaManager';
import { useMyProfile, usePublicProfile, useAddServiceArea, useRemoveServiceArea } from '../queries';

vi.mock('../queries', () => ({
  useMyProfile: vi.fn(),
  usePublicProfile: vi.fn(),
  useAddServiceArea: vi.fn(),
  useRemoveServiceArea: vi.fn(),
}));

describe('ServiceAreaManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);
    vi.mocked(useAddServiceArea).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemoveServiceArea).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('mostra estado vazio quando nao ha areas cadastradas', () => {
    vi.mocked(usePublicProfile).mockReturnValue({ data: { serviceAreas: [] } } as never);

    renderWithProviders(<ServiceAreaManager />);

    expect(screen.getByText('Nenhuma área de atendimento cadastrada')).toBeInTheDocument();
  });

  it('lista areas cadastradas', () => {
    vi.mocked(usePublicProfile).mockReturnValue({
      data: { serviceAreas: [{ id: 'area1', city: 'Curitiba', state: 'PR', radiusKm: null }] },
    } as never);

    renderWithProviders(<ServiceAreaManager />);

    expect(screen.getByText('Curitiba - PR')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional/components/ServiceAreaManager.test.tsx`
Esperado: FAIL — texto "Nenhuma área de atendimento cadastrada" não existe ainda (componente atual não tem estado vazio).

- [ ] **Step 3: Restilizar `ServiceAreaManager.tsx`**

Substitua o conteúdo de `frontend/src/features/professional/components/ServiceAreaManager.tsx` por:

```tsx
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

  const areas = publicProfile?.serviceAreas ?? [];

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Áreas de atendimento</h2>
      <div className="mb-3 flex gap-2">
        <input
          className="flex-1 rounded-sm border border-surface px-3 py-2 text-ink"
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
        <Button
          type="button"
          disabled={!city || state.length !== 2 || addArea.isPending}
          onClick={() => {
            addArea.mutate({ city, state, radiusKm: null });
            setCity('');
            setState('');
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
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional/components/ServiceAreaManager.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional/components/ServiceAreaManager.tsx frontend/src/features/professional/components/ServiceAreaManager.test.tsx
git commit -m "style(professional): restiliza ServiceAreaManager com tokens da fase 1"
```

---

### Task 11: Restilizar `AvailabilityManager`

**Files:**
- Modify: `frontend/src/features/professional/components/AvailabilityManager.tsx`
- Test: `frontend/src/features/professional/components/AvailabilityManager.test.tsx` (novo)

**Interfaces:**
- Consumes: `useSlots(professionalId)`, `useAddSlot(professionalId)`, `useRemoveSlot(professionalId)` (já existentes, sem mudança). `Card`/`Button`/`EmptyState` de `components/ui/`.
- Produces: nenhuma mudança de interface pública (prop `professionalId: string | undefined` continua igual).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional/components/AvailabilityManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { AvailabilityManager } from './AvailabilityManager';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';

vi.mock('../queries', () => ({ useSlots: vi.fn(), useAddSlot: vi.fn(), useRemoveSlot: vi.fn() }));

describe('AvailabilityManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAddSlot).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemoveSlot).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('mostra estado vazio quando nao ha slots cadastrados', () => {
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);

    expect(screen.getByText('Nenhum horário cadastrado')).toBeInTheDocument();
  });

  it('lista slots cadastrados', () => {
    vi.mocked(useSlots).mockReturnValue({
      data: [{ id: 'slot1', weekday: 1, startTime: '08:00', endTime: '18:00' }],
      isPending: false,
    } as never);

    renderWithProviders(<AvailabilityManager professionalId="prof1" />);

    expect(screen.getByText('Segunda 08:00-18:00')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional/components/AvailabilityManager.test.tsx`
Esperado: FAIL — texto "Nenhum horário cadastrado" não existe ainda (componente atual não tem estado vazio).

- [ ] **Step 3: Restilizar `AvailabilityManager.tsx`**

Substitua o conteúdo de `frontend/src/features/professional/components/AvailabilityManager.tsx` por:

```tsx
import { useState } from 'react';
import { useSlots, useAddSlot, useRemoveSlot } from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function AvailabilityManager({ professionalId }: { professionalId: string | undefined }) {
  const { data, isPending } = useSlots(professionalId);
  const addSlot = useAddSlot(professionalId);
  const removeSlot = useRemoveSlot(professionalId);
  const [weekday, setWeekday] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Disponibilidade</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          className="rounded-sm border border-surface px-2 py-1 text-ink"
        >
          {WEEKDAYS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-sm border border-surface px-2 py-1 text-ink"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-sm border border-surface px-2 py-1 text-ink"
        />
        <Button type="button" disabled={addSlot.isPending} onClick={() => addSlot.mutate({ weekday, startTime, endTime })}>
          Adicionar
        </Button>
      </div>
      {isPending ? null : !data || data.length === 0 ? (
        <EmptyState title="Nenhum horário cadastrado" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between rounded-sm bg-surface px-3 py-2">
              <span className="text-sm text-ink">
                {WEEKDAYS[slot.weekday]} {slot.startTime}-{slot.endTime}
              </span>
              <button
                type="button"
                onClick={() => removeSlot.mutate(slot.id)}
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
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional/components/AvailabilityManager.test.tsx`
Esperado: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional/components/AvailabilityManager.tsx frontend/src/features/professional/components/AvailabilityManager.test.tsx
git commit -m "style(professional): restiliza AvailabilityManager com tokens da fase 1"
```

---

### Task 12: Restilizar `PortfolioManager` + upload de fotos

**Files:**
- Modify: `frontend/src/features/professional/components/PortfolioManager.tsx`
- Test: `frontend/src/features/professional/components/PortfolioManager.test.tsx` (novo)

**Interfaces:**
- Consumes: `usePortfolio(professionalId)`, `useCreatePortfolioItem(professionalId)`, `useRemovePortfolioItem(professionalId)` (já existentes). `useAddPortfolioImage(professionalId, itemId)`, `useRemovePortfolioImage(professionalId)` (criados na Task 1). `ImageUpload` de `frontend/src/components/ui/ImageUpload.tsx` (`ImageUploadProps = { onUploaded: (result: UploadResult) => void; label?: string; className?: string }`, `UploadResult = { url: string; filename: string; size: number }` de `frontend/src/features/uploads/api.ts`). `Card`/`Button`/`EmptyState` de `components/ui/`.
- Produces: nenhuma mudança de interface pública (prop `professionalId: string | undefined` continua igual).

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional/components/PortfolioManager.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PortfolioManager } from './PortfolioManager';
import {
  usePortfolio,
  useCreatePortfolioItem,
  useRemovePortfolioItem,
  useAddPortfolioImage,
  useRemovePortfolioImage,
} from '../queries';
import { uploadImage } from '../../uploads/api';

vi.mock('../queries', () => ({
  usePortfolio: vi.fn(),
  useCreatePortfolioItem: vi.fn(),
  useRemovePortfolioItem: vi.fn(),
  useAddPortfolioImage: vi.fn(),
  useRemovePortfolioImage: vi.fn(),
}));
vi.mock('../../uploads/api', () => ({ uploadImage: vi.fn() }));

describe('PortfolioManager', () => {
  const addImageMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreatePortfolioItem).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useRemovePortfolioItem).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.mocked(useAddPortfolioImage).mockReturnValue({ mutate: addImageMutate, isPending: false } as never);
    vi.mocked(useRemovePortfolioImage).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:http://localhost/1', revokeObjectURL: vi.fn() });
  });

  it('mostra estado vazio quando nao ha itens', () => {
    vi.mocked(usePortfolio).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<PortfolioManager professionalId="prof1" />);

    expect(screen.getByText('Nenhum item no portfólio ainda')).toBeInTheDocument();
  });

  it('lista itens existentes com suas miniaturas', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      data: [
        {
          id: 'item1',
          categoryId: null,
          title: 'Reforma de banheiro',
          description: null,
          completedAt: null,
          images: [{ id: 'img1', imageUrl: '/uploads/img1.jpg', position: 0 }],
        },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<PortfolioManager professionalId="prof1" />);

    expect(screen.getByText('Reforma de banheiro')).toBeInTheDocument();
    expect(screen.getByAltText('Reforma de banheiro')).toHaveAttribute('src', '/uploads/img1.jpg');
  });

  it('envia foto de um item existente e chama useAddPortfolioImage com o item certo', async () => {
    vi.mocked(usePortfolio).mockReturnValue({
      data: [
        { id: 'item1', categoryId: null, title: 'Reforma de banheiro', description: null, completedAt: null, images: [] },
      ],
      isPending: false,
    } as never);
    vi.mocked(uploadImage).mockResolvedValue({ url: '/uploads/nova.jpg', filename: 'nova.jpg', size: 1024 });

    const user = userEvent.setup();
    renderWithProviders(<PortfolioManager professionalId="prof1" />);

    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText('Adicionar foto a Reforma de banheiro');
    await user.upload(input, file);

    expect(useAddPortfolioImage).toHaveBeenCalledWith('prof1', 'item1');
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional/components/PortfolioManager.test.tsx`
Esperado: FAIL — `useAddPortfolioImage`/`useRemovePortfolioImage` não são chamados pelo componente atual, e não existe label "Adicionar foto a Reforma de banheiro".

- [ ] **Step 3: Restilizar `PortfolioManager.tsx` com upload de foto**

Substitua o conteúdo de `frontend/src/features/professional/components/PortfolioManager.tsx` por:

```tsx
import { useState } from 'react';
import {
  usePortfolio,
  useCreatePortfolioItem,
  useRemovePortfolioItem,
  useAddPortfolioImage,
  useRemovePortfolioImage,
} from '../queries';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ImageUpload } from '../../../components/ui/ImageUpload';
import type { PortfolioItem } from '../api';

function PortfolioItemRow({
  item,
  professionalId,
  onRemoveItem,
}: {
  item: PortfolioItem;
  professionalId: string | undefined;
  onRemoveItem: (id: string) => void;
}) {
  const addImage = useAddPortfolioImage(professionalId, item.id);
  const removeImage = useRemovePortfolioImage(professionalId);

  return (
    <li className="flex flex-col gap-2 rounded-sm bg-surface px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ink">{item.title}</span>
        <button type="button" onClick={() => onRemoveItem(item.id)} className="text-sm font-semibold text-accent underline">
          Remover
        </button>
      </div>
      {item.images.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {item.images.map((image) => (
            <li key={image.id} className="relative">
              <img src={image.imageUrl} alt={item.title} className="h-16 w-16 rounded-md object-cover" />
              <button
                type="button"
                onClick={() => removeImage.mutate(image.id)}
                aria-label={`Remover foto de ${item.title}`}
                className="absolute -right-1 -top-1 rounded-full bg-accent px-1 text-xs text-bg"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <ImageUpload
        label={`Adicionar foto a ${item.title}`}
        onUploaded={(result) => addImage.mutate({ imageUrl: result.url, position: item.images.length })}
      />
    </li>
  );
}

export function PortfolioManager({ professionalId }: { professionalId: string | undefined }) {
  const { data, isPending } = usePortfolio(professionalId);
  const create = useCreatePortfolioItem(professionalId);
  const remove = useRemovePortfolioItem(professionalId);
  const [title, setTitle] = useState('');

  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold text-ink">Portfólio</h2>
      <div className="mb-3 flex gap-2">
        <input
          className="flex-1 rounded-sm border border-surface px-3 py-2 text-ink"
          placeholder="Título do trabalho"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Button
          type="button"
          disabled={!title || create.isPending}
          onClick={() => {
            create.mutate({ categoryId: null, title, description: null, completedAt: null });
            setTitle('');
          }}
        >
          Adicionar
        </Button>
      </div>
      {isPending ? null : !data || data.length === 0 ? (
        <EmptyState title="Nenhum item no portfólio ainda" />
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((item) => (
            <PortfolioItemRow
              key={item.id}
              item={item}
              professionalId={professionalId}
              onRemoveItem={(id) => remove.mutate(id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional/components/PortfolioManager.test.tsx`
Esperado: PASS (3/3).

- [ ] **Step 5: Rodar a suíte completa e o typecheck do frontend**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa, sem erros (confirma que a mudança de `PortfolioManager` não quebrou nada em `PortfolioGallery` ou outros consumidores de `PortfolioItem`).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/professional/components/PortfolioManager.tsx frontend/src/features/professional/components/PortfolioManager.test.tsx
git commit -m "feat(professional): restiliza PortfolioManager e adiciona upload de fotos por item"
```

---

### Task 13: Composição `ProfessionalProfileEditPage` + rota `/professional/profile`

**Files:**
- Create: `frontend/src/features/professional/pages/ProfessionalProfileEditPage.tsx`
- Modify: `frontend/src/router/index.tsx`
- Test: `frontend/src/features/professional/pages/ProfessionalProfileEditPage.test.tsx`

**Interfaces:**
- Consumes: `ProfileForm` (Task 9), `ServiceAreaManager` (Task 10), `AvailabilityManager` (Task 11), `PortfolioManager` (Task 12) — todos de `../components/`. `PortfolioGallery` (`{ professionalId: string }`) e `AvailabilityGrid` (`{ professionalId: string }`), ambos já existentes em `../components/`, sem modificação. `useMyProfile()` de `../queries`.
- Produces: `ProfessionalProfileEditPage` (export nomeado e `default`), montada em `/professional/profile`.

- [ ] **Step 1: Escrever o teste falho**

Crie `frontend/src/features/professional/pages/ProfessionalProfileEditPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalProfileEditPage } from './ProfessionalProfileEditPage';
import { useMyProfile } from '../queries';

vi.mock('../queries', () => ({ useMyProfile: vi.fn() }));
vi.mock('../components/ProfileForm', () => ({ ProfileForm: () => <div>profile-form</div> }));
vi.mock('../components/ServiceAreaManager', () => ({ ServiceAreaManager: () => <div>service-area-manager</div> }));
vi.mock('../components/AvailabilityManager', () => ({
  AvailabilityManager: () => <div>availability-manager</div>,
}));
vi.mock('../components/PortfolioManager', () => ({ PortfolioManager: () => <div>portfolio-manager</div> }));
vi.mock('../components/PortfolioGallery', () => ({ PortfolioGallery: () => <div>portfolio-gallery</div> }));
vi.mock('../components/AvailabilityGrid', () => ({ AvailabilityGrid: () => <div>availability-grid</div> }));

describe('ProfessionalProfileEditPage', () => {
  it('renderiza o titulo e todas as secoes de gestao com preview read-only', () => {
    vi.mocked(useMyProfile).mockReturnValue({ data: { id: 'prof1' } } as never);

    renderWithProviders(<ProfessionalProfileEditPage />);

    expect(screen.getByRole('heading', { name: 'Editar perfil', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('profile-form')).toBeInTheDocument();
    expect(screen.getByText('portfolio-gallery')).toBeInTheDocument();
    expect(screen.getByText('portfolio-manager')).toBeInTheDocument();
    expect(screen.getByText('availability-grid')).toBeInTheDocument();
    expect(screen.getByText('availability-manager')).toBeInTheDocument();
    expect(screen.getByText('service-area-manager')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/features/professional/pages/ProfessionalProfileEditPage.test.tsx`
Esperado: FAIL com "Cannot find module './ProfessionalProfileEditPage'".

- [ ] **Step 3: Implementar a página**

Crie `frontend/src/features/professional/pages/ProfessionalProfileEditPage.tsx`:

```tsx
import type { JSX } from 'react';
import { useMyProfile } from '../queries';
import { ProfileForm } from '../components/ProfileForm';
import { PortfolioGallery } from '../components/PortfolioGallery';
import { PortfolioManager } from '../components/PortfolioManager';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { AvailabilityManager } from '../components/AvailabilityManager';
import { ServiceAreaManager } from '../components/ServiceAreaManager';

export function ProfessionalProfileEditPage(): JSX.Element {
  const { data: profile } = useMyProfile();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <h1 className="text-3xl font-bold text-ink">Editar perfil</h1>
      <ProfileForm />
      {profile && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Como aparece no seu perfil público</h2>
          <PortfolioGallery professionalId={profile.id} />
        </div>
      )}
      <PortfolioManager professionalId={profile?.id} />
      {profile && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-ink">Disponibilidade atual</h2>
          <AvailabilityGrid professionalId={profile.id} />
        </div>
      )}
      <AvailabilityManager professionalId={profile?.id} />
      <ServiceAreaManager />
    </div>
  );
}

export default ProfessionalProfileEditPage;
```

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/features/professional/pages/ProfessionalProfileEditPage.test.tsx`
Esperado: PASS (1/1).

- [ ] **Step 5: Adicionar a rota no router**

Em `frontend/src/router/index.tsx`, adicione o import:

```ts
import ProfessionalProfileEditPage from '../features/professional/pages/ProfessionalProfileEditPage';
```

E adicione a rota dentro do grupo `<ProtectedRoute />` (mesmo grupo de `/professional/dashboard`), logo abaixo dela:

```ts
{ path: '/professional/dashboard', element: <ProfessionalDashboardPage /> },
{ path: '/professional/profile', element: <ProfessionalProfileEditPage /> },
```

- [ ] **Step 6: Rodar a suíte completa, typecheck e lint**

Rode: `cd frontend && npx vitest run && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: tudo passa, sem erros.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/professional/pages/ProfessionalProfileEditPage.tsx frontend/src/features/professional/pages/ProfessionalProfileEditPage.test.tsx frontend/src/router/index.tsx
git commit -m "feat(professional): adiciona pagina de edicao de perfil com preview read-only"
```

---

### Task 14: Corrigir `navConfig` — item do profissional aponta para `/professional/profile`

**Files:**
- Modify: `frontend/src/lib/navConfig.ts`
- Modify: `frontend/src/lib/navConfig.test.ts`

**Interfaces:**
- Consumes: nada novo.
- Produces: `professionalNav` (array interno de `navConfig.ts`) passa de 6 para 5 itens (remove a duplicação "Portfólio/Perfil" + "Disponibilidade", ambos hoje apontando para `/professional/dashboard`, por um único item "Perfil" apontando para `/professional/profile`).

- [ ] **Step 1: Escrever o teste falho**

Em `frontend/src/lib/navConfig.test.ts`, troque o teste `it('retorna 6 itens para o profissional', ...)` por:

```ts
it('retorna 5 itens para o profissional', () => {
  expect(getNavItems('professional')).toHaveLength(5);
});
```

E adicione um teste novo, logo abaixo do teste `it('resolve o item de dashboard por papel', ...)`:

```ts
it('item de perfil do profissional aponta para /professional/profile', () => {
  const items = getNavItems('professional');
  const perfilItem = items.find((item) => item.label === 'Perfil');
  expect(perfilItem?.to).toBe('/professional/profile');
});
```

- [ ] **Step 2: Rodar teste para confirmar que falha**

Rode: `cd frontend && npx vitest run src/lib/navConfig.test.ts`
Esperado: FAIL — `getNavItems('professional')` ainda retorna 6 itens, e não existe item com `label === 'Perfil'`.

- [ ] **Step 3: Corrigir `professionalNav` em `navConfig.ts`**

Em `frontend/src/lib/navConfig.ts`, troque:

```ts
const professionalNav: NavItem[] = [
  { label: 'Demandas disponíveis', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Meus contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Portfólio/Perfil', to: '/professional/dashboard', icon: BriefcaseIcon },
  { label: 'Disponibilidade', to: '/professional/dashboard', icon: CalendarDaysIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
];
```

por:

```ts
const professionalNav: NavItem[] = [
  { label: 'Demandas disponíveis', to: '/demands', icon: ClipboardDocumentListIcon },
  { label: 'Meus contratos', to: '/contracts', icon: DocumentTextIcon },
  { label: 'Chat', to: '/chat', icon: ChatBubbleLeftRightIcon },
  { label: 'Perfil', to: '/professional/profile', icon: BriefcaseIcon },
  { label: 'Carteira', to: '/wallet', icon: BanknotesIcon },
];
```

`CalendarDaysIcon` fica sem uso após essa mudança — remova esse import do topo do arquivo (`frontend/src/lib/navConfig.ts`), mantendo os demais ícones importados.

- [ ] **Step 4: Rodar teste para confirmar que passa**

Rode: `cd frontend && npx vitest run src/lib/navConfig.test.ts`
Esperado: PASS (todos os testes do arquivo, incluindo os 2 alterados/novos).

- [ ] **Step 5: Rodar a suíte completa do frontend**

Rode: `cd frontend && npx vitest run`
Esperado: PASS geral — confirme que `Sidebar.test.tsx` e `MobileNav.test.tsx` continuam passando (eles consomem `getNavItems`/`getMobilePrimaryItems` genericamente, sem hardcode dos labels do profissional, então não devem quebrar).

- [ ] **Step 6: Rodar typecheck e lint**

Rode: `cd frontend && npx tsc --noEmit && npx eslint src --max-warnings 0`
Esperado: sem erros (confirma que a remoção do import `CalendarDaysIcon` não deixou nada quebrado).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/navConfig.ts frontend/src/lib/navConfig.test.ts
git commit -m "fix(nav): item de perfil do profissional aponta para /professional/profile"
```
