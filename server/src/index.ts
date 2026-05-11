import express from 'express';
import cors from 'cors';
import { env } from '@lib/config.js';
import { logger } from '@lib/logger.js';
import { reqLogger } from '@middleware/logger.js';
import { registerRoutes } from '@routes/index.js';

const app = express();

app.set('trust proxy', 1);

app.use(reqLogger);
app.use(cors());
app.use(express.json());

registerRoutes(app);

app.listen(env.SERVER_PORT, () => {
  logger.info({ port: env.SERVER_PORT }, `Server running on port ${String(env.SERVER_PORT)}`);
});
