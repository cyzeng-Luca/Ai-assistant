import { AsyncLocalStorage } from 'node:async_hooks';
import { v4 as uuid } from 'uuid';
import type { Request, Response, NextFunction } from 'express';
import { logger } from '@lib/logger.js';

const als = new AsyncLocalStorage<string>();

export function getReqId(): string | undefined {
  return als.getStore();
}

export function reqLogger(_req: Request, _res: Response, next: NextFunction) {
  const reqId = uuid().slice(0, 8);
  als.run(reqId, () => {
    const start = Date.now();
    const method = _req.method;
    const url = _req.originalUrl;

    logger.info({ reqId, method, url }, `--> ${method} ${url}`);

    _res.on('finish', () => {
      logger.info(
        { reqId, method, url, status: _res.statusCode, durationMs: Date.now() - start },
        `<-- ${method} ${url} ${String(_res.statusCode)}`,
      );
    });

    next();
  });
}
