# Fase 2 — Phase D: Perfil Público (Tasks 8-10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

See [plan_index.md](plan_index.md) for Global Constraints. Depends on [plan_phase_a_favorites_reviews.md](plan_phase_a_favorites_reviews.md) (Task 1's `FavoriteButton`/`useFavoriteIds`, Task 2's `ReviewList`). Work from `frontend/` unless noted.

**Field-shape note (read before Task 8):** `PublicProfile` (`frontend/src/features/professional/api.ts`) has `userId`, `id` (the professional profile id — used for favorites/invites, matching the convention already used by `POST /favorites` and `POST /demands/:id/invitations`), `headline` (no separate `name` field), and no `avatarUrl` field. `Avatar` therefore always renders initials from `headline` in this phase — do not add a `src` prop without first confirming a display-photo field actually exists on the real API response (read the current `frontend/src/features/professional/api.ts` before starting; if the type changed since this plan was written, use the real field names).

---

### Task 8: `ProfessionalProfileHeader`

**Files:**
- Create: `frontend/src/features/professional/components/ProfessionalProfileHeader.tsx`
- Test: `frontend/src/features/professional/components/ProfessionalProfileHeader.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Badge`, `Button` from `frontend/src/components/ui/`; `FavoriteButton` from `frontend/src/features/favorites/components/FavoriteButton.tsx`; `useCreateRoom` from `frontend/src/features/chat/queries.ts` (`mutate({ participantId, contractId? }, { onSuccess: (room) => ... })`, `room.id` is the new chat room's id); `PublicProfile` type from `frontend/src/features/professional/api.ts`.
- Produces: `ProfessionalProfileHeaderProps { profile: PublicProfile; isFavorite: boolean }`, `ProfessionalProfileHeader` component. Consumed by `PublicProfilePage` (Task 10). "Contratar" navigates to `/demands/new?professionalId={profile.id}` — Fase 2's Demandas phase (`plan_phase_e_demands.md`) is responsible for reading that query param on `PublishDemandPage` and auto-inviting the professional after the demand is created; this task only needs to produce the correctly-shaped URL.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { ProfessionalProfileHeader } from './ProfessionalProfileHeader';
import { useCreateRoom } from '../../chat/queries';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../../chat/queries', () => ({ useCreateRoom: vi.fn() }));
vi.mock('../../favorites/queries', () => ({
  useAddFavorite: () => ({ mutate: vi.fn(), isPending: false }),
  useRemoveFavorite: () => ({ mutate: vi.fn(), isPending: false }),
}));

const profile = {
  id: 'prof-1',
  userId: 'user-1',
  headline: 'Eletricista João',
  bio: null,
  yearsExperience: null,
  hourlyRate: null,
  serviceRadiusKm: null,
  ratingAverage: 4.5,
  ratingCount: 12,
  isAvailable: true,
  verifiedAt: null,
  createdAt: '',
  categories: [{ id: 'c1', name: 'Elétrica', slug: 'eletrica' }],
  experiences: [],
  education: [],
  certifications: [],
  serviceAreas: [],
} as never;

describe('ProfessionalProfileHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateRoom).mockReturnValue({ mutate: vi.fn(), isPending: false } as never);
  });

  it('renderiza headline, categoria e nota', () => {
    renderWithProviders(<ProfessionalProfileHeader profile={profile} isFavorite={false} />);

    expect(screen.getByText('Eletricista João')).toBeInTheDocument();
    expect(screen.getByText('Elétrica')).toBeInTheDocument();
    expect(screen.getByText('4.5 (12)')).toBeInTheDocument();
  });

  it('navega para /demands/new com o professionalId ao clicar em Contratar', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProfessionalProfileHeader profile={profile} isFavorite={false} />);

    await user.click(screen.getByRole('button', { name: 'Contratar' }));

    expect(navigateMock).toHaveBeenCalledWith('/demands/new?professionalId=prof-1');
  });

  it('cria sala de chat com o userId do profissional e navega ao sucesso', async () => {
    const mutate = vi.fn((_input, options?: { onSuccess: (room: { id: string }) => void }) => {
      options?.onSuccess({ id: 'room-1' });
    });
    vi.mocked(useCreateRoom).mockReturnValue({ mutate, isPending: false } as never);
    const user = userEvent.setup();
    renderWithProviders(<ProfessionalProfileHeader profile={profile} isFavorite={false} />);

    await user.click(screen.getByRole('button', { name: 'Chat' }));

    expect(mutate).toHaveBeenCalledWith({ participantId: 'user-1' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
    expect(navigateMock).toHaveBeenCalledWith('/chat/room-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/professional/components/ProfessionalProfileHeader.test.tsx`
Expected: FAIL — `Cannot find module './ProfessionalProfileHeader'`

- [ ] **Step 3: Write `ProfessionalProfileHeader.tsx`**

```tsx
import type { JSX } from 'react';
import { useNavigate } from 'react-router-dom';
import { StarIcon } from '@heroicons/react/24/solid';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FavoriteButton } from '../../favorites/components/FavoriteButton';
import { useCreateRoom } from '../../chat/queries';
import type { PublicProfile } from '../api';

export interface ProfessionalProfileHeaderProps {
  profile: PublicProfile;
  isFavorite: boolean;
}

export function ProfessionalProfileHeader({ profile, isFavorite }: ProfessionalProfileHeaderProps): JSX.Element {
  const navigate = useNavigate();
  const createRoom = useCreateRoom();

  function handleChat() {
    createRoom.mutate(
      { participantId: profile.userId },
      { onSuccess: (room) => navigate(`/chat/${room.id}`) },
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <Avatar name={profile.headline} size="lg" />
        <div>
          <h1 className="text-2xl font-bold text-ink">{profile.headline}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {profile.categories.map((category) => (
              <Badge key={category.id}>{category.name}</Badge>
            ))}
            <span className="flex items-center gap-1 text-sm text-muted">
              <StarIcon className="h-4 w-4 text-accent" />
              {profile.ratingAverage.toFixed(1)} ({profile.ratingCount})
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <FavoriteButton professionalId={profile.id} isFavorite={isFavorite} />
        <Button variant="ghost" onClick={handleChat} disabled={createRoom.isPending}>
          Chat
        </Button>
        <Button onClick={() => navigate(`/demands/new?professionalId=${profile.id}`)}>Contratar</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/professional/components/ProfessionalProfileHeader.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/professional/components/ProfessionalProfileHeader.tsx frontend/src/features/professional/components/ProfessionalProfileHeader.test.tsx
git commit -m "feat(professional): adiciona ProfessionalProfileHeader com favoritar, chat e contratar"
```

---

### Task 9: `PortfolioGallery` + `AvailabilityGrid`

**Files:**
- Create: `frontend/src/features/professional/components/PortfolioGallery.tsx`
- Create: `frontend/src/features/professional/components/AvailabilityGrid.tsx`
- Test: `frontend/src/features/professional/components/PortfolioGallery.test.tsx`
- Test: `frontend/src/features/professional/components/AvailabilityGrid.test.tsx`

**Interfaces:**
- Consumes: `usePortfolio`, `useSlots` from `frontend/src/features/professional/queries.ts`; `Skeleton`, `EmptyState` from `frontend/src/components/ui/`.
- Produces: `PortfolioGallery` with props `{ professionalId: string }`, `AvailabilityGrid` with props `{ professionalId: string }`. Both consumed by `PublicProfilePage` (Task 10).

- [ ] **Step 1: Write the failing test for `PortfolioGallery`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { PortfolioGallery } from './PortfolioGallery';
import { usePortfolio } from '../queries';

vi.mock('../queries', () => ({ usePortfolio: vi.fn() }));

describe('PortfolioGallery', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza titulo e imagens de cada item', () => {
    vi.mocked(usePortfolio).mockReturnValue({
      data: [
        {
          id: 'i1',
          categoryId: null,
          title: 'Instalação elétrica completa',
          description: null,
          completedAt: null,
          images: [{ id: 'img1', imageUrl: '/uploads/foto1.jpg', position: 0 }],
        },
      ],
      isPending: false,
    } as never);

    renderWithProviders(<PortfolioGallery professionalId="p1" />);

    expect(screen.getByText('Instalação elétrica completa')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Instalação elétrica completa' })).toHaveAttribute(
      'src',
      '/uploads/foto1.jpg',
    );
  });

  it('mostra estado vazio sem itens de portfolio', () => {
    vi.mocked(usePortfolio).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<PortfolioGallery professionalId="p1" />);

    expect(screen.getByText('Nenhum item no portfólio ainda')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/professional/components/PortfolioGallery.test.tsx`
Expected: FAIL — `Cannot find module './PortfolioGallery'`

- [ ] **Step 3: Write `PortfolioGallery.tsx`**

```tsx
import type { JSX } from 'react';
import { usePortfolio } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export interface PortfolioGalleryProps {
  professionalId: string;
}

export function PortfolioGallery({ professionalId }: PortfolioGalleryProps): JSX.Element {
  const { data, isPending } = usePortfolio(professionalId);

  if (isPending) {
    return <Skeleton className="h-40 w-full" aria-label="Carregando portfólio" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="Nenhum item no portfólio ainda" />;
  }

  return (
    <div className="flex flex-col gap-6">
      {data.map((item) => (
        <div key={item.id}>
          <h3 className="mb-2 text-sm font-semibold text-ink">{item.title}</h3>
          {item.images.length === 0 ? (
            <p className="text-sm text-muted">Sem fotos.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {item.images.map((image) => (
                <img
                  key={image.id}
                  src={image.imageUrl}
                  alt={item.title}
                  className="aspect-square w-full rounded-md object-cover"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/professional/components/PortfolioGallery.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Write the failing test for `AvailabilityGrid`**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { AvailabilityGrid } from './AvailabilityGrid';
import { useSlots } from '../queries';

vi.mock('../queries', () => ({ useSlots: vi.fn() }));

describe('AvailabilityGrid', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renderiza os slots com o dia da semana por extenso', () => {
    vi.mocked(useSlots).mockReturnValue({
      data: [{ id: 's1', weekday: 1, startTime: '08:00', endTime: '18:00' }],
      isPending: false,
    } as never);

    renderWithProviders(<AvailabilityGrid professionalId="p1" />);

    expect(screen.getByText('Segunda: 08:00 - 18:00')).toBeInTheDocument();
  });

  it('mostra estado vazio quando nao ha slots', () => {
    vi.mocked(useSlots).mockReturnValue({ data: [], isPending: false } as never);

    renderWithProviders(<AvailabilityGrid professionalId="p1" />);

    expect(screen.getByText('Disponibilidade não informada')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run src/features/professional/components/AvailabilityGrid.test.tsx`
Expected: FAIL — `Cannot find module './AvailabilityGrid'`

- [ ] **Step 7: Write `AvailabilityGrid.tsx`**

```tsx
import type { JSX } from 'react';
import { useSlots } from '../queries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export interface AvailabilityGridProps {
  professionalId: string;
}

const WEEKDAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function AvailabilityGrid({ professionalId }: AvailabilityGridProps): JSX.Element {
  const { data, isPending } = useSlots(professionalId);

  if (isPending) {
    return <Skeleton className="h-24 w-full" aria-label="Carregando disponibilidade" />;
  }

  if (!data || data.length === 0) {
    return <EmptyState title="Disponibilidade não informada" />;
  }

  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {data.map((slot) => (
        <li key={slot.id} className="rounded-md bg-surface px-3 py-2 text-sm text-ink">
          {WEEKDAY_LABELS[slot.weekday]}: {slot.startTime} - {slot.endTime}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run src/features/professional/components/AvailabilityGrid.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/professional/components/PortfolioGallery.tsx frontend/src/features/professional/components/PortfolioGallery.test.tsx frontend/src/features/professional/components/AvailabilityGrid.tsx frontend/src/features/professional/components/AvailabilityGrid.test.tsx
git commit -m "feat(professional): adiciona PortfolioGallery e AvailabilityGrid"
```

---

### Task 10: Composição do `PublicProfilePage`

**Files:**
- Modify: `frontend/src/features/professional/pages/PublicProfilePage.tsx`
- Test: `frontend/src/features/professional/pages/PublicProfilePage.test.tsx` (new — replaces informal manual coverage; check whether an existing test file for this page already exists before creating, and merge instead of duplicating if so)

**Interfaces:**
- Consumes: `usePublicProfile` from `frontend/src/features/professional/queries.ts`; `useFavoriteIds` from `frontend/src/features/favorites/queries.ts`; `ProfessionalProfileHeader`, `PortfolioGallery`, `AvailabilityGrid` (Tasks 8-9); `ReviewList` from `frontend/src/features/reviews/components/ReviewList.tsx` (Phase A, Task 2); `Skeleton`, `EmptyState` from `frontend/src/components/ui/`.
- Produces: rewritten `PublicProfilePage` default export.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test/renderWithProviders';
import PublicProfilePage from './PublicProfilePage';
import { usePublicProfile } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: () => ({ id: 'prof-1' }) };
});
vi.mock('../queries', () => ({ usePublicProfile: vi.fn(), usePortfolio: vi.fn(), useSlots: vi.fn() }));
vi.mock('../../favorites/queries', () => ({ useFavoriteIds: vi.fn() }));
vi.mock('../components/ProfessionalProfileHeader', () => ({
  ProfessionalProfileHeader: () => <div>profile-header</div>,
}));
vi.mock('../components/PortfolioGallery', () => ({ PortfolioGallery: () => <div>portfolio-gallery</div> }));
vi.mock('../components/AvailabilityGrid', () => ({ AvailabilityGrid: () => <div>availability-grid</div> }));
vi.mock('../../reviews/components/ReviewList', () => ({ ReviewList: () => <div>review-list</div> }));

const profile = {
  id: 'prof-1',
  userId: 'user-1',
  headline: 'Eletricista João',
  bio: 'Mais de 10 anos de experiência.',
  serviceAreas: [{ id: 'a1', city: 'Porto Alegre', state: 'RS', radiusKm: null }],
  categories: [],
  ratingAverage: 4.5,
  ratingCount: 12,
} as never;

describe('PublicProfilePage', () => {
  it('compoe header, bio, areas, portfolio, disponibilidade e avaliacoes', () => {
    vi.mocked(usePublicProfile).mockReturnValue({ data: profile, isPending: false, isError: false } as never);
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());

    renderWithProviders(<PublicProfilePage />);

    expect(screen.getByText('profile-header')).toBeInTheDocument();
    expect(screen.getByText('Mais de 10 anos de experiência.')).toBeInTheDocument();
    expect(screen.getByText('Porto Alegre - RS')).toBeInTheDocument();
    expect(screen.getByText('portfolio-gallery')).toBeInTheDocument();
    expect(screen.getByText('availability-grid')).toBeInTheDocument();
    expect(screen.getByText('review-list')).toBeInTheDocument();
  });

  it('mostra estado de nao encontrado quando o perfil nao existe', () => {
    vi.mocked(usePublicProfile).mockReturnValue({ data: undefined, isPending: false, isError: true } as never);
    vi.mocked(useFavoriteIds).mockReturnValue(new Set());

    renderWithProviders(<PublicProfilePage />);

    expect(screen.getByText('Perfil não encontrado')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/professional/pages/PublicProfilePage.test.tsx`
Expected: FAIL — current page doesn't render this composition/these child components

- [ ] **Step 3: Replace `PublicProfilePage.tsx`**

```tsx
import type { JSX } from 'react';
import { useParams } from 'react-router-dom';
import { usePublicProfile } from '../queries';
import { useFavoriteIds } from '../../favorites/queries';
import { ProfessionalProfileHeader } from '../components/ProfessionalProfileHeader';
import { PortfolioGallery } from '../components/PortfolioGallery';
import { AvailabilityGrid } from '../components/AvailabilityGrid';
import { ReviewList } from '../../reviews/components/ReviewList';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/ui/EmptyState';

export default function PublicProfilePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const { data: profile, isPending, isError } = usePublicProfile(id);
  const favoriteIds = useFavoriteIds();

  if (isPending) {
    return <Skeleton className="m-6 h-40 w-full" aria-label="Carregando perfil" />;
  }

  if (isError || !profile) {
    return <EmptyState className="m-6" title="Perfil não encontrado" />;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <ProfessionalProfileHeader profile={profile} isFavorite={favoriteIds.has(profile.id)} />
      {profile.bio && (
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Sobre</h2>
          <p className="text-sm text-ink">{profile.bio}</p>
        </section>
      )}
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Áreas de atendimento</h2>
        {profile.serviceAreas.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma área informada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.serviceAreas.map((area) => (
              <li key={area.id} className="rounded-full bg-surface px-3 py-1 text-sm text-ink">
                {area.city} - {area.state}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Portfólio</h2>
        <PortfolioGallery professionalId={profile.id} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Disponibilidade</h2>
        <AvailabilityGrid professionalId={profile.id} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold text-ink">Avaliações</h2>
        <ReviewList professionalId={profile.id} />
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/professional/pages/PublicProfilePage.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the full frontend suite to confirm no regression**

Run: `npm run test`
Expected: PASS (all suites)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/professional/pages/PublicProfilePage.tsx frontend/src/features/professional/pages/PublicProfilePage.test.tsx
git commit -m "feat(professional): compoe PublicProfilePage com header, portfolio, disponibilidade e avaliacoes"
```

---

Next: [plan_phase_e_demands.md](plan_phase_e_demands.md)
