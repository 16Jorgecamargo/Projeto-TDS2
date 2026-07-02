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
