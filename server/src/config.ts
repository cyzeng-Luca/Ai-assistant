import { z } from 'zod';

const envSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-pro'),
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_BASE_URL: z.string().url().default('https://api.deepseek.com/anthropic'),
  ANTHROPIC_MODEL: z.string().default('deepseek-v4-pro'),
  DASHSCOPE_API_KEY: z.string().min(1, 'DASHSCOPE_API_KEY is required'),
  EMBEDDING_MODEL: z.string().default('text-embedding-v4'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
  CHUNK_SIZE: z.coerce.number().int().positive().default(500),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(50),
  DATABASE_URL: z.string().min(1),
  CHROMA_URL: z.string().url().default('http://localhost:8000'),
  SERVER_PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
