import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HowItWorks } from './HowItWorks';

describe('HowItWorks', () => {
  it('renderiza os 3 passos do fluxo', () => {
    render(<HowItWorks />);
    expect(screen.getByRole('heading', { name: 'Como funciona' })).toBeInTheDocument();
    expect(screen.getByText('Busque')).toBeInTheDocument();
    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByText('Contrate')).toBeInTheDocument();
  });

  it('expoe id de ancora como-funciona na secao', () => {
    render(<HowItWorks />);
    const heading = screen.getByRole('heading', { name: 'Como funciona' });
    expect(heading.closest('section')).toHaveAttribute('id', 'como-funciona');
  });
});
