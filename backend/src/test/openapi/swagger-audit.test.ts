import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { collectOperations, hasRequestBody, type OpenApiDocument } from './collect-operations.js';

let app: FastifyInstance;
let entries: ReturnType<typeof collectOperations>;

const EXCLUDED_PATHS = ['/metrics', '/health', '/docs', '/docs/json', '/docs/static'];
const BODY_METHODS = ['POST', 'PUT', 'PATCH'];

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  const document = app.swagger() as unknown as OpenApiDocument;
  entries = collectOperations(document).filter(
    (entry) => !EXCLUDED_PATHS.some((excluded) => entry.path.startsWith(excluded)),
  );
});
afterAll(async () => {
  await app.close();
});

describe('auditoria OpenAPI', () => {
  it('expõe ao menos uma operação de negócio', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('toda operação tem ao menos uma tag', () => {
    const missing = entries.filter((e) => !e.operation.tags || e.operation.tags.length === 0);
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });

  it('toda operação tem summary não-vazio', () => {
    const missing = entries.filter((e) => !e.operation.summary || e.operation.summary.trim() === '');
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });

  it('toda operação declara ao menos uma resposta', () => {
    const missing = entries.filter((e) => !e.operation.responses || Object.keys(e.operation.responses).length === 0);
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });

  it('toda operação POST/PUT/PATCH declara requestBody', () => {
    const missing = entries.filter((e) => BODY_METHODS.includes(e.method) && !hasRequestBody(e.operation));
    expect(missing.map((e) => `${e.method} ${e.path}`)).toEqual([]);
  });
});
