import path from 'node:path';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { UploadService } from './upload.service.js';
import { UploadController } from './upload.controller.js';
import { uploadImageBodySchema, uploadResponseSchema } from './upload.schemas.js';

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  const service = new UploadService({
    uploadDir: path.resolve(env.UPLOAD_DIR),
    maxSizeBytes: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    allowedMimeTypes: env.UPLOAD_ALLOWED_MIME.split(','),
  });
  const controller = new UploadController(service);

  app.post('/uploads/images', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['upload'],
      summary: 'Enviar imagem (multipart/form-data, campo "file")',
      consumes: ['multipart/form-data'],
      body: uploadImageBodySchema,
      response: { 201: uploadResponseSchema },
    },
    handler: controller.uploadImage,
  });
}
