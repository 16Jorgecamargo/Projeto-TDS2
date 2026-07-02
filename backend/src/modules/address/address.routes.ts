import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AddressService } from './address.service.js';
import { AddressController } from './address.controller.js';
import { Address } from '../../infra/database/entities/address.entity.js';
import { emptyBodySchema, idParamSchema } from '../../shared/schemas.js';
import { addressSchema, createAddressSchema, updateAddressSchema } from './address.schemas.js';

export async function addressRoutes(app: FastifyInstance): Promise<void> {
  const service = new AddressService({ addresses: app.dataSource.getRepository(Address) });
  const controller = new AddressController(service);

  app.get('/addresses', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Lista enderecos', response: { 200: z.array(addressSchema) } },
    handler: controller.list,
  });
  app.post('/addresses', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Cria endereco', body: createAddressSchema, response: { 201: addressSchema } },
    handler: controller.create,
  });
  app.patch('/addresses/:id', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Atualiza endereco', params: idParamSchema, body: updateAddressSchema, response: { 200: addressSchema } },
    handler: controller.update,
  });
  app.delete('/addresses/:id', {
    onRequest: [app.authenticate],
    schema: { tags: ['address'], summary: 'Remove endereco', params: idParamSchema, response: { 204: z.void() } },
    handler: controller.remove,
  });
  app.post('/addresses/:id/default', {
    onRequest: [app.authenticate],
    schema: {
      tags: ['address'],
      summary: 'Define endereco padrao',
      params: idParamSchema,
      body: emptyBodySchema,
      response: { 204: z.void() },
    },
    handler: controller.setDefault,
  });
}
