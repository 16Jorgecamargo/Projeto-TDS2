import { z } from 'zod';
import 'zod-openapi/extend';

export const upsertProfileSchema = z.object({
  headline: z
    .string()
    .min(5)
    .max(255)
    .describe('Titulo profissional')
    .openapi({ example: 'Eletricista residencial' }),
  bio: z
    .string()
    .max(4000)
    .nullable()
    .describe('Biografia')
    .openapi({ example: 'Atuo ha 10 anos com instalacoes.' }),
  yearsExperience: z
    .number()
    .int()
    .min(0)
    .max(80)
    .nullable()
    .describe('Anos de experiencia')
    .openapi({ example: 10 }),
  hourlyRate: z
    .number()
    .nonnegative()
    .nullable()
    .describe('Valor por hora (R$)')
    .openapi({ example: 120 }),
  serviceRadiusKm: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .nullable()
    .describe('Raio de atendimento (km)')
    .openapi({ example: 30 }),
});

export const profileResponseSchema = z.object({
  id: z
    .string()
    .uuid()
    .describe('ID do perfil')
    .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
  userId: z
    .string()
    .uuid()
    .describe('Usuario dono')
    .openapi({ example: '7c4b1111-1111-1111-1111-111111111111' }),
  fullName: z.string().describe('Nome do profissional').openapi({ example: 'Joao Silva' }),
  headline: z.string().describe('Titulo').openapi({ example: 'Eletricista residencial' }),
  bio: z.string().nullable().describe('Biografia').openapi({ example: 'Atuo ha 10 anos.' }),
  yearsExperience: z
    .number()
    .int()
    .nullable()
    .describe('Anos de experiencia')
    .openapi({ example: 10 }),
  hourlyRate: z.number().nullable().describe('Valor por hora').openapi({ example: 120 }),
  serviceRadiusKm: z.number().int().nullable().describe('Raio (km)').openapi({ example: 30 }),
  ratingAverage: z.number().describe('Media de avaliacoes').openapi({ example: 4.8 }),
  ratingCount: z.number().int().describe('Total de avaliacoes').openapi({ example: 42 }),
  isAvailable: z.boolean().describe('Disponivel').openapi({ example: true }),
  verifiedAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Verificado em')
    .openapi({ example: null }),
  createdAt: z
    .string()
    .datetime()
    .describe('Criacao')
    .openapi({ example: '2026-07-01T12:00:00Z' }),
});

export const documentSchema = z.object({
  type: z
    .enum(['rg', 'cpf', 'cnpj', 'proof_of_address', 'certificate'])
    .describe('Tipo de documento')
    .openapi({ example: 'rg' }),
  fileUrl: z
    .string()
    .url()
    .describe('URL do arquivo')
    .openapi({ example: 'https://cdn.app/doc.pdf' }),
});

export const documentResponseSchema = documentSchema.extend({
  id: z
    .string()
    .uuid()
    .describe('ID do documento')
    .openapi({ example: '1a2b1111-1111-1111-1111-111111111111' }),
  status: z
    .enum(['pending', 'approved', 'rejected'])
    .describe('Status da analise')
    .openapi({ example: 'pending' }),
  reviewedAt: z
    .string()
    .datetime()
    .nullable()
    .describe('Analisado em')
    .openapi({ example: null }),
});

export const experienceSchema = z.object({
  title: z.string().min(2).max(255).describe('Cargo/funcao').openapi({ example: 'Eletricista' }),
  company: z
    .string()
    .max(255)
    .nullable()
    .describe('Empresa')
    .openapi({ example: 'Eletrica ABC' }),
  description: z
    .string()
    .max(2000)
    .nullable()
    .describe('Descricao')
    .openapi({ example: 'Manutencao predial' }),
  startDate: z
    .string()
    .date()
    .describe('Inicio (YYYY-MM-DD)')
    .openapi({ example: '2015-01-01' }),
  endDate: z
    .string()
    .date()
    .nullable()
    .describe('Fim (YYYY-MM-DD)')
    .openapi({ example: null }),
  isCurrent: z.boolean().describe('Emprego atual').openapi({ example: true }),
});

export const experienceResponseSchema = experienceSchema.extend({
  id: z
    .string()
    .uuid()
    .describe('ID da experiencia')
    .openapi({ example: '2b3c1111-1111-1111-1111-111111111111' }),
});

