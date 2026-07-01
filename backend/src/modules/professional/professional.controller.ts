import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ProfessionalService } from './professional.service.js';
import type {
  UpsertProfileInput,
  SetAssociationsInput,
  ExperienceInput,
  EducationInput,
  CertificationInput,
  ServiceAreaInput,
  DocumentInput,
} from './professional.schemas.js';

export class ProfessionalController {
  constructor(private readonly service: ProfessionalService) {}

  upsertProfile = async (req: FastifyRequest<{ Body: UpsertProfileInput }>, reply: FastifyReply) =>
    reply.send(await this.service.upsertProfile(req.user!.id, req.body));

  getMyProfile = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.getMyProfile(req.user!.id));

  getPublicProfile = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) =>
    reply.send(await this.service.getPublicProfile(req.params.id));

  setCategories = async (req: FastifyRequest<{ Body: SetAssociationsInput }>, reply: FastifyReply) => {
    await this.service.setCategories(req.user!.id, req.body.ids);
    return reply.status(204).send();
  };

  setTags = async (req: FastifyRequest<{ Body: SetAssociationsInput }>, reply: FastifyReply) => {
    await this.service.setTags(req.user!.id, req.body.ids);
    return reply.status(204).send();
  };

  addExperience = async (req: FastifyRequest<{ Body: ExperienceInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addExperience(req.user!.id, req.body));

  removeExperience = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeExperience(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addEducation = async (req: FastifyRequest<{ Body: EducationInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addEducation(req.user!.id, req.body));

  removeEducation = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeEducation(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addCertification = async (req: FastifyRequest<{ Body: CertificationInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addCertification(req.user!.id, req.body));

  removeCertification = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeCertification(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addServiceArea = async (req: FastifyRequest<{ Body: ServiceAreaInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addServiceArea(req.user!.id, req.body));

  removeServiceArea = async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await this.service.removeServiceArea(req.user!.id, req.params.id);
    return reply.status(204).send();
  };

  addDocument = async (req: FastifyRequest<{ Body: DocumentInput }>, reply: FastifyReply) =>
    reply.status(201).send(await this.service.addDocument(req.user!.id, req.body));

  listDocuments = async (req: FastifyRequest, reply: FastifyReply) =>
    reply.send(await this.service.listDocuments(req.user!.id));
}
