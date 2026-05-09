import { z } from 'zod';

const envSchema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  DEEPSEEK_BASE_URL: z.string().url().default('https://api.deepseek.com'),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-pro'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_BASE_URL: z.string().url().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  DASHSCOPE_API_KEY: z.string().optional(),
  EMBEDDING_MODEL: z.string().default('text-embedding-v4'),
  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(1024),
  CHUNK_SIZE: z.coerce.number().int().positive().default(500),
  CHUNK_OVERLAP: z.coerce.number().int().nonnegative().default(50),
  DATABASE_URL: z.string().min(1),
  CHROMA_URL: z.string().url().default('http://localhost:8000'),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SERVER_PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BAILIAN_WORKSPACE_ID: z.string().optional(),
  BAILIAN_INDEX_ID: z.string().optional(),
  ALIBABA_CLOUD_ACCESS_KEY_ID: z.string().optional(),
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: z.string().optional(),
  VIKING_API_KEY: z.string().optional(),
  VIKING_SERVICE_RESOURCE_ID: z.string().optional(),
  VIKING_BASE_URL: z.string().url().default('http://api-knowledgebase.mlp.cn-beijing.volces.com'),
});

export const env = envSchema.parse(process.env);
