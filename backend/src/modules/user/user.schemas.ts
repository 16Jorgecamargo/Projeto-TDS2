import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid().describe('ID').openapi({ example: '11111111-1111-1111-1111-111111111111' }),
  email: z.string().email().describe('E-mail').openapi({ example: 'maria@example.com' }),
  name: z.string().describe('Nome').openapi({ example: 'Maria Silva' }),
  phone: z.string().nullable().describe('Telefone').openapi({ example: '+5551999998888' }),
  role: z.enum(['client', 'professional', 'admin']).describe('Perfil').openapi({ example: 'client' }),
  emailVerifiedAt: z.string().datetime().nullable().describe('Data de verificacao do e-mail').openapi({ example: null }),
  avatarUrl: z.string().url().nullable().describe('URL do avatar').openapi({ example: null }),
});

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(120).describe('Nome').openapi({ example: 'Maria S.' }),
    phone: z.string().min(10).max(20).describe('Telefone').openapi({ example: '+5551999997777' }),
    avatarUrl: z.string().url().describe('URL do avatar').openapi({ example: 'https://cdn/x.png' }),
  })
  .partial();

export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
