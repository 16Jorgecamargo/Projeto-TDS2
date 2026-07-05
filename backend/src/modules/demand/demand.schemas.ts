import { z } from 'zod';
import 'zod-openapi/extend';
import { paginationQuerySchema, paginatedResponse } from '../../shared/schemas.js';

export const demandStatusEnum = z
  .enum(['open', 'in_progress', 'closed', 'cancelled'])
  .describe('Estado da demanda')
  .openapi({ example: 'open' });

export const demandImageSchema = z.object({
  url: z
    .string()
    .min(1)
    .describe('URL da imagem (absoluta ou caminho relativo retornado por /uploads/images)')
    .openapi({ example: '/uploads/3f2504e0-4f89-41d3-9a0c-0305e82c3301.jpg' }),
  position: z
    .number()
    .int()
    .min(0)
    .describe('Ordem de exibição')
    .openapi({ example: 0 }),
});

export const createDemandSchema = z
  .object({
    categoryId: z
      .string()
      .uuid()
      .describe('Categoria do serviço')
      .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
    title: z
      .string()
      .min(5)
      .max(120)
      .describe('Título da demanda')
      .openapi({ example: 'Instalação elétrica' }),
    description: z
      .string()
      .min(20)
      .max(4000)
      .describe('Descrição detalhada')
      .openapi({ example: 'Preciso instalar 4 tomadas na sala e cozinha' }),
    budgetMin: z
      .number()
      .nonnegative()
      .optional()
      .describe('Orçamento mínimo previsto')
      .openapi({ example: 100 }),
    budgetMax: z
      .number()
      .nonnegative()
      .optional()
      .describe('Orçamento máximo previsto')
      .openapi({ example: 500 }),
    street: z.string().min(1).max(255).describe('Logradouro').openapi({ example: 'Rua das Flores' }),
    number: z.string().min(1).max(20).describe('Número').openapi({ example: '123' }),
    complement: z
      .string()
      .max(255)
      .nullable()
      .default(null)
      .describe('Complemento')
      .openapi({ example: null }),
    district: z.string().min(1).max(128).describe('Bairro').openapi({ example: 'Centro' }),
    city: z.string().min(1).max(128).describe('Cidade').openapi({ example: 'Porto Alegre' }),
    state: z.string().length(2).describe('UF').openapi({ example: 'RS' }),
    zipCode: z.string().min(8).max(9).describe('CEP').openapi({ example: '90000-000' }),
    tagIds: z
      .array(z.string().uuid())
      .max(10)
      .describe('Tags do serviço')
      .openapi({ example: [] }),
    images: z
      .array(demandImageSchema)
      .max(10)
      .describe('Imagens da demanda')
      .openapi({ example: [] }),
  })
  .refine((v) => v.budgetMin === undefined || v.budgetMax === undefined || v.budgetMax >= v.budgetMin, {
    message: 'budgetMax deve ser >= budgetMin',
    path: ['budgetMax'],
  });

export const updateDemandSchema = z.object({
  title: z
    .string()
    .min(5)
    .max(120)
    .optional()
    .describe('Título da demanda')
    .openapi({ example: 'Instalação elétrica' }),
  description: z
    .string()
    .min(20)
    .max(4000)
    .optional()
    .describe('Descrição detalhada')
    .openapi({ example: 'Descrição atualizada da demanda' }),
  budgetMin: z
    .number()
    .nonnegative()
    .optional()
    .describe('Orçamento mínimo previsto')
    .openapi({ example: 100 }),
  budgetMax: z
    .number()
    .nonnegative()
    .optional()
    .describe('Orçamento máximo previsto')
    .openapi({ example: 500 }),
  street: z.string().min(1).max(255).optional().describe('Logradouro').openapi({ example: 'Rua das Flores' }),
  number: z.string().min(1).max(20).optional().describe('Número').openapi({ example: '123' }),
  complement: z.string().max(255).nullable().optional().describe('Complemento').openapi({ example: null }),
  district: z.string().min(1).max(128).optional().describe('Bairro').openapi({ example: 'Centro' }),
  city: z.string().min(1).max(128).optional().describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().length(2).optional().describe('UF').openapi({ example: 'RS' }),
  zipCode: z.string().min(8).max(9).optional().describe('CEP').openapi({ example: '90000-000' }),
});

export const demandResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID da demanda')
    .openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  clientId: z
    .string()
    .uuid()
    .describe('Cliente autor')
    .openapi({ example: '1a2b1111-1111-1111-1111-111111111111' }),
  categoryId: z
    .string()
    .uuid()
    .describe('Categoria')
    .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  title: z.string().describe('Título').openapi({ example: 'Instalação elétrica' }),
  description: z
    .string()
    .describe('Descrição')
    .openapi({ example: 'Preciso instalar 4 tomadas na sala e cozinha' }),
  budgetMin: z.number().nullable().describe('Orçamento mínimo').openapi({ example: 100 }),
  budgetMax: z.number().nullable().describe('Orçamento máximo').openapi({ example: 500 }),
  status: demandStatusEnum,
  city: z.string().describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z.string().describe('UF').openapi({ example: 'RS' }),
  street: z
    .string()
    .nullable()
    .describe('Logradouro (somente dono ou profissional com contrato aceito)')
    .openapi({ example: null }),
  number: z.string().nullable().describe('Número').openapi({ example: null }),
  complement: z.string().nullable().describe('Complemento').openapi({ example: null }),
  district: z.string().nullable().describe('Bairro').openapi({ example: null }),
  zipCode: z.string().nullable().describe('CEP').openapi({ example: null }),
  images: z.array(demandImageSchema).describe('Imagens').openapi({ example: [] }),
  tagIds: z.array(z.string().uuid()).describe('Tags').openapi({ example: [] }),
  createdAt: z
    .string()
    .datetime()
    .describe('Data de criação')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const demandListQuerySchema = paginationQuerySchema.extend({
  status: demandStatusEnum.optional(),
  categoryId: z
    .string()
    .uuid()
    .optional()
    .describe('Filtro por categoria')
    .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  mine: z.coerce
    .boolean()
    .optional()
    .describe('Somente minhas demandas')
    .openapi({ example: true }),
});

export const demandListResponseSchema = paginatedResponse(demandResponseSchema);

export const inviteProfessionalSchema = z.object({
  professionalId: z
    .string()
    .uuid()
    .describe('Profissional convidado')
    .openapi({ example: '7c4b1111-1111-1111-1111-111111111111' }),
});

export const demandInvitationResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID do convite')
    .openapi({ example: '5d6e1111-1111-1111-1111-111111111111' }),
  demandId: z
    .string()
    .uuid()
    .describe('Demanda')
    .openapi({ example: '3b9c1111-1111-1111-1111-111111111111' }),
  professionalId: z
    .string()
    .uuid()
    .describe('Profissional')
    .openapi({ example: '7c4b1111-1111-1111-1111-111111111111' }),
  status: z
    .enum(['pending', 'accepted', 'declined'])
    .describe('Estado do convite')
    .openapi({ example: 'pending' }),
});

export type CreateDemandInput = z.infer<typeof createDemandSchema>;
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;
export type DemandResponse = z.infer<typeof demandResponseSchema>;
export type DemandListQuery = z.infer<typeof demandListQuerySchema>;
export type InviteProfessionalInput = z.infer<typeof inviteProfessionalSchema>;
export type DemandInvitationResponse = z.infer<typeof demandInvitationResponseSchema>;
