import { describe, it, expect, beforeEach } from 'vitest';
import { useSidebarStore } from './sidebar';

describe('useSidebarStore', () => {
  beforeEach(() => {
    useSidebarStore.setState({ collapsed: false });
    localStorage.clear();
  });

  it('inicia expandida', () => {
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('alterna o estado ao chamar toggle', () => {
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(true);
    useSidebarStore.getState().toggle();
    expect(useSidebarStore.getState().collapsed).toBe(false);
  });

  it('define o estado diretamente com setCollapsed', () => {
    useSidebarStore.getState().setCollapsed(true);
    expect(useSidebarStore.getState().collapsed).toBe(true);
  });
});
