import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { corsOptions } from './configs/cors.js';
import { env } from './configs/env.js';
import { apiRouter } from './routes/index.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { ensureSchemaCompatibility } from './prisma/ensureSchema.js';
import { scheduleDraftCleanup } from './jobs/cleanupDrafts.js';

const app = express();

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

(async () => {
  await ensureSchemaCompatibility();
  scheduleDraftCleanup();

  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}`);
  });
})();
