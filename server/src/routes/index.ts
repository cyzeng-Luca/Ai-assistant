import type { Express } from 'express';
import { authRouter } from './auth.js';
import { conversationRouter } from './conversation.js';
import { userIdMiddleware } from '../middleware/userId.js';

export function registerRoutes(app: Express) {
  app.use('/api/auth', authRouter);
  app.use('/api/conversations', userIdMiddleware, conversationRouter);
}
