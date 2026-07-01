import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CatalogService } from './catalog.service.js';
import type { CreateCategoryInput, UpdateCategoryInput, CreateTagInput } from './catalog.schemas.js';

export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  createCategory = async (
    req: FastifyRequest<{ Body: CreateCategoryInput }>,
    reply: FastifyReply,
  ) => reply.status(201).send(await this.service.createCategory(req.body));

  updateCategory = async (
    req: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.updateCategory(req.params.id, req.body));

  listCategories = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listCategories());

  listCategoryTree = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listCategoryTree());

  createTag = async (req: FastifyRequest<{ Body: CreateTagInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.createTag(req.body));

  listTags = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listTags());
}
