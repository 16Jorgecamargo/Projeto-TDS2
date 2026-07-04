import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Slot } from './slot';

describe('Slot', () => {
  it('clona o filho aplicando props e mesclando className', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Slot className="extra-class" onClick={onClick}>
        <a href="/perfil" className="base-class">
          Perfil
        </a>
      </Slot>,
    );

    const link = screen.getByRole('link', { name: 'Perfil' });
    expect(link).toHaveClass('base-class');
    expect(link).toHaveClass('extra-class');

    await user.click(link);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('retorna null quando não há filho válido', () => {
    const { container } = render(<Slot>{null as unknown as never}</Slot>);
    expect(container).toBeEmptyDOMElement();
  });
});
