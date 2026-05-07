import type { Request, Response, NextFunction } from 'express';
import { db } from '../lib/prisma.js';

export async function userIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: '缺少用户身份，请重新登录' });
    return;
  }

  try {
    const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      res.status(401).json({ error: '用户不存在，请重新登录' });
      return;
    }
  } catch {
    res.status(500).json({ error: '服务暂时不可用' });
    return;
  }

  req.userId = userId;
  next();
}
