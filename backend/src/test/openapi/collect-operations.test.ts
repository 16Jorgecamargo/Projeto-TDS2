import { describe, it, expect } from 'vitest';
import { collectOperations, hasRequestBody, type OpenApiDocument } from './collect-operations.js';

const document: OpenApiDocument = {
  openapi: '3.0.0',
  info: { title: 't', version: '1' },
  paths: {
    '/demands': {
      get: { tags: ['demand'], summary: 'Listar', responses: { '200': { description: 'ok' } } },
      post: {
        tags: ['demand'],
        summary: 'Criar',
        requestBody: { content: { 'application/json': { schema: {} } } },
        responses: { '201': { description: 'ok' } },
      },
    },
  },
};

describe('collectOperations', () => {
  it('achata paths em pares método/rota', () => {
    const entries = collectOperations(document);
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => `${e.method} ${e.path}`).sort()).toEqual(['GET /demands', 'POST /demands']);
  });

  it('detecta requestBody', () => {
    const entries = collectOperations(document);
    const post = entries.find((e) => e.method === 'POST')!;
    const get = entries.find((e) => e.method === 'GET')!;
    expect(hasRequestBody(post.operation)).toBe(true);
    expect(hasRequestBody(get.operation)).toBe(false);
  });
});
