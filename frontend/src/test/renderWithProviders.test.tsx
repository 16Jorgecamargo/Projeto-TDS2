import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { useQuery } from '@tanstack/react-query';
import { Routes, Route, useLocation } from 'react-router-dom';
import { renderWithProviders } from './renderWithProviders';

function QueryProbe() {
  const { data } = useQuery({ queryKey: ['probe'], queryFn: () => Promise.resolve('ok') });
  return <span>{data ?? 'loading'}</span>;
}

function LocationProbe() {
  return <span>{useLocation().pathname}</span>;
}

describe('renderWithProviders', () => {
  it('provides a query client', async () => {
    renderWithProviders(<QueryProbe />);
    expect(await screen.findByText('ok')).toBeInTheDocument();
  });

  it('renders at the requested route', () => {
    renderWithProviders(
      <Routes>
        <Route path="/dashboard" element={<LocationProbe />} />
      </Routes>,
      { route: '/dashboard' },
    );
    expect(screen.getByText('/dashboard')).toBeInTheDocument();
  });
});
