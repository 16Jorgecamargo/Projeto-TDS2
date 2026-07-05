import { describe, it, expect } from 'vitest';
import { getPasswordStrength } from './passwordStrength';

describe('getPasswordStrength', () => {
  it('retorna score 0 para senha vazia ou muito curta', () => {
    expect(getPasswordStrength('').score).toBe(0);
    expect(getPasswordStrength('abc').score).toBe(0);
  });

  it('retorna score 1 para senha so com letras minusculas e 8+ caracteres', () => {
    expect(getPasswordStrength('abcdefgh').score).toBe(1);
  });

  it('retorna score 2 para senha com letras e numeros', () => {
    expect(getPasswordStrength('abcdefg1').score).toBe(2);
  });

  it('retorna score 3 para senha com letras, numeros e simbolo', () => {
    expect(getPasswordStrength('Abcdefg1!').score).toBe(3);
  });

  it('retorna o label correspondente a cada score', () => {
    expect(getPasswordStrength('').label).toBe('Muito fraca');
    expect(getPasswordStrength('abcdefgh').label).toBe('Fraca');
    expect(getPasswordStrength('abcdefg1').label).toBe('Media');
    expect(getPasswordStrength('Abcdefg1!').label).toBe('Forte');
  });
});
