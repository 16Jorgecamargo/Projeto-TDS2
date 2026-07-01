import { describe, it, expect } from 'vitest';
import {
  signAccessToken,
  verifyAccessToken,
  generateOpaqueToken,
  hashToken,
} from './token.js';

describe('token utils', () => {
  it('assina e verifica access token com sub e role', () => {
    const token = signAccessToken({ sub: 'user-1', role: 'client' });
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe('user-1');
    expect(decoded.role).toBe('client');
  });

  it('rejeita token invalido', () => {
    expect(() => verifyAccessToken('garbage')).toThrow();
  });

  it('gera token opaco cujo hash bate com hashToken', () => {
    const { raw, hash } = generateOpaqueToken();
    expect(raw).toHaveLength(64);
    expect(hashToken(raw)).toBe(hash);
  });
});
