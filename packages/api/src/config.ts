import { z } from 'zod';

const env = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL requerida'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  OWNER_USERNAME: z.string().default('owner'),
  OWNER_PASSWORD: z.string().default('cambiar-en-primer-login'),
  CURRENCY: z.string().default('credits'),
});

export const config = env.parse(process.env);
export type Config = z.infer<typeof env>;
