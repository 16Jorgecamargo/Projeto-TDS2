import { z } from 'zod';

export const roleSchema = z
  .enum(['client', 'professional'])
  .describe('Perfil do usuario no cadastro')
  .openapi({ example: 'client' });

export const registerSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(120)
    .describe('Nome completo')
    .openapi({ example: 'Maria Silva' }),
  email: z
    .string()
    .email()
    .describe('E-mail unico')
    .openapi({ example: 'maria@example.com' }),
  phone: z
    .string()
    .min(10)
    .max(20)
    .describe('Telefone com DDD')
    .openapi({ example: '+5551999998888' }),
  password: z
    .string()
    .min(8)
    .max(72)
    .describe('Senha (min 8 caracteres)')
    .openapi({ example: 'S3nh@Forte' }),
  role: roleSchema,
});

export const loginSchema = z.object({
  email: z.string().email().describe('E-mail').openapi({ example: 'maria@example.com' }),
  password: z.string().min(8).max(72).describe('Senha').openapi({ example: 'S3nh@Forte' }),
});

export const publicUserSchema = z.object({
  id: z.string().uuid().describe('ID do usuario').openapi({ example: '11111111-1111-1111-1111-111111111111' }),
  email: z.string().email().describe('E-mail').openapi({ example: 'maria@example.com' }),
  name: z.string().describe('Nome').openapi({ example: 'Maria Silva' }),
  role: z
    .enum(['client', 'professional', 'admin'])
    .describe('Perfil')
    .openapi({ example: 'client' }),
});

export const authResultSchema = z.object({
  accessToken: z.string().describe('JWT de acesso').openapi({ example: 'eyJ...' }),
  refreshToken: z.string().describe('Refresh token opaco').openapi({ example: 'a1b2...' }),
  user: publicUserSchema,
});

export const refreshSchema = z.object({
  refreshToken: z
    .string()
    .min(1)
    .describe('Refresh token opaco emitido no login')
    .openapi({ example: 'a1b2c3...' }),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email().describe('E-mail da conta').openapi({ example: 'maria@example.com' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1).describe('Token de reset recebido por e-mail').openapi({ example: 'a1b2...' }),
  password: z.string().min(8).max(72).describe('Nova senha').openapi({ example: 'N0v@Senha' }),
});

export const confirmVerificationSchema = z.object({
  token: z.string().min(1).describe('Token de verificacao').openapi({ example: 'a1b2...' }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type AuthResult = z.infer<typeof authResultSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ConfirmVerificationInput = z.infer<typeof confirmVerificationSchema>;
