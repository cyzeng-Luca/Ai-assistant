import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedis } from '@lib/redis.js';

function createRedisStore() {
  return new RedisStore({
    sendCommand: (...args: string[]) => {
      const redis = getRedis();
       
      return redis.call(args[0], ...args.slice(1)) as any;
    },
  });
}

const send429 = (_req: any, res: any) => {
  res.status(429).json({ error: '请求过于频繁，请稍后再试' });
};

export const globalLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000,
  limit: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  handler: send429,
});

export const llmLimiter = rateLimit({
  store: createRedisStore(),
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.userId ?? ipKeyGenerator(req.ip ?? ''),
  handler: send429,
});
