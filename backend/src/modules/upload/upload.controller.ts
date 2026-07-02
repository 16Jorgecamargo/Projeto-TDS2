import type {} from '@fastify/multipart';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestError } from '../../shared/errors.js';
import type { UploadService } from './upload.service.js';

export class UploadController {
  constructor(private readonly service: UploadService) {}

  uploadImage = async (req: FastifyRequest, reply: FastifyReply) => {
    const data = await req.file();
    if (!data) {
      throw new BadRequestError('Nenhum arquivo enviado');
    }
    const buffer = await data.toBuffer();
    const result = await this.service.saveImage(buffer);
    return reply.status(201).send(result);
  };
}
