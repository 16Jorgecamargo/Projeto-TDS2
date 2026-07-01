import { randomBytes, createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { getConfig } from '../../config/index.js';

export type Role = 'client' | 'professional' | 'admin';

interface AccessPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(payload: AccessPayload): string {
  const cfg = getConfig();
  return jwt.sign(payload, cfg.JWT_ACCESS_SECRET, {
    expiresIn: cfg.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const cfg = getConfig();
  const decoded = jwt.verify(token, cfg.JWT_ACCESS_SECRET);
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('invalid token payload');
  }
  return { sub: decoded.sub as string, role: (decoded as { role: Role }).role };
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

export function generateOpaqueToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString('hex');
  return { raw, hash: hashToken(raw) };
}
