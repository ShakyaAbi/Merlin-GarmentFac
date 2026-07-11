import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yaml';
import routes from './routes';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { getUploadRoot } from './utils/uploadPaths';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin is not allowed by CORS"));
  },
}));
app.use(express.json({ limit: '1mb' }));
app.use(requestLogger);
if (config.rateLimitEnabled) {
  app.use(rateLimiter);
}

const openapiPath = path.join(process.cwd(), 'openapi', 'openapi.yml');
let openapiDoc: any = { openapi: '3.0.0', info: { title: 'MERLIN Lite API', version: '1.0.0' } };

if (fs.existsSync(openapiPath)) {
  openapiDoc = yaml.parse(fs.readFileSync(openapiPath, 'utf-8'));
}

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.use('/api/v1', routes);
app.use('/uploads', express.static(getUploadRoot(), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  },
}));

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

export default app;
