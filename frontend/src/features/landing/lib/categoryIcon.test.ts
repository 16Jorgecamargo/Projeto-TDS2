import { describe, it, expect } from 'vitest';
import { Zap, Wrench, LayoutGrid } from 'lucide-react';
import { getCategoryIcon } from './categoryIcon';

describe('getCategoryIcon', () => {
  it('retorna icone especifico para categoria com palavra-chave conhecida', () => {
    expect(getCategoryIcon('Serviços Elétricos')).toBe(Zap);
    expect(getCategoryIcon('encanador')).toBe(Wrench);
  });

  it('e case-insensitive', () => {
    expect(getCategoryIcon('ELÉTRICA RESIDENCIAL')).toBe(Zap);
  });

  it('retorna icone generico para categoria sem palavra-chave conhecida', () => {
    expect(getCategoryIcon('Categoria sem mapeamento')).toBe(LayoutGrid);
  });
});
