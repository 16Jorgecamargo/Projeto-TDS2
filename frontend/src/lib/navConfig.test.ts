import { describe, it, expect } from 'vitest';
import { getNavItems, getMobilePrimaryItems, getMobileOverflowItems } from './navConfig';

describe('navConfig', () => {
  it('retorna 8 itens para o cliente', () => {
    expect(getNavItems('client')).toHaveLength(8);
  });

  it('retorna 9 itens para o profissional', () => {
    expect(getNavItems('professional')).toHaveLength(9);
  });

  it('retorna 6 itens para o admin', () => {
    expect(getNavItems('admin')).toHaveLength(6);
  });

  it('separa os 4 primeiros itens como prioridade mobile do cliente, excluindo Buscar profissional (ja disponivel na busca do topbar)', () => {
    const primary = getMobilePrimaryItems('client');
    expect(primary.map((item) => item.label)).toEqual([
      'Dashboard',
      'Minhas demandas',
      'Contratos',
      'Chat',
    ]);
  });

  it('coloca o restante no overflow mobile do cliente', () => {
    const overflow = getMobileOverflowItems('client');
    expect(overflow.map((item) => item.label)).toEqual([
      'Chat',
      'Carteira',
      'Notificações',
      'Configurações',
    ]);
  });
});
