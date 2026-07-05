import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableSelect } from './SearchableSelect';

const OPTIONS = [
  { value: 'SP', label: 'São Paulo' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RJ', label: 'Rio de Janeiro' },
];

describe('SearchableSelect', () => {
  it('mostra todas as opcoes ao focar e filtra ao digitar', async () => {
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={vi.fn()} id="uf" />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option')).toHaveLength(3);

    await user.type(screen.getByRole('combobox'), 'Rio');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Rio Grande do Sul' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'São Paulo' })).not.toBeInTheDocument();
  });

  it('chama onChange com o value ao clicar numa opcao e fecha a lista', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect options={OPTIONS} value="" onChange={onChange} id="uf" />);

    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Rio de Janeiro' }));

    expect(onChange).toHaveBeenCalledWith('RJ');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('exibe o label da opcao selecionada quando value e passado', () => {
    render(<SearchableSelect options={OPTIONS} value="SP" onChange={vi.fn()} id="uf" />);
    expect(screen.getByRole('combobox')).toHaveValue('São Paulo');
  });
});
