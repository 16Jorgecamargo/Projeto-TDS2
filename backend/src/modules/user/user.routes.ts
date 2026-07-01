import type { FastifyInstance } from 'fastify';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import { User } from '../../infra/database/entities/user.entity.js';
import { userProfileSchema, updateProfileSchema } from './user.schemas.js';

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const service = new UserService({ users: app.dataSource.getRepository(User) });
  const controller = new UserController(service);

  app.get('/users/me', {
    onRequest: [app.authenticate],
    schema: { tags: ['user'], summary: 'Perfil atual', response: { 200: userProfileSchema } },
    handler: controller.me,
  });
  app.patch('/users/me', {
    onRequest: [app.authenticate],
    schema: { tags: ['user'], summary: 'Atualiza perfil', body: updateProfileSchema, response: { 200: userProfileSchema } },
    handler: controller.update,
  });
}
