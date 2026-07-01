import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AccountService } from './account.service.js';
import type { UpdatePreferencesInput, RecordConsentInput } from './account.schemas.js';

export class AccountController {
  constructor(private readonly service: AccountService) {}

  getPreferences = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.getPreferences(req.user.id));

  updatePreferences = async (
    req: FastifyRequest<{ Body: UpdatePreferencesInput }>,
    reply: FastifyReply,
  ) => reply.send(await this.service.updatePreferences(req.user.id, req.body));

  listConsents = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listConsents(req.user.id));

  recordConsent = async (req: FastifyRequest<{ Body: RecordConsentInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.recordConsent(req.user.id, req.body));
}
