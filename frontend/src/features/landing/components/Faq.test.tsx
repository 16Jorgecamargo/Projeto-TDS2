import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Faq } from './Faq';

describe('Faq', () => {
  it('renderiza perguntas com resposta recolhida por padrao', () => {
    render(<Faq />);
    const firstQuestion = screen.getByRole('button', { name: 'Como funciona o pagamento?' });
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  it('expande a resposta ao clicar na pergunta e recolhe ao clicar de novo', () => {
    render(<Faq />);
    const firstQuestion = screen.getByRole('button', { name: 'Como funciona o pagamento?' });

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/pagamento fica retido/i)).toBeInTheDocument();

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });
});
