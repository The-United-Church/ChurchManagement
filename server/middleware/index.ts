// middleware/index.ts
import express, { Express } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { config } from '../config';
import { Logger } from '../utils/logger';
import path from 'path';


export const setupMiddleware = (app: Express) => {
  const logger = new Logger({ level: 'info' });

  // Build a CORS origin checker that:
  //   - Always allows the exact origins listed in config.corsOrigins
  //   - Also allows any *.localhost:* origin so that custom-domain previews
  //     (e.g. http://slbcyenagoa.localhost:5173) work during local development.
  const LOCALHOST_RE = /^https?:\/\/[^/]+\.localhost(:\d+)?$/i;
  const CUSTOM_DOMAIN_RE = /^https:\/\/[^/]+\.theunitedchurch\.online$/i;
  const corsOriginFn = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin) {
      // Same-origin or non-browser requests (e.g. server-to-server, curl).
      callback(null, true);
      return;
    }
    if (
      (config.corsOrigins as string[]).includes(origin) ||
      LOCALHOST_RE.test(origin) ||
      CUSTOM_DOMAIN_RE.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy: origin '${origin}' is not allowed.`));
    }
  };

  app.use(cors({
    origin: corsOriginFn,
    credentials: false,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Access-Token', 'X-Refresh-Token', 'X-Branch-Id', 'X-Custom-Domain'],
    exposedHeaders: ['Authorization', 'X-Access-Token', 'X-Refresh-Token'],
  }));
  app.use('/public', express.static(path.join(__dirname, '../public')));
  app.use(express.json({ limit: '10mb' }));
  app.use(helmet());
  app.use(morgan('combined'));
  app.use(express.urlencoded({ extended: true }));

  app.use((req, res, next) => {
    logger.info('Request received:', {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
    });
    next();
  });
};