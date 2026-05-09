import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@lib/jwt.js';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '缺少身份认证，请重新登录' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    req.username = payload.username;
    next();
  } catch {
    res.status(401).json({ error: '身份认证已过期，请重新登录' });
  }
}
