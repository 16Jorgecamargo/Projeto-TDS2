import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('E-mail invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Informe o nome'),
    email: z.string().email('E-mail invalido'),
    phone: z.string().min(10, 'Telefone invalido'),
    password: z.string().min(8, 'Minimo 8 caracteres'),
    confirmPassword: z.string().min(8),
    role: z.enum(['client', 'professional']),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('E-mail invalido'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, 'Minimo 8 caracteres'),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas nao conferem',
    path: ['confirmPassword'],
  });

export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
