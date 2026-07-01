import { z } from 'zod';

export const profileFormSchema = z.object({
  headline: z.string().min(5, 'Minimo 5 caracteres').max(255),
  bio: z.string().max(4000).nullable(),
  yearsExperience: z.number().int().min(0).max(80).nullable(),
  hourlyRate: z.number().nonnegative().nullable(),
  serviceRadiusKm: z.number().int().min(0).max(1000).nullable(),
});

export type ProfileForm = z.infer<typeof profileFormSchema>;
