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
});
