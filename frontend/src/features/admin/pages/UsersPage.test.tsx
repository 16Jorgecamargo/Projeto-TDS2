import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UsersPage } from './UsersPage';

vi.mock('../components/UsersTable', () => ({ UsersTable: () => <div>users-table</div> }));

describe('UsersPage', () => {
  it('mostra titulo e a tabela de usuarios', () => {
    render(<UsersPage />);
    expect(screen.getByRole('heading', { name: 'Usuários' })).toBeInTheDocument();
    expect(screen.getByText('users-table')).toBeInTheDocument();
  });
});
