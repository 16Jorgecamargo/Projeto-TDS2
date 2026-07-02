import { describe, it, expect } from 'vitest';
import { getNavItems, getMobilePrimaryItems, getDashboardRoute } from './navConfig';

describe('navConfig', () => {
  it('retorna 5 itens para o cliente', () => {
    expect(getNavItems('client')).toHaveLength(5);
  });

  it('retorna 7 itens para o profissional', () => {
    expect(getNavItems('professional')).toHaveLength(7);
  });

  it('retorna 5 itens para o admin', () => {
    expect(getNavItems('admin')).toHaveLength(5);
  });

  it('separa os 4 primeiros itens como prioridade mobile do cliente', () => {
    const primary = getMobilePrimaryItems('client');
    expect(primary.map((item) => item.label)).toEqual([
      'Minhas demandas',
      'Contratos',
      'Chat',
      'Configurações',
    ]);
  });

  it('separa os 4 primeiros itens como prioridade mobile do profissional', () => {
    const primary = getMobilePrimaryItems('professional');
    expect(primary.map((item) => item.label)).toEqual([
      'Demandas disponíveis',
      'Meus contratos',
      'Chat',
      'Configurações',
    ]);
  });

  it('separa os 4 primeiros itens como prioridade mobile do admin', () => {
    const primary = getMobilePrimaryItems('admin');
    expect(primary.map((item) => item.label)).toEqual([
      'Denúncias',
      'Disputas',
      'Usuários',
      'Contratos',
    ]);
  });

  it('resolve a rota de dashboard de cada papel', () => {
    expect(getDashboardRoute('client')).toBe('/');
    expect(getDashboardRoute('professional')).toBe('/professional/dashboard');
    expect(getDashboardRoute('admin')).toBe('/admin');
  });
});
