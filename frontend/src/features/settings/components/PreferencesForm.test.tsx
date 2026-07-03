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
