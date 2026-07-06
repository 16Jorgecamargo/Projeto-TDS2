import { describe, it, expect } from 'vitest';
import { getNavItems, getMobilePrimaryItems, getDashboardItem, getChatItem } from './navConfig';

describe('navConfig', () => {
  it('retorna 4 itens para o cliente', () => {
    expect(getNavItems('client')).toHaveLength(4);
  });

  it('retorna 5 itens para o profissional', () => {
    expect(getNavItems('professional')).toHaveLength(5);
  });

  it('retorna 8 itens para o admin', () => {
    expect(getNavItems('admin')).toHaveLength(8);
  });

  it('separa os 2 primeiros itens como prioridade mobile do cliente', () => {
    const primary = getMobilePrimaryItems('client');
    expect(primary.map((item) => item.label)).toEqual(['Minhas demandas', 'Contratos']);
  });

  it('separa os 2 primeiros itens como prioridade mobile do profissional', () => {
    const primary = getMobilePrimaryItems('professional');
    expect(primary.map((item) => item.label)).toEqual(['Demandas disponíveis', 'Meus contratos']);
  });

  it('separa os 2 primeiros itens como prioridade mobile do admin', () => {
    const primary = getMobilePrimaryItems('admin');
    expect(primary.map((item) => item.label)).toEqual(['Denúncias', 'Disputas']);
  });

  it('resolve o item de dashboard por papel', () => {
    expect(getDashboardItem('client').to).toBe('/');
    expect(getDashboardItem('professional').to).toBe('/professional/dashboard');
    expect(getDashboardItem('admin').to).toBe('/admin');
  });

  it('item de perfil do profissional aponta para /professional/profile', () => {
    const items = getNavItems('professional');
    const perfilItem = items.find((item) => item.label === 'Perfil');
    expect(perfilItem?.to).toBe('/professional/profile');
  });

  it('resolve o item de chat quando o papel tem um', () => {
    expect(getChatItem('client')?.to).toBe('/chat');
    expect(getChatItem('professional')?.to).toBe('/chat');
    expect(getChatItem('admin')).toBeUndefined();
  });
});
