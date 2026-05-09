import type { Express } from 'express';
import { authRouter } from './auth.js';
import { conversationRouter } from './conversation.js';
import { authMiddleware } from '@middleware/auth.js';
import { globalLimiter } from '@middleware/rateLimit.js';

export function registerRoutes(app: Express) {
  app.use('/api', globalLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/conversations', authMiddleware, conversationRouter);
}
