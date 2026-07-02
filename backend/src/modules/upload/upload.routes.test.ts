import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { buildTestApp } from '../../test/buildTestApp.js';
import { truncateAll } from '../../test/database.js';
import { env } from '../../config/env.js';

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

async function registerUser(app: FastifyInstance) {
  const email = `upload-${Date.now()}-${Math.random()}@example.com`;
  const phone = `+55519${Math.floor(10000000 + Math.random() * 89999999)}`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'Upload User', email, phone, password: 'S3nh@Forte', role: 'client' },
  });
  const body = res.json();
  return { headers: { authorization: `Bearer ${body.accessToken}` } };
}

function buildMultipartBody(
  fieldName: string,
  filename: string,
  contentType: string,
  data: Buffer,
  boundary: string,
): Buffer {
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const epilogue = Buffer.from(`\r\n--${boundary}--\r\n`);
  return Buffer.concat([preamble, data, epilogue]);
}

describe('upload routes', () => {
  let app: FastifyInstance;
  const boundary = '----uploadtestboundary';

  beforeAll(async () => {
    app = await buildTestApp();
    await truncateAll();
  });

  afterAll(async () => {
    await app.close();
    await rm(path.resolve(env.UPLOAD_DIR), { recursive: true, force: true });
  });

  it('envia uma imagem e retorna url/filename/size', async () => {
    const user = await registerUser(app);
    const body = buildMultipartBody('file', 'photo.jpg', 'image/jpeg', JPEG_BYTES, boundary);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(201);
    const json = res.json();
    expect(json.url).toMatch(/^\/uploads\/[0-9a-f-]{36}\.jpg$/);
    expect(json.size).toBe(JPEG_BYTES.length);
  });

  it('rejeita arquivo com conteudo nao reconhecido como imagem', async () => {
    const user = await registerUser(app);
    const body = buildMultipartBody(
      'file',
      'evil.jpg',
      'image/jpeg',
      Buffer.from('nao sou uma imagem de verdade'),
      boundary,
    );

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(400);
  });

  it('retorna 401 sem autenticacao', async () => {
    const body = buildMultipartBody('file', 'photo.jpg', 'image/jpeg', JPEG_BYTES, boundary);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });

    expect(res.statusCode).toBe(401);
  });

  it('retorna 413 quando o arquivo excede o limite do plugin multipart', async () => {
    const user = await registerUser(app);
    const oversizedBytes = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.alloc((env.UPLOAD_MAX_SIZE_MB + 2) * 1024 * 1024, 0x41),
    ]);
    const body = buildMultipartBody('file', 'huge.jpg', 'image/jpeg', oversizedBytes, boundary);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).toBe(413);
  });

  it('retorna 400 quando nenhum arquivo e enviado', async () => {
    const user = await registerUser(app);
    const emptyBody = Buffer.from(`--${boundary}--\r\n`);

    const res = await app.inject({
      method: 'POST',
      url: '/api/uploads/images',
      headers: {
        ...user.headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: emptyBody,
    });

    expect(res.statusCode).toBe(400);
  });
});
