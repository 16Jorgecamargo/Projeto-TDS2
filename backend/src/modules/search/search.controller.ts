import type { FastifyReply, FastifyRequest } from 'fastify';
import type { SearchService } from './search.service.js';
import type { SearchQuery } from './search.schemas.js';

export class SearchController {
  constructor(private readonly service: SearchService) {}

  searchProfessionals = async (req: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) =>
    reply.send(await this.service.searchProfessionals(req.query));

  listLocations = async (_req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listLocations());
}
