import jwt from 'jsonwebtoken';
import { env } from '@lib/config.js';

export function signToken(userId: string, username: string): string {
  return jwt.sign({ sub: userId, username }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): { sub: string; username: string } {
  return jwt.verify(token, env.JWT_SECRET) as { sub: string; username: string };
}
