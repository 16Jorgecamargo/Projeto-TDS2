import { describe, it, expect } from 'vitest';
import { useRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function TestHarness({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(active, containerRef);

  return (
    <div>
      <button>Fora</button>
      <div ref={containerRef} tabIndex={-1}>
        <button>Primeiro</button>
        <button>Último</button>
      </div>
    </div>
  );
}

function EmptyContainerHarness({ active }: { active: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(active, containerRef);

  return (
    <div>
      <button>Fora 1</button>
      <button>Fora 2</button>
      <div ref={containerRef} tabIndex={-1}>
        <span>Sem elementos focáveis</span>
      </div>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('foca o primeiro elemento focável ao ativar', () => {
    render(<TestHarness active />);
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('cicla do último para o primeiro com Tab', async () => {
    const user = userEvent.setup();
    render(<TestHarness active />);
    screen.getByRole('button', { name: 'Último' }).focus();

    await user.tab();

    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();
  });

  it('cicla do primeiro para o último com Shift+Tab', async () => {
    const user = userEvent.setup();
    render(<TestHarness active />);
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();

    await user.tab({ shift: true });

    expect(screen.getByRole('button', { name: 'Último' })).toHaveFocus();
  });

  it('restaura o foco para o elemento anterior quando active vira false', () => {
    const foraButton = document.createElement('button');
    foraButton.textContent = 'Externo';
    document.body.appendChild(foraButton);
    foraButton.focus();

    const { rerender } = render(<TestHarness active={false} />);
    expect(foraButton).toHaveFocus();

    rerender(<TestHarness active />);
    expect(screen.getByRole('button', { name: 'Primeiro' })).toHaveFocus();

    rerender(<TestHarness active={false} />);
    expect(foraButton).toHaveFocus();

    document.body.removeChild(foraButton);
  });

  it('não trava a navegação da página quando o container não tem elementos focáveis', async () => {
    const user = userEvent.setup();
    render(<EmptyContainerHarness active />);

    const fora1 = screen.getByRole('button', { name: 'Fora 1' });
    const fora2 = screen.getByRole('button', { name: 'Fora 2' });
    fora1.focus();
    expect(fora1).toHaveFocus();

    await user.tab();

    expect(fora2).toHaveFocus();
  });
});
