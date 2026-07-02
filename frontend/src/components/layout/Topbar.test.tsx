import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/renderWithProviders';
import { Topbar } from './Topbar';

vi.mock('../../features/notifications/queries', () => ({
  useNotifications: () => ({ data: { items: [] } }),
}));

describe('Topbar', () => {
  it('renderiza o título', () => {
    renderWithProviders(<Topbar />);
    expect(screen.getByText('Services Marketplace')).toBeInTheDocument();
  });
});