export const educationSchema = z.object({
  institution: z
    .string()
    .min(2)
    .max(255)
    .describe('Instituicao')
    .openapi({ example: 'SENAI' }),
  degree: z
    .string()
    .min(2)
    .max(255)
    .describe('Curso/grau')
    .openapi({ example: 'Tecnico em Eletrotecnica' }),
  fieldOfStudy: z
    .string()
    .max(255)
    .nullable()
    .describe('Area de estudo')
    .openapi({ example: 'Eletrotecnica' }),
  startDate: z.string().date().nullable().describe('Inicio').openapi({ example: '2012-02-01' }),
  endDate: z.string().date().nullable().describe('Fim').openapi({ example: '2014-12-01' }),
});

export const educationResponseSchema = educationSchema.extend({
  id: z
    .string()
    .uuid()
    .describe('ID da formacao')
    .openapi({ example: '3c4d1111-1111-1111-1111-111111111111' }),
});

export const certificationSchema = z.object({
  name: z.string().min(2).max(255).describe('Nome do certificado').openapi({ example: 'NR-10' }),
  issuer: z.string().min(2).max(255).describe('Emissor').openapi({ example: 'SENAI' }),
  issuedAt: z
    .string()
    .date()
    .nullable()
    .describe('Emitido em')
    .openapi({ example: '2020-06-01' }),
  expiresAt: z
    .string()
    .date()
    .nullable()
    .describe('Expira em')
    .openapi({ example: '2025-06-01' }),
  credentialUrl: z
    .string()
    .url()
    .nullable()
    .describe('URL da credencial')
    .openapi({ example: null }),
});

export const certificationResponseSchema = certificationSchema.extend({
  id: z
    .string()
    .uuid()
    .describe('ID da certificacao')
    .openapi({ example: '4d5e1111-1111-1111-1111-111111111111' }),
});

export const serviceAreaSchema = z.object({
  city: z.string().min(2).max(128).describe('Cidade').openapi({ example: 'Porto Alegre' }),
  state: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .describe('UF')
    .openapi({ example: 'RS' }),
  radiusKm: z
    .number()
    .int()
    .min(0)
    .max(1000)
    .nullable()
    .describe('Raio (km)')
    .openapi({ example: 20 }),
});

export const serviceAreaResponseSchema = serviceAreaSchema.extend({
  id: z
    .string()
    .uuid()
    .describe('ID da area')
    .openapi({ example: '5e6f1111-1111-1111-1111-111111111111' }),
});

export const setAssociationsSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .max(50)
    .describe('IDs de categorias ou tags')
    .openapi({ example: [] }),
});

export const publicProfileSchema = profileResponseSchema.extend({
  categories: z
    .array(
      z.object({
        id: z
          .string()
          .uuid()
          .describe('ID')
          .openapi({ example: '9f1c1111-1111-1111-1111-111111111111' }),
        name: z.string().describe('Nome').openapi({ example: 'Eletrica' }),
        slug: z.string().describe('Slug').openapi({ example: 'eletrica' }),
      }),
    )
    .describe('Categorias atendidas')
    .openapi({ example: [] }),
  experiences: z
    .array(experienceResponseSchema)
    .describe('Experiencias')
    .openapi({ example: [] }),
  education: z.array(educationResponseSchema).describe('Formacoes').openapi({ example: [] }),
  certifications: z
    .array(certificationResponseSchema)
    .describe('Certificacoes')
    .openapi({ example: [] }),
  serviceAreas: z
    .array(serviceAreaResponseSchema)
    .describe('Areas de atendimento')
    .openapi({ example: [] }),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>;
export type ProfileResponse = z.infer<typeof profileResponseSchema>;
export type PublicProfileResponse = z.infer<typeof publicProfileSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type ExperienceResponse = z.infer<typeof experienceResponseSchema>;
export type EducationInput = z.infer<typeof educationSchema>;
export type EducationResponse = z.infer<typeof educationResponseSchema>;
export type CertificationInput = z.infer<typeof certificationSchema>;
export type CertificationResponse = z.infer<typeof certificationResponseSchema>;
export type ServiceAreaInput = z.infer<typeof serviceAreaSchema>;
export type ServiceAreaResponse = z.infer<typeof serviceAreaResponseSchema>;
export type SetAssociationsInput = z.infer<typeof setAssociationsSchema>;
