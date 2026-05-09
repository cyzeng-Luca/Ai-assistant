import { db } from '@lib/prisma.js';

export async function loginUser(username: string) {
  return db.user.upsert({
    where: { username },
    update: {},
    create: { username },
  });
}
