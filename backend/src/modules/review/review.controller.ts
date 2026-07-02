import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ReviewService } from './review.service.js';
import type { CreateReviewBody } from './review.schemas.js';

export class ReviewController {
  constructor(private readonly service: ReviewService) {}

  create = async (req: FastifyRequest<{ Body: CreateReviewBody }>, reply: FastifyReply) => {
    const result = await this.service.create({ ...req.body, authorId: req.user!.id });
    return reply.status(201).send(result);
  };

  listForProfessional = async (
    req: FastifyRequest<{ Params: { id: string }; Querystring: { page: number; limit: number } }>,
    reply: FastifyReply,
  ) => {
    const { page, limit } = req.query;
    const { items, total } = await this.service.listForProfessional(req.params.id, page, limit);
    return reply.send({ items, page, limit, total });
  };
}
