import type { Request, Response, NextFunction } from 'express';

export function userIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string') {
    res.status(401).json({ error: '缺少用户身份，请重新登录' });
    return;
  }
  req.userId = userId;
  next();
}
