import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BadRequestError, PayloadTooLargeError } from '../../shared/errors.js';
import { detectImageSignature } from './image-signature.js';

export interface UploadServiceDeps {
  uploadDir: string;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface UploadResult {
  url: string;
  filename: string;
  size: number;
}

export class UploadService {
  constructor(private readonly deps: UploadServiceDeps) {}

  async saveImage(buffer: Buffer): Promise<UploadResult> {
    if (buffer.length === 0) {
      throw new BadRequestError('Arquivo vazio');
    }
    if (buffer.length > this.deps.maxSizeBytes) {
      throw new PayloadTooLargeError('Arquivo excede o tamanho maximo permitido');
    }

    const signature = detectImageSignature(buffer);
    if (!signature || !this.deps.allowedMimeTypes.includes(signature.mimeType)) {
      throw new BadRequestError('Tipo de arquivo nao suportado');
    }

    await mkdir(this.deps.uploadDir, { recursive: true });
    const filename = `${randomUUID()}${signature.extension}`;
    const filePath = path.join(this.deps.uploadDir, filename);
    await writeFile(filePath, buffer);

    return { url: `/uploads/${filename}`, filename, size: buffer.length };
  }
}
