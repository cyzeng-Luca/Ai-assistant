import { Router } from 'express';
import { loginUser } from '../services/auth.js';

export const authRouter: Router = Router();

authRouter.post('/login', async (req, res) => {
  const { username } = req.body as { username?: string };
  if (!username?.trim()) {
    res.status(400).json({ error: '用户名不能为空' });
    return;
  }

  const user = await loginUser(username);
  res.json({ id: user.id, username: user.username, createdAt: user.createdAt });
});
