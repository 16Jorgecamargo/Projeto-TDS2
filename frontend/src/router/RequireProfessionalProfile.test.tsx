import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequireProfessionalProfile } from './RequireProfessionalProfile';
import { useAuthStore } from '../stores/auth';
import { professionalApi } from '../features/professional/api';

vi.mock('../features/professional/api', () => ({
  professionalApi: { getMyProfile: vi.fn() },
}));

function renderAt(initial: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route element={<RequireProfessionalProfile />}>
            <Route path="/" element={<div>home</div>} />
            <Route path="/professional/profile" element={<div>profile-edit</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('RequireProfessionalProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.getState().clear();
    useAuthStore.getState().finishBootstrapping();
  });

  it('deixa passar direto quando nao e profissional', () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'client' }, 't');
    renderAt('/');
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('redireciona para /professional/profile quando profissional nao tem perfil', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 't');
    vi.mocked(professionalApi.getMyProfile).mockRejectedValue(new Error('404'));
    renderAt('/');
    await waitFor(() => expect(screen.getByText('profile-edit')).toBeInTheDocument());
  });

  it('renderiza a tela normal quando profissional ja tem perfil', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 't');
    vi.mocked(professionalApi.getMyProfile).mockResolvedValue({ id: 'p1' } as never);
    renderAt('/');
    await waitFor(() => expect(screen.getByText('home')).toBeInTheDocument());
  });

  it('nao redireciona quando ja esta na tela de perfil', async () => {
    useAuthStore.getState().setAuth({ id: 'u1', role: 'professional' }, 't');
    vi.mocked(professionalApi.getMyProfile).mockRejectedValue(new Error('404'));
    renderAt('/professional/profile');
    await waitFor(() => expect(screen.getByText('profile-edit')).toBeInTheDocument());
  });
});
