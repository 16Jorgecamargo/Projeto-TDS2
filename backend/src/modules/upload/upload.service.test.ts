import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { UploadService } from './upload.service.js';
import { BadRequestError, PayloadTooLargeError } from '../../shared/errors.js';

const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

describe('UploadService', () => {
  let uploadDir: string;
  let service: UploadService;

  beforeEach(async () => {
    uploadDir = await mkdtemp(path.join(tmpdir(), 'upload-test-'));
    service = new UploadService({ uploadDir, maxSizeBytes: 1024 * 1024, allowedMimeTypes: ALLOWED });
  });

  afterEach(async () => {
    await rm(uploadDir, { recursive: true, force: true });
  });

  it('salva um JPEG valido e retorna url/filename/size', async () => {
    const result = await service.saveImage(JPEG_BYTES);

    expect(result.filename).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(result.url).toBe(`/uploads/${result.filename}`);
    expect(result.size).toBe(JPEG_BYTES.length);

    const written = await readFile(path.join(uploadDir, result.filename));
    expect(written).toEqual(JPEG_BYTES);
  });

  it('rejeita buffer vazio', async () => {
    await expect(service.saveImage(Buffer.alloc(0))).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejeita arquivo maior que o limite configurado', async () => {
    const small = new UploadService({ uploadDir, maxSizeBytes: 5, allowedMimeTypes: ALLOWED });
    await expect(small.saveImage(JPEG_BYTES)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it('rejeita tipo de arquivo nao reconhecido', async () => {
    const text = Buffer.from('nao sou uma imagem');
    await expect(service.saveImage(text)).rejects.toBeInstanceOf(BadRequestError);
  });

  it('rejeita mime detectado fora da lista permitida', async () => {
    const jpegOnly = new UploadService({ uploadDir, maxSizeBytes: 1024 * 1024, allowedMimeTypes: ['image/png'] });
    await expect(jpegOnly.saveImage(JPEG_BYTES)).rejects.toBeInstanceOf(BadRequestError);
  });
});
