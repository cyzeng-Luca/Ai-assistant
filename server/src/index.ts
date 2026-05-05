import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { env } from './config.js';
import { registerRoutes } from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());

registerRoutes(app);

app.listen(env.SERVER_PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${String(env.SERVER_PORT)}`);
});
