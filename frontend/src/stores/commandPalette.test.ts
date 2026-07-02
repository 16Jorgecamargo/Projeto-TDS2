import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandPaletteStore } from './commandPalette';

describe('useCommandPaletteStore', () => {
  beforeEach(() => {
    useCommandPaletteStore.setState({ open: false });
  });

  it('inicia fechada', () => {
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it('abre com openPalette', () => {
    useCommandPaletteStore.getState().openPalette();
    expect(useCommandPaletteStore.getState().open).toBe(true);
  });

  it('fecha com closePalette', () => {
    useCommandPaletteStore.getState().openPalette();
    useCommandPaletteStore.getState().closePalette();
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });

  it('alterna com toggle', () => {
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().open).toBe(true);
    useCommandPaletteStore.getState().toggle();
    expect(useCommandPaletteStore.getState().open).toBe(false);
  });
});
