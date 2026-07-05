import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from './LandingPage';

vi.mock('../components/SearchBar', () => ({ SearchBar: () => <div>search-bar</div> }));
vi.mock('../components/CategoryGrid', () => ({ CategoryGrid: () => <div>category-grid</div> }));
vi.mock('../components/TrustStats', () => ({ TrustStats: () => <div>trust-stats</div> }));
vi.mock('../components/FeaturedProfessionals', () => ({ FeaturedProfessionals: () => <div>featured-professionals</div> }));
vi.mock('../components/HowItWorks', () => ({ HowItWorks: () => <div>how-it-works</div> }));
vi.mock('../components/Testimonials', () => ({ Testimonials: () => <div>testimonials</div> }));
vi.mock('../components/Faq', () => ({ Faq: () => <div>faq</div> }));
vi.mock('../components/ClosingCta', () => ({ ClosingCta: () => <div>closing-cta</div> }));

describe('LandingPage', () => {
  it('mostra titulo, busca e todas as secoes na ordem esperada', () => {
    render(<LandingPage />);

    expect(screen.getByRole('heading', { name: 'Encontre o profissional certo' })).toBeInTheDocument();
    expect(screen.getByText('search-bar')).toBeInTheDocument();

    const sectionLabels = [
      'trust-stats',
      'category-grid',
      'featured-professionals',
      'how-it-works',
      'testimonials',
      'faq',
      'closing-cta',
    ];
    const positions = sectionLabels.map((label) => {
      const element = screen.getByText(label);
      expect(element).toBeInTheDocument();
      return Array.from(document.body.querySelectorAll('body *')).indexOf(element);
    });
    const isAscending = positions.every((value, index) => index === 0 || value > positions[index - 1]);
    expect(isAscending).toBe(true);
  });

  it('mantem os badges de confianca do hero', () => {
    render(<LandingPage />);
    expect(screen.getByText('Pagamento protegido')).toBeInTheDocument();
    expect(screen.getByText('Profissionais avaliados')).toBeInTheDocument();
    expect(screen.getByText('Resposta rápida')).toBeInTheDocument();
  });
});
