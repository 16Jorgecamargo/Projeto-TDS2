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
