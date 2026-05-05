import { PrismaClient } from '../../prisma/generated/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  connectionString: process.env.DATABASE_URL!,
});

export const db = new PrismaClient({ adapter });
