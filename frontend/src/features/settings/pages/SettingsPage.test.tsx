import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from './SettingsPage';

vi.mock('../components/PreferencesForm', () => ({ PreferencesForm: () => <div>preferences-form</div> }));
vi.mock('../components/ConsentsPanel', () => ({ ConsentsPanel: () => <div>consents-panel</div> }));
vi.mock('../components/DeleteAccountPanel', () => ({ DeleteAccountPanel: () => <div>delete-account-panel</div> }));

describe('SettingsPage', () => {
  it('mostra titulo e as tres secoes dentro de cards separados', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Configurações' })).toBeInTheDocument();
    expect(screen.getByText('preferences-form')).toBeInTheDocument();
    expect(screen.getByText('consents-panel')).toBeInTheDocument();
    expect(screen.getByText('delete-account-panel')).toBeInTheDocument();
  });
});
