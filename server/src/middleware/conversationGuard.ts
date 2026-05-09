import type { Request, Response, NextFunction } from 'express';
import * as conv from '@services/conversation.js';

export async function conversationGuard(req: Request, res: Response, next: NextFunction) {
  const conversation = await conv.getConversationMeta(req.params.id as string);
  if (!conversation) {
    res.status(404).json({ error: '会话不存在' });
    return;
  }
  if (conversation.userId !== req.userId) {
    res.status(403).json({ error: '无权访问此会话' });
    return;
  }
  next();
}
